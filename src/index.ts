import app from './app.js';
import connectDB from './config/dbConnection.js';
import dotenv from 'dotenv';
import { startVerificationJob } from './jobs/verificationOrganisationJob.js';
import { startDisablingJob } from './jobs/disablingOrganisationJob.js';
import { startSwepActivationJob } from './jobs/swepActivationJob.js';

dotenv.config();
connectDB();

// Start background jobs
// TODO: think how to restrict this job to run only on production
startVerificationJob();
startDisablingJob();
startSwepActivationJob();

const PORT:any = process.env.PORT;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});