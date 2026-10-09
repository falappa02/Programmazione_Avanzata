import { HttpStatus } from '../enums';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details: unknown;

  constructor(message: string, statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR, details: unknown = null, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
