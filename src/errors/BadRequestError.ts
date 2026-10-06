import { AppError } from './AppError';
import { HttpStatus } from '../enums';

export class BadRequestError extends AppError {
  constructor(message: string = 'Richiesta non valida.', details: any = null) {
    super(message, HttpStatus.BAD_REQUEST, details);
  }
}
