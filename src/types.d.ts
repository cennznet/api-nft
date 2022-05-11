import { FastifyRequest } from "fastify";

export interface TokenQueryObject {
	tokenId: string;
}

export interface ListingQueryObject {
	listingId: string;
}

export interface WalletQueryObject {
	address: string;
}

export interface EventTracker {
	streamId: string;
	data: string;
	eventType: string;
}

export type Request = FastifyRequest<{
	Params: TokenQueryObject | ListingQueryObject | WalletQueryObject;
}>;

export interface Timeline {
	type: string;
	txHash: string;
	timestamp: string;
	listingId?: number;
}

export interface NftDetails {
	tokenId: string;
	metadataUri: string;
	owner: string;
	timeline: Timeline[];
}

export interface ListingTimeline extends Timeline {
	type: string;
	listedPrice?: number;
	soldPrice?: string;
	bidPrice?: string;
}

export interface ListingDetails {
	listingId: number;
	listingType: string;
	tokenIds: string[];
	timeline: ListingTimeline[];
	assetId: number;
	assetSymbol: string;
}
