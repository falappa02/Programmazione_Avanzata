import { AppError } from './AppError';

export class BadRequestError extends AppError {
  constructor(message: string = 'Richiesta non valida.', details: any = null) {
    super(message, 400, details);
  }
}
