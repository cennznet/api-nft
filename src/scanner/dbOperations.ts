import { config } from "dotenv";
import { logger } from "../logger";
const { EventTracker, LastBlockScan } = require("../mongo/models");
config();

export async function trackEventData(
	streamId,
	type,
	eventType,
	version,
	data,
	signer
) {
	try {
		logger.info(
			`saving event for streamId ${streamId} for signer ${signer} with data ${data} in db`
		);
		const eventTracker = new EventTracker({
			streamId: streamId,
			streamType: type,
			version: version, // blocknumber
			data: data,
			signer: signer,
			eventType: eventType,
		});
		await eventTracker.save();
	} catch (e) {
		logger.error(
			`saving event for streamId ${streamId} for signer ${signer} with data ${data} in db failed::${e}`
		);
	}
}

export async function trackEventDataSet(tokens) {
	try {
		const data = tokens.map((token) => {
			return {
				streamId: token[0].toString(),
				streamType: token[1],
				version: token[2],
				data: token[3],
				signer: token[4],
				eventType: token[5],
			};
		});
		logger.info(
			`saving multiple event data for  ${JSON.stringify(data)} in db`
		);
		await EventTracker.insertMany(data);
	} catch (e) {
		logger.error(`saving event data in db failed::${e}`);
	}
}

export async function updateProcessedBlockInDB(blockNumber) {
	const filter = {};
	const update = { processedBlock: blockNumber };
	const options = { upsert: true, new: true, setDefaultsOnInsert: true }; // create new if record does not exist, else update
	await LastBlockScan.updateOne(filter, update, options);
	logger.info(`Updated the last processed block in db..${blockNumber}`);
}

export async function updateFinalizedBlock(finalizedBlock) {
	const filter = {};
	const update = { finalizedBlock: finalizedBlock };
	const options = { upsert: true, new: true, setDefaultsOnInsert: true }; // create new if record does not exist, else update
	await LastBlockScan.updateOne(filter, update, options);
	logger.info(`Updated the last finalized block in db..${finalizedBlock}`);
}
