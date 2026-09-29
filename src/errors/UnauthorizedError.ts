import { AppError } from './AppError';

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Accesso non autorizzato. Token JWT non valido o mancante.') {
    super(message, 401);
  }
}
