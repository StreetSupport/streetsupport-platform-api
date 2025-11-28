import app from './app.js';
import connectDB from './config/dbConnection.js';
import dotenv from 'dotenv';
import { startVerificationJob } from './jobs/verificationOrganisationJob.js';
import { startDisablingJob } from './jobs/disablingOrganisationJob.js';
import { startSwepActivationJob } from './jobs/swepActivationJob.js';
import { startBannerActivationJob } from './jobs/bannerActivationJob.js';

dotenv.config();
connectDB();

// Start background jobs
// Only run verification job on staging environment
if (process.env.NODE_ENV === 'staging' || process.env.ENVIRONMENT === 'staging') {
  startVerificationJob();
}
startDisablingJob();
startSwepActivationJob();
startBannerActivationJob();

const PORT:any = process.env.PORT;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});