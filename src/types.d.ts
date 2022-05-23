import { FastifyRequest } from "fastify";
import {Call} from "@polkadot/types/interfaces";
import {GenericExtrinsic} from "@polkadot/types";

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

export interface ExtrinsicDetails {
	call: Call;
	extIndex: number;
	allEvents: Codec;
	block: SignedBlock;
	api: Api;
	e: GenericExtrinsic;
	params: [];
	blockNumber: number;
	blockHash: BlockHash;
	batchIndex?: number;
}
