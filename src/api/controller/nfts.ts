import { FastifyReply } from "fastify";
import { logger } from "../../logger";
import {
	EventTracker,
	ListingQueryObject,
	Request,
	Timeline,
	TokenQueryObject,
	NftDetails,
	WalletQueryObject,
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
	let date = "N/A",
		type = "N/A",
		closeDate = "N/A",
		seller = "N/A",
		tokenIds = [],
		status,
		assetId,
		sellPrice,
		buyPrice;
	const listingStarted = listingData.find(
		(nft) => nft.eventType === "LISTING_STARTED"
	);
	if (listingStarted) {
		const eventDetails = JSON.parse(listingStarted.data);
		date = eventDetails.date;
		type = eventDetails.type;
		closeDate = eventDetails.close;
		seller = eventDetails.seller;
		tokenIds = eventDetails.tokenIds;
		status = listingStarted.eventType;
		assetId = eventDetails.assetId;
		sellPrice = eventDetails.sellPrice;
	}
	const listingClosed = listingData.find(
		(nft) =>
			nft.eventType === "LISTING_CANCELED" || nft.eventType === "LISTING_CLOSED"
	);
	if (listingClosed) {
		const eventDetails = JSON.parse(listingClosed.data);
		type = eventDetails.type;
		status = listingClosed.eventType;
		tokenIds = eventDetails.tokenIds;
		if (status === "LISTING_CLOSED") {
			buyPrice = eventDetails.price;
		}
	}
	// get all bid
	const bid = listingData
		.filter((list) => list.eventType === "NFT_BID")
		.map((listing) => {
			const eventDetails = JSON.parse(listing.data);
			const address = eventDetails.currentBidSetter;
			const amount = eventDetails.currentBid;
			const date = eventDetails.date;
			const hash = eventDetails.txHash;
			return { address, amount, date, hash };
		});
	const response = {
		listingId,
		date,
		closeDate,
		type,
		status,
		seller,
		assetId,
		tokenIds,
		bid,
		sellPrice,
		buyPrice,
	};
	return reply.status(200).send(response);
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
