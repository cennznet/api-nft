import { logger } from "../logger";

const { Api } = require("@cennznet/api");
import { updateFinalizedBlock } from "./dbOperations";
import mongoose from "mongoose";

async function main(networkName) {
	try {
		await mongoose.connect(process.env.MONGO_URI);
		const api = await Api.create({ network: "azalea" });
		await api.rpc.chain.subscribeFinalizedHeads(async (head) => {
			const finalizedBlockAt = head.number.toString();
			logger.info(`finalizedBlockAt::${finalizedBlockAt}`);
			await updateFinalizedBlock(finalizedBlockAt);
		});
	} catch (e) {
		logger.error(e);
	}
}

const networkName = process.env.NETWORK;
main(networkName).catch((err) => logger.error(err));
