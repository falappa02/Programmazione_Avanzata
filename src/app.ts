import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandlerMiddleware } from './middlewares/error.middleware';
import { NotFoundError } from './errors/NotFoundError';
import { HttpStatus } from './enums';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Endpoint
app.get('/', (req, res) => {
  res.status(HttpStatus.OK).json({
    success: true,
    message: 'Benvenuto nelle API Backend di Inferenza YOLOv11n (Programmazione Avanzata - UnivPM)',
    version: '1.0.0',
    documentation: 'Vedi README.md per l\'elenco completo delle rotte API.',
    healthCheck: '/health',
    apiPrefix: '/api/v1',
  });
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(HttpStatus.OK).json({ status: 'OK', message: 'YOLO Inference API Backend Server is healthy.' });
});

// API Routes Aggregator
app.use('/api/v1', routes);

// 404 Route Handler
app.use((req, res, next) => {
  next(new NotFoundError(`Rotta non trovata: ${req.method} ${req.originalUrl}`));
});


app.use(errorHandlerMiddleware);

export default app;
