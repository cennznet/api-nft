import axios from "axios";
import { logger } from "@/src/logger";

export async function fetchNFTBlockFromUncoverForRange(start, end) {
	let startDate = new Date(start);
	let endDate = new Date(end);
	let page = 0;
	let nftBlockNumbers = [];
	let batchTxBlockNumbers = [];
	let globalBlockNumbers = [];
	let moreNFTsExists = true;
	let moreUtilityBatchExists = true;
	try {
		do {
			const dateTimeInParts = startDate.toISOString().split("T");
			const startDateStr = dateTimeInParts[0];
			const endDateStr = endDate.toISOString().split("T")?.[0];
			const urlWithNFT = `${process.env.UNCOVER_ENDPOINT}/blocks_by_section?section=nft&method=AuctionSold&startDate=${startDateStr}&endDate=${endDateStr}&page=${page}&row=100`;
			const urlWithBatch = `${process.env.UNCOVER_ENDPOINT}/blocks_by_section?section=utility&startDate=${startDateStr}&endDate=${endDateStr}&page=${page}&row=100`;
			let nftResponse;
			let utilityResponse;
			if (moreNFTsExists && moreUtilityBatchExists) {
				[nftResponse, utilityResponse] = await Promise.all([
					axios.get(urlWithNFT),
					axios.get(urlWithBatch),
				]);
			} else if (moreNFTsExists) {
				nftResponse = await axios.get(urlWithNFT);
			} else if (moreUtilityBatchExists) {
				utilityResponse = await axios.get(urlWithBatch);
			}
			nftBlockNumbers = nftResponse?.data?.data;
			batchTxBlockNumbers = utilityResponse?.data?.data;
			moreNFTsExists =
				nftBlockNumbers && nftBlockNumbers.length > 0 ? true : false;
			moreUtilityBatchExists =
				batchTxBlockNumbers && batchTxBlockNumbers.length > 0 ? true : false;
			page = page + 1;
			if (moreNFTsExists) {
				globalBlockNumbers = globalBlockNumbers.concat(nftBlockNumbers);
			}
			if (moreUtilityBatchExists) {
				globalBlockNumbers = globalBlockNumbers.concat(batchTxBlockNumbers);
			}
		} while (moreNFTsExists || moreUtilityBatchExists);
	} catch (error) {
		logger.error(error);
	}
	const uniqueBlockNumbers = Array.from(new Set(globalBlockNumbers));
	return uniqueBlockNumbers;
}
