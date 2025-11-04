import { beforeAll, expect, test, vi } from 'vitest';
import allsidesRespMock from '../__mocks__/allsides-resp.json' with { type: 'json' };
import { getBskyProfile } from '../bsky-profile-service.js';
import { getBiasRatingBySourceId, getSourceLists } from '../source-list-service.js';
import type { Source } from '../../types.js';

vi.mock('../bsky-profile-service', () => ({
	getBskyProfile: vi.fn(),
}));
vi.mock('../../connections/db-connection', () => ({
	getCollection: () => ({
		deleteOne: vi.fn(),
		insertOne: vi.fn(),
	}),
}));
vi.mock('../../data/allsides_pub_data.json', () => ({ default: allsidesRespMock }));

const cnnSourceObj: Source = {
	id: 'cnn',
	name: 'CNN',
	url: 'cnn.com',
	slant: 0,
	bskyDid: 'did:1234',
	bskyHandle: 'cnn.com',
};
const wsjSourceObj: Source = {
	id: 'wall-street-journal',
	name: 'Wall Street Journal',
	url: 'online.wsj.com',
	slant: 3,
	bskyDid: 'did:2345',
	bskyHandle: 'wsj.com',
};

beforeAll(() => {
	vi.mocked(getBskyProfile).mockImplementation((source: string) =>
		Promise.resolve(
			source === 'CNN'
				? { did: 'did:1234', handle: 'cnn.com' }
				: source === 'Wall Street Journal'
					? { did: 'did:2345', handle: 'wsj.com' }
					: { did: '', handle: '' }
		)
	);
});

test('generates and returns source lists', async () => {
	const { appSourceList, sourceListBySlant } = await getSourceLists();
	expect(appSourceList).toEqual([cnnSourceObj, wsjSourceObj]);
	expect(sourceListBySlant).toEqual([[cnnSourceObj], undefined, undefined, [wsjSourceObj]]);
});

test('can get bias rating for 1 source after source lists have been generated', async () => {
	await getSourceLists();
	expect(getBiasRatingBySourceId(cnnSourceObj.id)).toEqual(0);
	expect(getBiasRatingBySourceId(wsjSourceObj.id)).toEqual(3);
});
