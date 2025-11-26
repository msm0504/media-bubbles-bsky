import { getBskyProfile } from './bsky-profile-service.js';
import { type SourceSlant } from '../constants.js';
import type { Source } from '../types.js';
import { getCollection } from '../connections/db-connection.js';
import SOURCE_INCLUDE_LIST from '../data/source-include-list.json' with { type: 'json' };
import ALL_SIDES_RATINGS from '../data/allsides_pub_data.json' with { type: 'json' };

type AllSidesRating = {
	source_name: string;
	source_type: string;
	media_bias_rating: string;
	source_url: string;
	allsides_url: string;
};
type AllSidesPubRating = { publication: AllSidesRating[] };
type AllSidesPubResponse = { allsides_media_bias_ratings: AllSidesPubRating };
type AllSidesBiasRating = keyof typeof ALL_SIDES_RATINGS_TO_INT;
type SourceIncludeListKey = keyof typeof SOURCE_INCLUDE_LIST;

const ALL_SIDES_RATINGS_TO_INT = {
	Left: 0,
	'Lean Left': 1,
	Center: 2,
	'Lean Right': 3,
	Right: 4,
};
const CENTER = 2;

let appSourceList: Source[] = [];
let sourceListBySlant: Source[][] = [];
let sourceBiasRatings: Record<string, SourceSlant> = {};

const resetSourceLists = () => {
	appSourceList = [];
	sourceListBySlant = [];
	sourceBiasRatings = {};
};

const COLLECTION_NAME = 'source_lists';
const _collection = getCollection(COLLECTION_NAME);

const saveSourceLists = async (sourceLists: {
	appSourceList: Source[];
	sourceListBySlant: Source[][];
}) => {
	const db = await _collection;
	await db.deleteMany({});
	await db.insertOne(sourceLists);
};

const setSourcesAndBiasRatings = async () => {
	const biasRatings =
		(ALL_SIDES_RATINGS as AllSidesPubResponse)?.allsides_media_bias_ratings.publication || [];
	biasRatings.forEach(({ source_name, source_url, media_bias_rating }) => {
		const biasRating = ALL_SIDES_RATINGS_TO_INT[
			media_bias_rating as AllSidesBiasRating
		] as SourceSlant;
		if (biasRating === null || typeof biasRating === 'undefined') return 0;

		const modifiedName = source_name
			.replace(/\(.*\)/, '') // ignore part of name in ()
			.replace(/\s-\s\S+$/, '') // ignore dash suffix
			.trim();

		if (!SOURCE_INCLUDE_LIST[modifiedName as SourceIncludeListKey] === true || !source_url)
			return 0;

		const id = modifiedName.toLowerCase().replace(/\s/g, '-');
		if (!Object.prototype.hasOwnProperty.call(sourceBiasRatings, id)) {
			const formattedUrl = new URL(source_url).hostname.replace(/www\./, '');
			appSourceList.push({
				id,
				name: modifiedName,
				url: formattedUrl,
				slant: biasRating,
			});
		}
		if (
			!Object.prototype.hasOwnProperty.call(sourceBiasRatings, id) ||
			typeof sourceBiasRatings[id] === 'undefined' ||
			Math.abs(biasRating - CENTER) > Math.abs(sourceBiasRatings[id] - CENTER)
		) {
			sourceBiasRatings[id] = biasRating;
			const prev = appSourceList.find(source => source.id === id);
			if (prev) {
				prev.slant = biasRating;
			}
		}
	});
	await Promise.all(
		appSourceList.map(async source => {
			const profile = await getBskyProfile(source.name, source.url);
			if (profile?.handle) {
				source.bskyHandle = profile.handle;
				source.bskyDid = profile.did;
			} else {
				console.error(`Failed getting profile for ${source.name} (${source.url}): ${profile}`);
			}
		})
	);
};

const populateSourceLists = async () => {
	resetSourceLists();

	await setSourcesAndBiasRatings();

	appSourceList.sort((source1, source2) => {
		const name1 = source1.name.toLowerCase();
		const name2 = source2.name.toLowerCase();

		if (name1 < name2) {
			return -1;
		}
		if (name1 > name2) {
			return 1;
		}
		return 0;
	});

	appSourceList.forEach(source => {
		const sourceSlant = sourceBiasRatings[source.id];
		if (typeof sourceSlant !== 'undefined') {
			if (!sourceListBySlant[sourceSlant]) {
				sourceListBySlant[sourceSlant] = [];
			}
			sourceListBySlant[sourceSlant].push(source);
		}
	});
};

export const getSourceLists = async (): Promise<{
	appSourceList: Source[];
	sourceListBySlant: Source[][];
}> => {
	if (!(appSourceList && appSourceList.length)) {
		await populateSourceLists();
	}
	const sourceLists = { appSourceList, sourceListBySlant };
	await saveSourceLists(sourceLists);
	return sourceLists;
};

export const getBiasRatingBySourceId = (sourceId: string): SourceSlant | undefined =>
	sourceBiasRatings[sourceId];
