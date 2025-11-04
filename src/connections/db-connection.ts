import { Collection, Db, MongoClient } from 'mongodb';
import { MONGODB_URL } from '../constants.js';

let mongo: Db;

const getMongoClient = async (): Promise<MongoClient> => {
	const client = new MongoClient(MONGODB_URL);
	return client.connect();
};

const getDbConnection = async (): Promise<Db> => {
	if (mongo) {
		return mongo;
	}

	mongo = await getMongoClient().then(client => client.db(process.env.MONGODB_DBNAME));
	return mongo;
};

export const getCollection = async (collectionName: string): Promise<Collection> => {
	const db = await getDbConnection();
	return db.collection(collectionName);
};
