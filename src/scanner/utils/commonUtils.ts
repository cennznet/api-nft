// common function
import { trackEventDataSet } from "../dbOperations";
import { bnToBn, extractTime, u8aToString } from "@polkadot/util";

export interface Params {
	name: string;
	value: string;
	type: string;
}

export async function extractTokenListingData(
	tokens,
	dataInserts,
	blockNumber,
	tokenData,
	owner,
	eventType
) {
	tokens.forEach((token) => {
		dataInserts.push([
			JSON.stringify(token),
			0,
			blockNumber,
			JSON.stringify(tokenData),
			owner,
			eventType,
		]);
	});
	await trackEventDataSet(dataInserts);
}

let blockTime;

// Convert a block number to date
export async function convertBlockToDate(api, blockNumber, date) {
	blockTime = blockTime ? blockTime : await api.consts.babe.expectedBlockTime;
	const value = blockTime.mul(bnToBn(blockNumber)).toNumber();
	const time = extractTime(Math.abs(value));
	const { days } = time;
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

// common function
export async function extractListingData(
	tokenIds,
	blockNumber,
	tokenData,
	owner,
	listingId,
	listingData,
	eventType
) {
	const tokens = [];
	let type = 0;
	tokenIds.forEach((tokenId) => {
		tokens.push([
			JSON.stringify(tokenId),
			type,
			blockNumber,
			JSON.stringify(tokenData),
			owner,
			eventType,
		]);
	});
	type = 1; // listing data
	tokens.push([
		listingId,
		type,
		blockNumber,
		JSON.stringify(listingData),
		owner,
		eventType,
	]);
	await trackEventDataSet(tokens);
}

export let supportedAssets = [];

export async function fetchSupportedAssets(api) {
	const assets = await api.rpc.genericAsset.registeredAssets();

	const assetInfo = assets.map((asset) => {
		const [tokenId, { symbol, decimalPlaces }] = asset;
		return {
			id: tokenId.toString(),
			symbol: u8aToString(symbol),
			decimals: decimalPlaces.toNumber(),
		};
	});
	supportedAssets = assetInfo;
}

// find the event for the extrinsic
export function filterExtrinsicEvents(extrinsicIdx, events) {
	return events.filter(
		({ phase }) =>
			phase.isApplyExtrinsic && phase.asApplyExtrinsic.eqn(extrinsicIdx)
	);
}

export function isExtrinsicSuccessful(extrinsicIdx, events) {
	return (
		events.findIndex((evt) => evt.event.method === "ExtrinsicSuccess") > -1
	);
}

export function getExtrinsicParams(e) {
	return e.meta.args.map((arg, idx) => {
		const value = e.args[idx].toJSON();
		return {
			...arg.toJSON(),
			value,
		};
	});
}

export function getTimestamp(block, api) {
	for (const e of block.extrinsics) {
		const call = api.findCall(e.callIndex);
		if (call.section === "timestamp" && call.method === "set") {
			const date = new Date(e.args[0].toJSON());
			if (isNaN(date.getTime())) {
				throw new Error("timestamp args type wrong");
			}
			return date;
		}
	}
}
