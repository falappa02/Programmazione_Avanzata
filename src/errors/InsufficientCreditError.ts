import { AppError } from './AppError';
import { HttpStatus } from '../enums';

export class InsufficientCreditError extends AppError {
  constructor(message: string = 'Credito residuo non sufficiente per completare la richiesta.') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}
