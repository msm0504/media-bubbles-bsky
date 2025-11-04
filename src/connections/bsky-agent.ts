import { AtpAgent } from '@atproto/api';

let bskyPublicAgent: AtpAgent;

export const getBskyPublicAgent = () => {
	if (!bskyPublicAgent) {
		bskyPublicAgent = new AtpAgent({ service: 'https://public.api.bsky.app' });
	}
	return bskyPublicAgent;
};
