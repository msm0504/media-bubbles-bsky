import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { getBskyProfile } from '../bsky-profile-service.js';

const server = setupServer();

beforeAll(() => {
	vi.mock('@atproto/api', async importOriginal => {
		const mod: object = await importOriginal();
		return {
			...mod,
			AtpAgent: vi.fn(
				class {
					searchActorsTypeahead = () =>
						fetch('https://test.com/bsky/searchActorsTypeahead').then(resp => resp.json());
				}
			),
		};
	});
	server.listen();
	server.use(
		http.get('https://test.com/bsky/searchActorsTypeahead', () =>
			HttpResponse.json({ data: { actors: [{ did: 'did:example:123', handle: 'example' }] } })
		)
	);
});

afterAll(() => server.close());

test('getBskyProfile returns profile based on URL', async () => {
	const profile = await getBskyProfile('example', 'http://example.com');
	expect(profile).toEqual({ did: 'did:example:123', handle: 'example' });
});
