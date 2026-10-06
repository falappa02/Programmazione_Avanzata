import { AppError } from './AppError';
import { HttpStatus } from '../enums';

export class NotFoundError extends AppError {
  constructor(message: string = 'Risorsa richiesta non trovata.') {
    super(message, HttpStatus.NOT_FOUND);
  }
}
