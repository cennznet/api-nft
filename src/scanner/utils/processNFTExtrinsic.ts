import { logger } from "@/src/logger";
import {
	trackAdditionalTokenData,
	trackTokenSeriesData,
	trackUniqueMintData,
} from "@/src/scanner/utils/trackTokenCreation";
import { trackSeriesNameData } from "@/src/scanner/utils/trackTokenName";
import {
	trackTransferBatchData,
	trackTransferData,
} from "@/src/scanner/utils/trackTokenTransfers";
import {
	trackBurnBatchData,
	trackBurnData,
} from "@/src/scanner/utils/trackTokenBurn";
import {
	trackSellBundleData,
	trackSellData,
} from "@/src/scanner/utils/trackTokenSell";
import { trackBuyData } from "@/src/scanner/utils/trackTokenBuy";
import {
	trackAuctionBundleData,
	trackAuctionData,
} from "@/src/scanner/utils/trackTokenAuction";
import { trackBidData } from "@/src/scanner/utils/trackBidData";
import { trackCancelSaleData } from "@/src/scanner/utils/trackSaleCancel";
import {ExtrinsicDetails} from "@/src/types";
import {filterExtrinsicEvents, getTimestamp, isExtrinsicSuccessful} from "@/src/scanner/utils/commonUtils";

export async function fetchNFTsFromExtrinsic(extrinsicDetails: ExtrinsicDetails) {
	const { call,
		extIndex,
		allEvents,
		block,
		api,
		e,
		params,
		blockNumber,
		blockHash,
		batchIndex} = extrinsicDetails;
	if (call.section === "nft") {
		const extrinsicRelatedEvents = filterExtrinsicEvents(
			extIndex,
			allEvents
		);
		if (isExtrinsicSuccessful(extIndex, extrinsicRelatedEvents)) {
			const blockTimestamp = getTimestamp(block.block, api);
			const txHash = e.hash.toString();
			const owner = e.signer.toString();
			const {method} = call;
			await processNFTExtrinsicData({
				method,
				params,
				events: extrinsicRelatedEvents,
				txHash,
				blockTimestamp,
				api,
				owner,
				blockNumber,
				blockHash,
				batchIndex
			});
		}
	}
}

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
	batchIndex = 0
}) {
	logger.info(`Event triggered::${method}`);
	const date = blockTimestamp;
	const findNFTEvent = events.filter(({ event }) => event.section === "nft");
	const eventData = findNFTEvent ? findNFTEvent[batchIndex].event.data.toJSON() : null;
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
