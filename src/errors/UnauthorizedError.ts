import { AppError } from './AppError';
import { HttpStatus } from '../enums';

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Accesso non autorizzato. Token JWT non valido o mancante.') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}
