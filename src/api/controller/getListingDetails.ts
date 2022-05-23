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

		let listingData = (await eventTracker
			.find({ streamId: listingId })
			.sort({ version: "asc" })
			.toArray()) as EventTracker[];

		if (listingData?.length === 0)
			return reply.status(404).send({ error: "Not Found" });

		let tokenIds = [],
			listingType,
			assetId,
			assetSymbol,
			listedPrice;

		const timeline: ListingTimeline[] = [];

		const listingStarted = listingData.find(
			(nft) => nft.eventType === "LISTING_STARTED"
		);
		if (listingStarted && listingStarted.data) {
			const eventDetails = JSON.parse(listingStarted.data);

			tokenIds = eventDetails.tokenIds;
			assetId = Number(eventDetails.assetId);
			[listedPrice, assetSymbol] = eventDetails.sellPrice.split(" ");
			listingType = eventDetails.type;

			const { txHash, date: timestamp } = eventDetails;

			timeline.push({
				type: listingStarted.eventType,
				txHash,
				timestamp,
				listedPrice: Number(listedPrice),
			} as ListingTimeline);
		}

		// get all bids
		listingData
			.filter((list) => list.eventType === "NFT_BID" && list.data)
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
		if (
			listingClosed &&
			(listingClosed.eventType === "LISTING_CANCELED" ||
				listingClosed.eventType === "LISTING_CLOSED") &&
			listingClosed.data
		) {
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
			assetSymbol,
		} as ListingDetails);
	} catch (e) {
		logger.error("err:", e);
		return reply.status(500).send({ error: e.message });
	}
}
