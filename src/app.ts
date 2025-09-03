import express from 'express';
import cors from 'cors';
import cityRoutes from './routes/cityRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import faqRoutes from './routes/faqRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import serviceProviderRoutes from './routes/serviceProviderRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import checkJwt from './middleware/checkJwt.js';
import '../instrument.js';
import * as Sentry from "@sentry/node"

const app = express();

app.use(cors());
app.use(express.json());

app.use(checkJwt);

// TODO: We will remove this route after testing
app.get("/debug-sentry", function mainHandler(req, res) {
    const { message = 'Test error message' } = req.query;
    throw new Error(`Sentry Test Error: ${message}`);
  });

app.use('/api/cities', cityRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/service-providers', serviceProviderRoutes);
app.use('/api/users', userRoutes);

// The error handler must be registered before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);

app.use(notFound);
app.use(errorHandler);

export default app;