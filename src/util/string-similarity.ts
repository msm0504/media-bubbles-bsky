const DEFAULT_MIN_MATCH_SCORE = 0.8;

export const diceCoefficient = (str1: string, str2: string): number => {
	str1 = str1.toLowerCase().replace(/\s/g, '');
	str2 = str2.toLowerCase().replace(/\s/g, '');

	if (!str1.length || !str2.length) return 0;

	if (str1 === str2) return 1;

	const getBigrams = (s: string): Set<string> => {
		const bigrams = new Set<string>();
		for (let i = 0; i < s.length - 1; i++) {
			bigrams.add(s.substring(i, i + 2));
		}
		return bigrams;
	};

	const bigrams1 = getBigrams(str1);
	const bigrams2 = getBigrams(str2);

	let intersection = 0;
	for (const bg of bigrams1) {
		if (bigrams2.has(bg)) intersection++;
	}

	return (2 * intersection) / (bigrams1.size + bigrams2.size);
};

export const isSimilar = (
	test: string,
	compare: string | string[],
	minMatchScore: number = DEFAULT_MIN_MATCH_SCORE
) => {
	if (minMatchScore <= 0 || minMatchScore > 1) {
		minMatchScore = DEFAULT_MIN_MATCH_SCORE;
	}

	return Array.isArray(compare)
		? compare.some(str => diceCoefficient(test, str) >= minMatchScore)
		: diceCoefficient(test, compare) >= minMatchScore;
};
