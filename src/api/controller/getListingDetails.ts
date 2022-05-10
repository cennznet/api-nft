import {
	EventTracker,
	ListingDetails,
	ListingQueryObject,
	ListingTimeline,
	Request,
} from "@/src/types";
import { FastifyReply } from "fastify";
import getTokenIdArray from "@/src/api/utils/getTokenIdArray";
import { logger } from "@/src/logger";

export default async function getListingDetails(
	request: Request,
	reply: FastifyReply
): Promise<FastifyReply> {
	try {
		const eventTracker = this.mongo.db.collection("EventTracker");
		const listingId = (request.params as ListingQueryObject).listingId;

		let data = await eventTracker
			.find({ streamId: listingId })
			.sort({ version: "asc" });
		data = await data.toArray();

		if (!data || data.length === 0)
			return reply.status(500).send({ error: "Listing Not found!" });

		const listingData = data as EventTracker[];
		let tokenIds = [],
			listingType,
			assetId,
			sellPrice;

		const timeline: ListingTimeline[] = [];

		const listingStarted = listingData.find(
			(nft) => nft.eventType === "LISTING_STARTED"
		);
		if (listingStarted) {
			const eventDetails = JSON.parse(listingStarted.data);

			tokenIds = eventDetails.tokenIds;
			assetId = eventDetails.assetId;
			sellPrice = eventDetails.sellPrice;
			listingType = eventDetails.type;

			const { txHash, date: timestamp, sellPrice: listedPrice } = eventDetails;

			timeline.push({
				type: listingStarted.eventType,
				txHash,
				timestamp,
				listedPrice: Number(listedPrice.split(" ")[0]),
			} as ListingTimeline);
		}

		// get all bids
		listingData
			.filter((list) => list.eventType === "NFT_BID")
			.forEach((listing) => {
				const {
					txHash,
					date: timestamp,
					currentBid: bidPrice,
				} = JSON.parse(listing.data);

				timeline.push({
					type: listing.eventType,
					txHash,
					timestamp,
					bidPrice,
				} as ListingTimeline);
			});

		const listingClosed = listingData.find(
			(nft) =>
				nft.eventType === "LISTING_CANCELED" ||
				nft.eventType === "LISTING_CLOSED"
		);
		if (listingClosed?.eventType === "LISTING_CLOSED") {
			const {
				txHash,
				date: timestamp,
				price: soldPrice,
			} = JSON.parse(listingClosed.data);

			timeline.push({
				type: listingClosed.eventType,
				txHash,
				timestamp,
				soldPrice,
			} as ListingTimeline);
		}

		return reply.status(200).send({
			listingId: Number(listingId),
			listingType,
			tokenIds: getTokenIdArray(tokenIds),
			timeline,
			assetId,
			assetSymbol: sellPrice.split(" ")[1],
		} as ListingDetails);
	} catch (e) {
		logger.error("err:", e);
		return reply.status(404).send({ error: e.message });
	}
}
