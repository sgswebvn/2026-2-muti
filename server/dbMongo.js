import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/facebook_multipublisher';

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout if MongoDB Cloud unreachable
    });
    isConnected = true;
    console.log(`🍃 [MongoDB Cloud] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`⚠️ [MongoDB Cloud Warning] Could not connect to MongoDB: ${error.message}`);
    console.warn(`💡 Hint: Make sure process.env.MONGODB_URI is set correctly in .env with a valid MongoDB Atlas URI.`);
  }
}

export { mongoose };
