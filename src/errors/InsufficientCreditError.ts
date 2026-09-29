import { AppError } from './AppError';

export class InsufficientCreditError extends AppError {
  constructor(message: string = 'Credito residuo non sufficiente per completare la richiesta.') {
    super(message, 400);
  }
}
