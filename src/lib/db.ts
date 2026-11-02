import 'server-only';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/text-widgets';

interface MongooseCache {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cached: MongooseCache = globalForMongoose.mongooseCache ?? {
  connection: null,
  promise: null,
};

if (!globalForMongoose.mongooseCache) {
  globalForMongoose.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.connection?.connection.readyState === 1) {
    return cached.connection;
  }

  // A resolved connection can still be disconnected later. Drop it so the
  // routes report a database outage instead of surfacing query failures as 500s.
  if (cached.connection) {
    cached.connection = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });
  }

  try {
    const connection = await cached.promise;

    if (connection.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not ready.');
    }

    cached.connection = connection;
    return connection;
  } catch (error) {
    cached.connection = null;
    cached.promise = null;
    throw error;
  }
}

export async function pingDatabase(): Promise<void> {
  const connection = await connectToDatabase();
  const database = connection.connection.db;

  if (!database) {
    throw new Error('MongoDB connection is not ready.');
  }

  await database.admin().ping();
}
