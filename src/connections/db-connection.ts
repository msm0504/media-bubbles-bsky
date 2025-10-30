import { Collection, Db, MongoClient } from 'mongodb';
import { MONGODB_URL } from '../constants.js';

global.mongo = global.mongo || { clientPromise: null, db: null };

export const getMongoClient = async (): Promise<MongoClient> => {
	if (global.mongo.clientPromise) {
		return global.mongo.clientPromise;
	}

	const client = new MongoClient(MONGODB_URL);
	global.mongo.clientPromise = client.connect();
	return global.mongo.clientPromise;
};

const getDbConnection = async (): Promise<Db> => {
	if (global.mongo.db) {
		return global.mongo.db;
	}

	global.mongo.db = await getMongoClient().then(client => client.db(process.env.MONGODB_DBNAME));
	return global.mongo.db;
};

export const getCollection = async (collectionName: string): Promise<Collection> => {
	const db = await getDbConnection();
	return db.collection(collectionName);
};
