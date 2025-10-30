import type { SourceSlant } from './constants.js';

/** Source List Type Definition */

export type Source = {
	id: string;
	name: string;
	url: string;
	slant?: SourceSlant;
	bskyDid?: string;
	bskyHandle?: string;
};

/** Headline Search Result Type Definitions */

export type BskyArticle = {
	_id: string;
	sourceId: string;
	sourceName: string;
	slant: SourceSlant | undefined;
	title?: string;
	description: string;
	url: string;
	publishedAt: Date;
};

export type ItemSaved = {
	itemId?: string;
};

export type ItemDeleted = {
	itemDeleted: boolean;
};
