import type { Db, MongoClient } from 'mongodb';
import type { AtpAgent } from '@atproto/api';
import type { Source } from '../types.ts';
import type { SourceSlant } from '../constants.ts';

declare global {
	var mongo: {
		clientPromise: Promise<MongoClient>;
		db: Db;
	};
	var sources: {
		app: Source[];
		bySlant: Source[][];
		biasRatings: Record<string, SourceSlant>;
	};
	var bskyPublicAgent: AtpAgent;
}
