import { logger } from "../../logger";
import {
	trackAdditionalTokenData,
	trackTokenSeriesData,
	trackUniqueMintData,
} from "./trackTokenCreation";
import { trackSeriesNameData } from "./trackTokenName";
import {
	trackTransferBatchData,
	trackTransferData,
} from "./trackTokenTransfers";
import { trackBurnBatchData, trackBurnData } from "./trackTokenBurn";
import { trackSellBundleData, trackSellData } from "./trackTokenSell";
import { trackBuyData } from "./trackTokenBuy";
import { trackAuctionBundleData, trackAuctionData } from "./trackTokenAuction";
import { trackBidData } from "./trackBidData";
import { trackCancelSaleData } from "./trackSaleCancel";

export async function processNFTExtrinsicData({
	method,
	params,
	events,
	txHash,
	blockTimestamp,
	api,
	blockNumber,
	owner,
	blockHash,
}) {
	logger.info(`Event triggered::${method}`);
	const date = blockTimestamp;
	const findNFTEvent = events.find(({ event }) => event.section === "nft");
	const eventData = findNFTEvent ? findNFTEvent.event.data.toJSON() : null;
	switch (method) {
		case "mintUnique": {
			if (!eventData) {
				logger.error(
					`Something wrong, no event found for mintUnique extrinsic at blockNumber ${blockNumber}`
				);
				break;
			}

			await trackUniqueMintData(
				eventData,
				api,
				params,
				date,
				owner,
				txHash,
				blockNumber
			);
			break;
		}
		case "mintSeries": {
			if (!eventData) {
				logger.error(
					`Something wrong, no event found for mint series extrinsic at blockNumber ${blockNumber}`
				);
				break;
			}

			await trackTokenSeriesData(
				eventData,
				api,
				params,
				date,
				owner,
				txHash,
				blockNumber
			);
			break;
		}
		case "mintAdditional": {
			if (!eventData) {
				logger.error(
					`Something wrong, no event found for mintAdditional extrinsic at blockNumber ${blockNumber}`
				);
				break;
			}

			await trackAdditionalTokenData(
				params,
				eventData,
				api,
				blockHash,
				date,
				owner,
				txHash,
				blockNumber
			);
			break;
		}
		case "setSeriesName": {
			await trackSeriesNameData(
				params,
				api,
				date,
				owner,
				txHash,
				blockHash,
				blockNumber
			);
			break;
		}
		case "transfer": {
			await trackTransferData(params, date, txHash, blockNumber, owner);
			break;
		}
		case "transferBatch": {
			await trackTransferBatchData(params, date, txHash, blockNumber, owner);
			break;
		}

		case "burn": {
			await trackBurnData(params, date, txHash, blockNumber, owner);
			break;
		}
		case "burnBatch": {
			await trackBurnBatchData(params, date, txHash, blockNumber, owner);
			break;
		}

		case "sellBundle": {
			if (!eventData) {
				logger.error(
					`Something wrong, no event found for sell bundle extrinsic at blockNumber ${blockNumber}`
				);
				break;
			}

			await trackSellBundleData(
				params,
				api,
				eventData,
				txHash,
				date,
				owner,
				blockNumber
			);
			break;
		}
		case "sell": {
			if (!eventData) {
				logger.error(
					`Something wrong, no event found for sell extrinsic at blockNumber ${blockNumber}`
				);
				break;
			}

			await trackSellData(
				params,
				api,
				eventData,
				txHash,
				date,
				owner,
				blockNumber
			);
			break;
		}

		case "buy": {
			await trackBuyData(
				params,
				blockHash,
				api,
				blockNumber,
				txHash,
				date,
				owner
			);
			break;
		}
		case "auction": {
			if (!eventData) {
				logger.error(
					`Something wrong, no event found for auction extrinsic at blockNumber ${blockNumber}`
				);
				break;
			}
			await trackAuctionData(
				eventData,
				params,
				api,
				txHash,
				date,
				owner,
				blockNumber
			);

			break;
		}
		case "auctionBundle": {
			if (!eventData) {
				logger.error(
					`Something wrong, no event found for auction bundle extrinsic at blockNumber ${blockNumber}`
				);
				break;
			}
			await trackAuctionBundleData(
				eventData,
				params,
				api,
				txHash,
				date,
				owner,
				blockNumber
			);

			break;
		}

		case "bid": {
			await trackBidData(
				params,
				api,
				blockHash,
				owner,
				txHash,
				date,
				blockNumber
			);
			break;
		}

		case "cancelSale": {
			await trackCancelSaleData(params, api, blockNumber, txHash, date, owner);
			break;
		}
	}
}
