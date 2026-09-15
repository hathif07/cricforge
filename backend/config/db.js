const mongoose = require('mongoose');

/**
 * Connects to MongoDB. Tries MONGODB_URI first, then falls back to a
 * local instance, and finally to an in-memory MongoDB server so the
 * whole merged app can boot with zero external configuration during
 * development or grading.
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      console.log(`MongoDB connected: ${mongoUri}`);
      return;
    } catch (err) {
      console.warn(`Could not connect to MONGODB_URI (${err.message}). Trying local MongoDB...`);
    }
  }

  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/cricforge', {
      serverSelectionTimeoutMS: 2000
    });
    console.log('MongoDB connected: mongodb://127.0.0.1:27017/cricforge');
    return;
  } catch (err) {
    console.warn(`Local MongoDB not reachable (${err.message}). Falling back to in-memory MongoDB...`);
  }

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log(`In-memory MongoDB connected: ${uri}`);
  } catch (err) {
    console.error('Failed to start in-memory MongoDB. Install mongodb-memory-server as a devDependency, or run MongoDB locally.', err.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
};

module.exports = { connectDB, disconnectDB };
