import { getBskyPublicAgent } from '../connections/bsky-agent.js';

const MAX_BSKY_PROFILES = 5;

export const getBskyProfile = async (sourceName: string, url: string) => {
	const agent = getBskyPublicAgent();
	if (url === 'bbc.com') {
		const bbcResp = await agent.searchActorsTypeahead({ q: 'bbcnews', limit: MAX_BSKY_PROFILES });
		return bbcResp.data.actors[1];
	}
	const urlResp = await agent.searchActorsTypeahead({ q: url, limit: MAX_BSKY_PROFILES });
	if (urlResp?.data?.actors.length) {
		return urlResp.data.actors[0];
	}
	const nameResp = await agent.searchActorsTypeahead({ q: sourceName, limit: MAX_BSKY_PROFILES });
	return nameResp?.data?.actors[0];
};
