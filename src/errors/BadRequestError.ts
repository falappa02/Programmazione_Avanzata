import { AppError } from './AppError';
import { HttpStatus } from '../enums';

export class BadRequestError extends AppError {
  constructor(message: string = 'Richiesta non valida.', details: unknown = null) {
    super(message, HttpStatus.BAD_REQUEST, details);
  }
}
