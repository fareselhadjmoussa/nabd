const mongoose = require('mongoose');
const config = require('./index');

/**
 * Connect to MongoDB database
 */
const connectDB = async () => {
  try {
    if (!config.MONGODB_URI || typeof config.MONGODB_URI !== 'string') {
      throw new Error(
        'MONGODB_URI is missing. Create backend/.env from backend/.env.example and set MONGODB_URI to your MongoDB Atlas connection string.'
      );
    }

    const conn = await mongoose.connect(config.MONGODB_URI, {
      // MongoDB driver options
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('👋 MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
