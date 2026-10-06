import { AppError } from './AppError';
import { HttpStatus } from '../enums';

export class ForbiddenError extends AppError {
  constructor(message: string = 'Accesso negato. Permessi insufficienti per questa operazione.') {
    super(message, HttpStatus.FORBIDDEN);
  }
}
