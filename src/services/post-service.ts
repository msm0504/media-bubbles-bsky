import { ObjectId } from 'mongodb';
import type { AppBskyEmbedExternal } from '@atproto/api';
import type { CommitCreateEvent, CommitDeleteEvent, CommitUpdateEvent } from '@skyware/jetstream';
import { getSourceLists } from './source-list-service.js';
import { SECONDS_IN_WEEK } from '../constants.js';
import type { BskyArticle, ItemDeleted, ItemSaved } from '../types.js';
import { getCollection } from '../connections/db-connection.js';
import { isSimilar } from '../util/string-similarity.js';

const COLLECTION_NAME = 'bsky_posts';
const BSKY_ARTICLE_TYPE = 'app.bsky.embed.external';
// Based on https://www.freecodecamp.org/news/how-to-write-a-regular-expression-for-a-url/
const URL_REGEX =
	/((https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]{2,})(\.[a-zA-Z0-9]{2,})?\/[a-zA-Z0-9]{2,})/;

const _collection = getCollection(COLLECTION_NAME).then(collection => {
	collection.createIndex({ publishedAt: 1 }, { expireAfterSeconds: SECONDS_IN_WEEK });
	return collection;
});

const formatPost = async (
	event: CommitCreateEvent<'app.bsky.feed.post'> | CommitUpdateEvent<'app.bsky.feed.post'>
): Promise<BskyArticle | undefined> => {
	const { appSourceList } = await getSourceLists();
	const postSource = appSourceList?.find(({ bskyDid }) => bskyDid === event.did);
	if (!postSource) return;

	const { record } = event.commit;
	if ((record.embed?.$type || '') === BSKY_ARTICLE_TYPE) {
		const embed = record.embed as unknown as AppBskyEmbedExternal.Main;
		const external = embed?.external;
		return {
			_id: event.commit.rkey,
			sourceId: postSource.id,
			sourceName: postSource.name,
			slant: postSource.slant,
			title: external.title,
			description: external.description || record.text,
			url: external.uri,
			publishedAt: new Date(event.commit.record.createdAt),
		};
	} else if (record.text) {
		const textWithUrl = record.text.split(URL_REGEX, 2);
		const text = textWithUrl[0]?.trim() || '';
		const url = textWithUrl[1]?.startsWith('http')
			? textWithUrl[1]
			: textWithUrl[1]
				? `https://${textWithUrl[1]}`
				: '';
		return {
			_id: event.commit.rkey,
			sourceId: postSource.id,
			sourceName: postSource.name,
			slant: postSource.slant,
			description: text,
			url: url,
			publishedAt: new Date(event.commit.record.createdAt),
		};
	}
};

const isUniquePost = async (post: BskyArticle) => {
	const db = await _collection;
	const recentPosts = (await db
		.find({
			$and: [
				{ sourceId: post.sourceId },
				{
					$expr: {
						$gte: [
							{ $toDate: '$publishedAt' },
							{ $dateSubtract: { startDate: '$$NOW', unit: 'day', amount: 1 } },
						],
					},
				},
			],
		})
		.toArray()) as unknown as BskyArticle[];

	if (!recentPosts.length) return true;

	const recentIds: Set<string> = new Set();
	const recentTitles: string[] = [];
	const recentDescs: string[] = [];

	recentPosts.forEach(recent => {
		recentIds.add(recent._id);
		if (recent.title) recentTitles.push(recent.title);
		if (recent.description) recentDescs.push(recent.description);
	});

	try {
		const hasUniqueTitle =
			!post.title || !recentTitles.length || !isSimilar(post.title, recentTitles);
		const hasUniqueDesc =
			!post.description || !recentDescs.length || !isSimilar(post.description, recentDescs);

		return !recentIds.has(post._id) && hasUniqueTitle && hasUniqueDesc;
	} catch (error) {
		console.error(error);
		return true;
	}
};

export const insertPost = async (
	event: CommitCreateEvent<'app.bsky.feed.post'>
): Promise<ItemSaved> => {
	const db = await _collection;
	const post = await formatPost(event);
	if (post && (await isUniquePost(post))) {
		try {
			const { insertedId } = await db.insertOne({
				...post,
				_id: post._id as unknown as ObjectId,
			});
			return { itemId: insertedId.toString() };
		} catch (error) {
			console.error(error);
		}
	}
	return {};
};

export const updatePost = async (
	event: CommitUpdateEvent<'app.bsky.feed.post'>
): Promise<ItemSaved> => {
	const db = await _collection;
	const post = await formatPost(event);
	if (post) {
		const { _id, ...rest } = post;
		try {
			const { modifiedCount } = await db.updateOne(
				{ _id: _id as unknown as ObjectId },
				{ $set: rest }
			);
			return { itemId: modifiedCount === 1 ? _id : '' };
		} catch (error) {
			console.error(error);
		}
	}
	return {};
};

export const deletePost = async (
	event: CommitDeleteEvent<'app.bsky.feed.post'>
): Promise<ItemDeleted> => {
	const db = await _collection;
	try {
		const { deletedCount } = await db.deleteOne({ _id: event.commit.rkey as unknown as ObjectId });
		return { itemDeleted: deletedCount === 1 };
	} catch (error) {
		console.error(error);
		return { itemDeleted: false };
	}
};
