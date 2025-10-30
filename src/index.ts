import { Jetstream } from '@skyware/jetstream';
import { getSourceLists } from './services/source-list-service.js';
import { deletePost, insertPost, updatePost } from './services/post-service.js';

const runJetstream = async () => {
	const { appSourceList } = await getSourceLists();
	const dids = appSourceList.reduce((acc, source) => {
		if (source.bskyDid) acc.push(source.bskyDid);
		return acc;
	}, [] as string[]);

	const jetstream = new Jetstream({
		wantedCollections: ['app.bsky.feed.post'],
		wantedDids: dids,
	});

	jetstream.onCreate('app.bsky.feed.post', insertPost);
	jetstream.onUpdate('app.bsky.feed.post', updatePost);
	jetstream.onDelete('app.bsky.feed.post', deletePost);

	jetstream.start();
};

runJetstream();
