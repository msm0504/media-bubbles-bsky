import { getBskyPublicAgent } from '../connections/bsky-agent.js';

const MAX_BSKY_PROFILES = 5;
const USE_SECOND_PROFILE = ['bbc news'];

export const getBskyProfile = async (sourceName: string, url: string) => {
	const agent = getBskyPublicAgent();
	const profileIndex = USE_SECOND_PROFILE.includes(sourceName.toLowerCase()) ? 1 : 0;
	const urlResp = await agent.searchActorsTypeahead({ q: url, limit: MAX_BSKY_PROFILES });
	if (urlResp?.data?.actors.length) {
		return urlResp.data.actors[profileIndex];
	}
	const nameResp = await agent.searchActorsTypeahead({ q: sourceName, limit: MAX_BSKY_PROFILES });
	return nameResp?.data?.actors[profileIndex];
};
