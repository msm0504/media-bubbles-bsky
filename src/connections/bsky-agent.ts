import { AtpAgent } from '@atproto/api';

global.bskyPublicAgent = global.bskyPublicAgent || null;

export const getBskyPublicAgent = () => {
	if (!global.bskyPublicAgent) {
		global.bskyPublicAgent = new AtpAgent({ service: 'https://public.api.bsky.app' });
	}
	return global.bskyPublicAgent;
};
