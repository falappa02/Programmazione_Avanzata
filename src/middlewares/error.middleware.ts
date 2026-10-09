import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'sequelize';
import { AppError } from '../errors/AppError';
import { HttpStatus } from '../enums';

/**
 * Middleware: Centralized Error Handler converting exceptions into structured HTTP JSON responses.
 */
export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Errore interno del server.';
  let details: unknown = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ValidationError) {
    statusCode = HttpStatus.BAD_REQUEST;
    message = err.name === 'SequelizeUniqueConstraintError'
      ? 'Vincolo di unicità violato nel database.'
      : 'Errore di validazione nel database.';
    details = err.errors.map((e) => e.message);
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
