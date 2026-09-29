import { AppError } from './AppError';

export class NotFoundError extends AppError {
  constructor(message: string = 'Risorsa richiesta non trovata.') {
    super(message, 404);
  }
}
