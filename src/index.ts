import app from './app.js';
import connectDB from './config/dbConnection.js';
import dotenv from 'dotenv';
import { startVerificationJob } from './jobs/verificationJob.js';

dotenv.config();
connectDB();

// Start background verification job
startVerificationJob();

const PORT:any = process.env.PORT;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});