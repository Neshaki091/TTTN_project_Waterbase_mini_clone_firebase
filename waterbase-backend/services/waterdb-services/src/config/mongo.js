const mongoose = require('mongoose');

const connectMongo = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/waterdb';

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[waterdb] Mongo connected');
  } catch (error) {
    console.error('[waterdb] Mongo connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectMongo;

