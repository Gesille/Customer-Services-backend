import express from 'express';
import cors from 'cors';
import routes from './routes/index';
import { errorMiddleware, notFoundMiddleware } from './shared/middleware/error.middleware';


const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1', routes);

// Not found
app.use(notFoundMiddleware);

// Error handler
app.use(errorMiddleware);

export default app;