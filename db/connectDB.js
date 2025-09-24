// config/db.js
const mongoose = require('mongoose');

let isConnected = false; // 🔒 cached connection state

const connectDB = async () => {
  try {
    // Always attempt to connect - mongoose will reuse existing connection if available
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority',
      bufferCommands: false, // Disable buffering
    });

    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);

  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    throw error;
  }
};

// 🚫 Disable buffering so queries don’t hang in serverless
mongoose.set('bufferCommands', false);

module.exports = connectDB;
