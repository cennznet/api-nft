import { BlockHash, EventRecord } from "@polkadot/types/interfaces";
import { processAuctionSoldEvent } from "./utils/trackTokenAuction";

import { Api } from "@cennznet/api";
import { config } from "dotenv";
import { logger } from "../logger";
import { Vec } from "@polkadot/types-codec";
import mongoose from "mongoose";
import { SignedBlock } from "@polkadot/types/interfaces/runtime";
import { fetchNFTBlockFromUncoverForRange } from "./utils/fetchNFTBlockNumberForRange";
import { updateProcessedBlockInDB } from "./dbOperations";
import { processNFTExtrinsicData } from "./utils/processNFTExtrinsic";
import {
	fetchSupportedAssets,
	filterExtrinsicEvents,
	getExtrinsicParams,
	getTimestamp,
	isExtrinsicSuccessful,
} from "./utils/commonUtils";
const { LastBlockScan } = require("../mongo/models");
config();

const range = (start, stop) =>
	Array.from({ length: stop - start + 1 }, (_, i) => start + i);

async function main() {
	const api = await Api.create({ provider: process.env.PROVIDER });
	await mongoose.connect(process.env.MONGO_URI);
	await fetchSupportedAssets(api);
	let fetchOldData = process.env.USE_UNCOVER;
	let globalBlockNumbers = [];
	while (true) {
		if (fetchOldData) {
			const startDate = process.env.START_DATE;
			const endDate = process.env.END_DATE;
			globalBlockNumbers = await fetchNFTBlockFromUncoverForRange(startDate, endDate);
			fetchOldData = null;
		} else {
			const blockScanned = await LastBlockScan.findOne({});
			if (blockScanned) {
				const { processedBlock, finalizedBlock } = blockScanned;
				globalBlockNumbers = range(
					parseInt(processedBlock),
					parseInt(finalizedBlock)
				);
			}
		}

		logger.info(`Global block number: ${globalBlockNumbers}`);

		const chunkSize = 100;
		for (let i = 0; i < globalBlockNumbers.length; i += chunkSize) {
			const chunk = globalBlockNumbers.slice(i, i + chunkSize);

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
						extrinsics.map(async (e, index) => {
							const params = getExtrinsicParams(e);
							let call;
							try {
								call = apiAt.findCall(e.callIndex);
							} catch (error) {
								logger.error("apiAt find call failed");
								logger.error(error);
							}

							if (call.section === "nft") {
								const extrinsicRelatedEvents = filterExtrinsicEvents(
									index,
									allEvents
								);
								if (isExtrinsicSuccessful(index, extrinsicRelatedEvents)) {
									const blockTimestamp = getTimestamp(block.block, api);
									const txHash = e.hash.toString();
									const owner = e.signer.toString();
									const { method } = call;
									await processNFTExtrinsicData({
										method,
										params,
										events: extrinsicRelatedEvents,
										txHash,
										blockTimestamp,
										api,
										owner,
										blockNumber,
										blockHash,
									});
								}
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
			await sleep(500);
		}
	}
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => logger.error(err));
