import { FastifyReply } from "fastify";
import { logger } from "../../logger";
import getTokenIdArray from "../utils/getTokenIdArray";
import {
	EventTracker,
	ListingQueryObject,
	Request,
	Timeline,
	TokenQueryObject,
	NftDetails,
	WalletQueryObject,
	ListingTimeline,
	ListingDetails,
} from "@/src/types";

export async function getTokenDetails(
	request: Request,
	reply: FastifyReply
): Promise<FastifyReply> {
	try {
		const eventTracker = this.mongo.db.collection("EventTracker");

		const { tokenId: tokenIdRaw } = request.params as TokenQueryObject;
		const tokenIdArray = tokenIdRaw.split("_");
		const tokenId = `[${tokenIdArray[0]},${tokenIdArray[1]},${tokenIdArray[2]}]`;

		let nftData = await eventTracker
			.find({ streamId: tokenId })
			.sort({ version: "asc" });
		nftData = await nftData.toArray();

		if (!nftData || nftData.length === 0)
			return reply.status(500).send({ error: "Token Not found!" });

		const createdDetails = nftData.find(
			(nft) => nft.eventType === "NFT_CREATED"
		);
		const { metadataUri } = JSON.parse(createdDetails.data);

		const lastEvent = nftData.slice(-1)[0];
		const { owner } = JSON.parse(lastEvent.data);

		const timeline: Timeline[] = nftData.map((nft) => {
			const { date: timestamp, listingId, txHash } = JSON.parse(nft.data);
			return {
				type: nft.eventType,
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
		return reply.status(404).send();
	}
}

export async function getListingDetails(
	request: Request,
	reply: FastifyReply
): Promise<FastifyReply> {
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
			nft.eventType === "LISTING_CANCELED" || nft.eventType === "LISTING_CLOSED"
	);
	if (listingClosed) {
		if (listingClosed.eventType === "LISTING_CLOSED") {
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
	}

	return reply.status(200).send({
		listingId: Number(listingId),
		listingType,
		tokenIds: getTokenIdArray(tokenIds),
		timeline,
		assetId,
		assetSymbol: sellPrice.split(" ")[1],
	} as ListingDetails);
}

export async function getWalletDetails(
	request: Request,
	reply: FastifyReply
): Promise<FastifyReply> {
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
}
