import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandlerMiddleware } from './middlewares/error.middleware';
import { NotFoundError } from './errors/NotFoundError';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'YOLO Inference API Backend Server is healthy.' });
});

// API Routes Aggregator
app.use('/api/v1', routes);

// 404 Route Handler
app.use((req, res, next) => {
  next(new NotFoundError(`Rotta non trovata: ${req.method} ${req.originalUrl}`));
});

// Centralized Error Handling Middleware
app.use(errorHandlerMiddleware);

export default app;
