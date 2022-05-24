import {
	EventTracker,
	NftDetails,
	Request,
	Timeline,
	TokenQueryObject,
} from "@/src/types";
import { FastifyReply } from "fastify";
import { logger } from "@/src/logger";

export default async function getTokenDetails(
	request: Request,
	reply: FastifyReply
): Promise<FastifyReply> {
	try {
		const eventTracker = this.mongo.db.collection("EventTracker");

		const { tokenId: tokenIdRaw } = request.params as TokenQueryObject;
		const tokenIdArray = tokenIdRaw.split("_");
		const tokenId = `[${tokenIdArray[0]},${tokenIdArray[1]},${tokenIdArray[2]}]`;

		const nftData = (await eventTracker
			.find({ streamId: tokenId })
			.sort({ version: "asc" })
			.toArray()) as EventTracker[];

		if (nftData?.length === 0)
			return reply.status(404).send({ error: "Not Found" });

		const createdDetails = nftData.find(
			(nft) => nft.eventType === "NFT_CREATED"
		);
		const { metadataUri } =
			createdDetails && createdDetails.data
				? JSON.parse(createdDetails.data)
				: "N/A";

		const lastEvent = nftData.slice(-1)[0];
		const owner =
			lastEvent && lastEvent.data
				? JSON.parse(lastEvent.data)?.owner
				: lastEvent.signer;

		const timeline: Timeline[] = nftData
			.filter(
				(nft) =>
					nft.eventType !== "LISTING_CLOSED" &&
					nft.eventType !== "LISTING_CANCELED" &&
					nft.data !== undefined
			)
			.map((nft) => {
				const { date: timestamp, listingId, txHash } = JSON.parse(nft.data);
				return {
					type:
						nft.eventType === "LISTING_STARTED" ? "NFT_LISTED" : nft.eventType,
					txHash,
					timestamp,
					listingId,
				};
			});

		return reply.status(200).send({
			tokenId: tokenIdRaw,
			metadataUri,
			owner,
			timeline,
		} as NftDetails);
	} catch (e) {
		logger.error("err:", e);
		return reply.status(500).send({ error: e.message });
	}
}
