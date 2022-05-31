import { BlockHash, EventRecord } from "@polkadot/types/interfaces";
import { processAuctionSoldEvent } from "@/src/scanner/utils/trackTokenAuction";

import { Api, WsProvider } from "@cennznet/api";
import { config } from "dotenv";
import { logger } from "@/src/logger";
import { Vec } from "@polkadot/types-codec";
import mongoose from "mongoose";
import { SignedBlock } from "@polkadot/types/interfaces/runtime";
import { fetchNFTBlockFromUncoverForRange } from "./utils/fetchNFTBlockNumberForRange";
import { updateProcessedBlockInDB } from "@/src/scanner/dbOperations";
import {
	fetchNFTsFromExtrinsic,
	processBatchCall,
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
	// const autoConnectMs = TIMEOUT_MS;
	const provider = new WsProvider(process.env.PROVIDER);
	const api = await Api.create({
		provider,
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
			: 5;
		for (let i = 0; i < globalBlockNumbers.length; i += chunkSize) {
			const chunk = globalBlockNumbers.slice(i, i + chunkSize);
			logger.info(`Processing chunk ${chunk}`);
			let apiAt;
			await Promise.all(
				chunk.map(async (blockNumber) => {
					logger.info(`HEALTH CHECK => OK`);
					logger.info(`At blocknumber: ${blockNumber}`);
					try {
						const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
						console.log("blockHash:", blockHash.toString());
						const block: SignedBlock = (await api.rpc.chain.getBlock(
							blockHash as unknown as BlockHash
						)) as unknown as SignedBlock;
						const extrinsics = block.block.extrinsics;
						const allEvents = await api.query.system.events.at(
							blockHash as unknown as BlockHash
						);
						apiAt = await api.at(blockHash as unknown as BlockHash);

						await Promise.all(
							extrinsics.map(async (extrinsic, extrinsicIndex) => {
								const params = getExtrinsicParams(extrinsic);
								let call;
								call = apiAt.findCall(extrinsic.callIndex);
								const isBatchTx =
									call.section === "utility" &&
									(call.method === "batch" || call.method === "batchAll");
								if (isBatchTx) {
									await processBatchCall(
										params,
										apiAt,
										extrinsicIndex,
										allEvents,
										block,
										api,
										extrinsic,
										blockNumber,
										blockHash
									);
								} else {
									await fetchNFTsFromExtrinsic({
										call,
										extIndex: extrinsicIndex,
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
					} catch (e) {
						console.log(`Error ${e} at block ${blockNumber}`);
						if (e.message.includes("No response received from RPC endpoint")) {
							process.exit(1);
						}
						throw e;
					}
				})
			);
			logger.info(`Completed chunk ${chunk}`);
			const timeMs = process.env.SLEEP ? parseInt(process.env.SLEEP) : 5000;
			await sleep(timeMs);
			logger.info(`looping thro next chunk`);
		}
	}
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
	if (err.message.includes("No response received from RPC endpoint")) {
		process.exit(1);
	}
	logger.error(err);
});
