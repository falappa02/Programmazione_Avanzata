import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandlerMiddleware } from './middlewares/error.middleware';
import { ErrorFactory } from './errors';
import { HttpStatus } from './enums';

// Inizializzazione applicazione Express
const app = express();

// --- 1. MIDDLEWARE GLOBALI (Chain of Responsibility) ---
// Abilita CORS per permettere chiamate da qualsiasi origine/frontend
app.use(cors());
// Parsing del body JSON per le richieste POST/PUT/PATCH
app.use(express.json());
// Parsing dei dati inviati via form-urlencoded
app.use(express.urlencoded({ extended: true }));

// --- 2. ROTTE DI BASE ---
// Endpoint di benvenuto con info di riepilogo
app.get('/', (req, res) => {
  res.status(HttpStatus.OK).json({
    success: true,
    message: 'Benvenuto nelle API Backend di Inferenza YOLO (Programmazione Avanzata - UnivPM)',
    version: '1.0.0',
    documentation: 'Vedi documentazione per l\'elenco completo delle rotte API.',
    healthCheck: '/health',
    apiPrefix: '/api/v1',
  });
});

// Endpoint di Health Check per monitorare lo stato del backend
app.get('/health', (req, res) => {
  res.status(HttpStatus.OK).json({ status: 'OK', message: 'Il server backend YOLO è attivo e pronto.' });
});

// --- 3. ROTTE API PRINCIPALI ---
// Tutte le rotte applicative sono montate con prefisso /api/v1
app.use('/api/v1', routes);

// --- 4. GESTIONE ROTTE NON TROVATE (404) ---
// Intercetta qualsiasi richiesta a un URL non definito
app.use((req, res, next) => {
  next(ErrorFactory.notFound('Rotta', `${req.method} ${req.originalUrl}`));
});

// --- 5. GESTORE DEGLI ERRORI CENTRALIZZATO ---
// Deve essere registrato per ULTIMO nella catena Express (4 parametri: err, req, res, next)
app.use(errorHandlerMiddleware);

export default app;
