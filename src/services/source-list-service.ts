import { getBskyProfile } from './bsky-profile-service.js';
import { type SourceSlant, useBiasRatingsFile } from '../constants.js';
import type { Source } from '../types.js';
import { getCollection } from '../connections/db-connection.js';
import SOURCE_INCLUDE_LIST from '../data/source-include-list.json' with { type: 'json' };

type AllSidesRating = {
	source_name: string;
	source_type: string;
	media_bias_rating: string;
	source_url: string;
	allsides_url: string;
};
type AllSidesPubRating = { publication: AllSidesRating };
type AllSidesPubResponse = { allsides_media_bias_ratings: AllSidesPubRating[] };
type AllSidesBiasRating = keyof typeof ALL_SIDES_RATINGS_TO_INT;
type SourceIncludeListKey = keyof typeof SOURCE_INCLUDE_LIST;

const headers = { Accept: 'application/json' };
const ALL_SIDES_RATINGS_TO_INT = {
	Left: 0,
	'Lean Left': 1,
	Center: 2,
	'Lean Right': 3,
	Right: 4,
};
const CENTER = 2;

global.sources = global.sources || {};
const resetSourceLists = () => {
	global.sources.app = [];
	global.sources.bySlant = [];
	global.sources.biasRatings = {};
};

const COLLECTION_NAME = 'source_lists';
const _collection = getCollection(COLLECTION_NAME);

let biasRatingsFile: Promise<AllSidesPubResponse>;
if (useBiasRatingsFile) {
	biasRatingsFile = import('../data/allsides_pub_data.json', { with: { type: 'json' } }).then(
		module => module.default
	);
}

const saveSourceLists = async (sourceLists: {
	appSourceList: Source[];
	sourceListBySlant: Source[][];
}) => {
	const db = await _collection;
	await db.deleteOne({});
	await db.insertOne(sourceLists);
};

const getBiasRatings = async (): Promise<AllSidesPubResponse> => {
	const requestOptions = { method: 'GET', headers };
	const response = await fetch('' + process.env.ALL_SIDES_RATINGS_URL, requestOptions);
	return response.json() as Promise<AllSidesPubResponse>;
};

const setSourcesAndBiasRatings = async () => {
	const biasRatingsResponse: AllSidesPubResponse = await (useBiasRatingsFile
		? biasRatingsFile
		: getBiasRatings());
	const biasRatings =
		biasRatingsResponse?.allsides_media_bias_ratings.map(({ publication }) => publication) || [];
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
		if (!Object.prototype.hasOwnProperty.call(global.sources.biasRatings, id)) {
			const formattedUrl = new URL(source_url).hostname.replace(/www\./, '');
			global.sources.app.push({
				id,
				name: modifiedName,
				url: formattedUrl,
				slant: biasRating,
			});
		}
		if (
			!Object.prototype.hasOwnProperty.call(global.sources.biasRatings, id) ||
			typeof global.sources.biasRatings[id] === 'undefined' ||
			Math.abs(biasRating - CENTER) > Math.abs(global.sources.biasRatings[id] - CENTER)
		) {
			global.sources.biasRatings[id] = biasRating;
			const prev = global.sources.app.find(source => source.id === id);
			if (prev) {
				prev.slant = biasRating;
			}
		}
	});
	await Promise.all(
		global.sources.app.map(async source => {
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

	global.sources.app.sort((source1, source2) => {
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

	global.sources.app.forEach(source => {
		const sourceSlant = global.sources.biasRatings[source.id];
		if (typeof sourceSlant !== 'undefined') {
			if (!global.sources.bySlant[sourceSlant]) {
				global.sources.bySlant[sourceSlant] = [];
			}
			global.sources.bySlant[sourceSlant].push(source);
		}
	});
};

export const getSourceLists = async (): Promise<{
	appSourceList: Source[];
	sourceListBySlant: Source[][];
}> => {
	if (!(global.sources.app && global.sources.app.length)) {
		await populateSourceLists();
	}
	const sourceLists = {
		appSourceList: global.sources.app,
		sourceListBySlant: global.sources.bySlant,
	};
	await saveSourceLists(sourceLists);
	return sourceLists;
};

export const getBiasRatingBySourceId = (sourceId: string): SourceSlant | undefined =>
	global.sources.biasRatings[sourceId];
