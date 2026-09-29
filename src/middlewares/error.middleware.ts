import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

/**
 * Middleware: Centralized Error Handler converting exceptions into structured HTTP JSON responses.
 */
export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let statusCode = 500;
  let message = 'Errore interno del server.';
  let details = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    message = 'Vincolo di unicità violato nel database.';
    details = (err as any).errors?.map((e: any) => e.message);
  } else if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Errore di validazione nel database.';
    details = (err as any).errors?.map((e: any) => e.message);
  } else {
    console.error('[UNHANDLED ERROR]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      details,
      timestamp: new Date().toISOString(),
    },
  });
}
