import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
    try {
        if (!process.env.MONGODB_CONN_STRING) {
            throw new Error('MongoDB connection string is not defined');
        }
        
        await mongoose.connect(process.env.MONGODB_CONN_STRING);
        console.log('✅ Database connected successfully');
    } catch (error) {
        console.error('❌ Database connection error:', error);
        process.exit(1);
    }
};

export default connectDB;