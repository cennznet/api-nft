export default function getTokenIdArray(tokenIds): string[] {
	const tokenIdsRaw = tokenIds.slice(
		tokenIds.indexOf("[") + 1,
		tokenIds.lastIndexOf("]")
	);

	return tokenIdsRaw
		.split("[")
		.filter(Boolean)
		.map((tokenIdRaw) => {
			const tokenIdArray = tokenIdRaw.split(",");
			return `${tokenIdArray[0]}_${tokenIdArray[1]}_${tokenIdArray[2].replace(
				"]",
				""
			)}`;
		});
}
