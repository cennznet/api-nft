import { BlockHash, EventRecord } from "@polkadot/types/interfaces";
import { processAuctionSoldEvent } from "@/src/scanner/utils/trackTokenAuction";

import { Api } from "@cennznet/api";
import { config } from "dotenv";
import { logger } from "@/src/logger";
import { Vec } from "@polkadot/types-codec";
import mongoose from "mongoose";
import { SignedBlock } from "@polkadot/types/interfaces/runtime";
import { fetchNFTBlockFromUncoverForRange } from "./utils/fetchNFTBlockNumberForRange";
import { updateProcessedBlockInDB } from "@/src/scanner/dbOperations";
import {
	fetchNFTsFromExtrinsic,
	processNFTExtrinsicData,
} from "@/src/scanner/utils/processNFTExtrinsic";
import {
	fetchSupportedAssets,
	getExtrinsicParams,
	getTimestamp,
} from "@/src/scanner/utils/commonUtils";
const { LastBlockScan } = require("@/src/mongo/models");
config();

const range = (start, stop) =>
	Array.from({ length: stop - start + 1 }, (_, i) => start + i);

async function main() {
	const TIMEOUT_MS = 120 * 1000;
	const api = await Api.create({
		provider: process.env.PROVIDER,
		timeout: TIMEOUT_MS,
	});
	await mongoose.connect(process.env.MONGO_URI);
	await fetchSupportedAssets(api);
	let fetchOldData = process.env.USE_UNCOVER;
	let globalBlockNumbers = [];
	while (true) {
		if (fetchOldData) {
			const startDate = process.env.START_DATE;
			const endDate = process.env.END_DATE;
			globalBlockNumbers = await fetchNFTBlockFromUncoverForRange(
				startDate,
				endDate
			);
			fetchOldData = null;
		} else {
			const blockScanned = await LastBlockScan.findOne({});
			logger.info(`blockScanned: ${blockScanned}`);
			if (blockScanned) {
				const { processedBlock, finalizedBlock } = blockScanned;
				globalBlockNumbers = range(
					parseInt(processedBlock),
					parseInt(finalizedBlock)
				);
			}
		}

		logger.info(`Global block number: ${globalBlockNumbers}`);

		const chunkSize = process.env.CHUNK_SIZE
			? parseInt(process.env.CHUNK_SIZE)
			: 20;
		for (let i = 0; i < globalBlockNumbers.length; i += chunkSize) {
			const chunk = globalBlockNumbers.slice(i, i + chunkSize);
			logger.info(`Processing chunk ${chunk}`);
			let apiAt;
			await Promise.all(
				chunk.map(async (blockNumber) => {
					logger.info(`HEALTH CHECK => OK`);
					logger.info(`At blocknumber: ${blockNumber}`);
					const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
					console.log("blockHash:", blockHash.toString());
					const block: SignedBlock = (await api.rpc.chain.getBlock(
						blockHash as unknown as BlockHash
					)) as unknown as SignedBlock;
					const allEvents = await api.query.system.events.at(
						blockHash as unknown as BlockHash
					);
					const extrinsics = block.block.extrinsics;
					apiAt = await api.at(blockHash as unknown as BlockHash);

					await Promise.all(
						extrinsics.map(async (extrinsic, index) => {
							const params = getExtrinsicParams(extrinsic);
							let call;
							try {
								call = apiAt.findCall(extrinsic.callIndex);
							} catch (error) {
								logger.error("apiAt find call failed");
								logger.error(error);
							}
							const isBatchTx =
								call.section === "utility" &&
								(call.method === "batch" || call.method === "batchAll");
							if (isBatchTx) {
								const batchExtrinsics = params[0];
								if (batchExtrinsics.type === "Vec<Call>") {
									let batchIndex = -1;
									await Promise.all(
										// Process all extrinsics in batch call one by one
										batchExtrinsics.value.map(async (ext) => {
											const call = apiAt.findCall(ext.callIndex);
											if (call.section === "nft") {
												batchIndex++;
												const callJSON = call.toJSON();
												const batchExtParam = callJSON.args.map((arg) => {
													return {
														type: arg.type,
														name: arg.name,
														value: ext.args[convertToSnakeCase(arg.name)],
													};
												});
												await fetchNFTsFromExtrinsic({
													call,
													extIndex: index,
													allEvents,
													block,
													api,
													extrinsic,
													params: batchExtParam,
													blockNumber,
													blockHash,
													batchIndex,
												});
											}
										})
									);
								}
							} else {
								await fetchNFTsFromExtrinsic({
									call,
									extIndex: index,
									allEvents,
									block,
									api,
									extrinsic,
									params,
									blockNumber,
									blockHash,
								});
							}
						})
					);
					const auctionSoldEvent = (
						allEvents as unknown as Vec<EventRecord>
					).find(
						({ event }) =>
							event.section === "nft" && event.method === "AuctionSold"
					);
					if (auctionSoldEvent) {
						const blockTimestamp = getTimestamp(block.block, api);
						await processAuctionSoldEvent(
							auctionSoldEvent.event,
							blockTimestamp,
							blockNumber,
							blockHash.toString(),
							api
						);
					}
					await updateProcessedBlockInDB(blockNumber);
				})
			);
			logger.info(`Completed chunk ${chunk}`);
			const timeMs = process.env.SLEEP ? parseInt(process.env.SLEEP) : 5000;
			await sleep(timeMs);
			logger.info(`looping thro next chunk`);
		}
	}
}

function convertToSnakeCase(input) {
	return input
		.split(/(?=[A-Z])/)
		.join("_")
		.toLowerCase();
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => logger.error(err));
