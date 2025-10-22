import express from 'express';
import cors from 'cors';
import cityRoutes from './routes/cityRoutes.js';
import faqRoutes from './routes/faqRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import organisationRoutes from './routes/organisationRoutes.js';
import serviceCategoryRoutes from './routes/serviceCategoryRoutes.js';
import userRoutes from './routes/userRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import swepBannerRoutes from './routes/swepBannerRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import checkJwt from './middleware/checkJwt.js';
import './instrument.js';
import * as Sentry from "@sentry/node";

const app = express();

app.use(cors());
app.use(express.json());

app.use(checkJwt);

// TODO: We will remove this route after testing
app.get("/debug-sentry", function mainHandler(req) {
  const { message = 'Test error message' } = req.query;
  throw new Error(`Sentry Test Error: ${message}`);
});

app.use('/api/cities', cityRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/organisations', organisationRoutes);
app.use('/api/service-categories', serviceCategoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/swep-banners', swepBannerRoutes);
app.use('/api/resources', resourceRoutes);

// The error handler must be registered before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);

app.use(notFound);
app.use(errorHandler);

export default app;