import axios from "axios";

export async function fetchNFTBlockFromUncoverForRange(start, end) {
	let startDate = new Date(start);
	let endDate = new Date(end);
	let page = 0;
	let blockNumbers = [];
	let globalBlockNumbers = [];
	do {
		const dateTimeInParts = startDate.toISOString().split("T");
		const startDateStr = dateTimeInParts[0];
		const endDateStr = endDate.toISOString().split("T")?.[0];
		const url = `${process.env.UNCOVER_ENDPOINT}/blocks_by_section?section=nft&method=AuctionSold&startDate=${startDateStr}&endDate=${endDateStr}&page=${page}&row=100`;
		console.log("url:", url);
		const response = await axios.get(url);
		blockNumbers = response?.data?.data;
		page = page + 1;
		globalBlockNumbers = globalBlockNumbers.concat(blockNumbers);
	} while (blockNumbers.length > 0);
	return globalBlockNumbers;
}
