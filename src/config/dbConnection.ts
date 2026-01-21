import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000;

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const connectDB = async (): Promise<void> => {
  if (!process.env.MONGODB_CONN_STRING) {
    throw new Error('MongoDB connection string is not defined');
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(process.env.MONGODB_CONN_STRING);
      console.log('Database connected successfully');
      return;
    } catch (error) {
      lastError = error as Error;
      const retryDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);

      if (attempt < MAX_RETRIES) {
        console.error(`Database connection attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${retryDelay}ms...`, error);
        await delay(retryDelay);
      }
    }
  }

  console.error(`Database connection failed after ${MAX_RETRIES} attempts:`, lastError);
  process.exit(1);
};

export default connectDB;