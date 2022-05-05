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
		// check if event exist in db, before adding it
		const existingEvent = await EventTracker.exists({ streamId: streamId,
			streamType: type,
			version: version });
		if (!existingEvent) {
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
		}
	} catch (e) {
		logger.error(
			`saving event for streamId ${streamId} for signer ${signer} with data ${data} in db failed::${e}`
		);
	}
}

export async function trackEventDataSet(tokens) {
	try {
		const streamIds = [];
		const streamTypes = [];
		const versions = [];
		const data = tokens.map((token) => {
			streamIds.push(token[0].toString());
			streamTypes.push(token[1]);
			versions.push(token[2]);
			return {
				streamId: token[0].toString(),
				streamType: token[1],
				version: token[2],
				data: token[3],
				signer: token[4],
				eventType: token[5],
			};
		});

		// check if event exist in db, before adding it
		const checkDataExist = await EventTracker.find({
			streamId: { $in: streamIds },
			streamType: { $in: streamTypes },
			version: { $in: versions }
		});
		if (!checkDataExist) {
			logger.info(
				`saving multiple event data for  ${JSON.stringify(data)} in db`
			);
			await EventTracker.insertMany(data);
		}
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
