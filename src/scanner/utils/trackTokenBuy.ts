// track buy data
import { accuracyFormat } from "@/src/scanner/formatBalance";
import {
	extractTokenListingData,
	Params,
} from "@/src/scanner/utils/commonUtils";
import { Api } from "@cennznet/api";
import { Hash, Listing, Option } from "@cennznet/types";
import { logger } from "@/src/logger";

export async function trackBuyData(
	params: Params,
	blockHash: string,
	api: Api,
	blockNumber: number,
	txHash: string,
	date: Date,
	owner: string
) {
	try {
		const listingId = params[0].value;
		const previousBlock = blockNumber - 1;
		const blockHashBeforeBuy = await api.rpc.chain.getBlockHash(previousBlock);
		const listingDetailInfo = (await api.query.nft.listings.at(
			blockHashBeforeBuy as unknown as Hash,
			listingId
		)) as Option<Listing>;
		const listingDetail = listingDetailInfo.unwrapOrDefault();
		const details = listingDetail.asFixedPrice.toJSON();
		const fixedPrice = accuracyFormat(details.fixedPrice, details.paymentAsset);
		const dataInserts = [];
		const eventType = "LISTING_CLOSED";
		const listingData = {
			type: "Fixed",
			assetId: details.paymentAsset,
			price: fixedPrice,
			txHash: txHash,
			date: date,
			seller: details.seller.toString(),
			buyer: details.buyer ? details.buyer.toString() : owner,
			tokenIds: JSON.stringify(details.tokens),
		};
		dataInserts.push([
			listingId,
			1, // type for listing
			blockNumber,
			JSON.stringify(listingData),
			owner,
			eventType,
		]);
		const tokenData = {
			type: "Fixed",
			txHash: txHash,
			listingId: listingId,
			amount: fixedPrice,
			assetId: details.paymentAsset,
			date: date,
			owner: owner,
		};
		await extractTokenListingData(
			details.tokens,
			dataInserts,
			blockNumber,
			tokenData,
			owner,
			eventType
		);
		logger.info("Buy done");
	} catch (e) {
		logger.error(
			`Error tracking buy listing data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}
