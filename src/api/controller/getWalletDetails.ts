import {
	EventTracker,
	NftDetails,
	Request,
	Timeline,
	WalletQueryObject,
} from "@/src/types";
import { FastifyReply } from "fastify";
import { logger } from "@/src/logger";

export default async function getWalletDetails(
	request: Request,
	reply: FastifyReply
): Promise<FastifyReply> {
	try {
		const EventTracker = this.mongo.db.collection("EventTracker");

		let data = await EventTracker.find({
			signer: (request.params as WalletQueryObject).address,
			streamType: 0,
		}).sort({ version: "asc" });
		data = (await data.toArray()) as EventTracker[];

		if (!data || data.length === 0)
			return reply.status(500).send({ error: "Wallet has no NFTs!" });

		const nftMap = [] as NftDetails[];

		data.forEach((walletInfo) => {
			const { streamId: tokenIdRaw } = walletInfo;
			const {
				date: timestamp,
				listingId,
				metadataUri,
				owner,
				txHash,
			} = JSON.parse(walletInfo.data);

			const tokenIdArray = tokenIdRaw
				.slice(tokenIdRaw.indexOf("[") + 1, tokenIdRaw.indexOf("]"))
				.split(",");
			const tokenId = `${tokenIdArray[0]}_${tokenIdArray[1]}_${tokenIdArray[2]}`;

			const timeline: Timeline = {
				type: walletInfo.eventType,
				txHash,
				timestamp,
				listingId,
			};

			if (tokenId === nftMap[nftMap.length - 1]?.tokenId) {
				return nftMap[nftMap.length - 1].timeline.push(timeline);
			}

			nftMap.push({
				tokenId,
				metadataUri: metadataUri?.IpfsShared ?? metadataUri,
				owner,
				timeline: [timeline],
			} as NftDetails);
		});

		return reply.status(200).send(nftMap);
	} catch (e) {
		logger.error("err:", e);
		return reply.status(404).send({ error: e.message });
	}
}
