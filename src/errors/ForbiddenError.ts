import { AppError } from './AppError';

export class ForbiddenError extends AppError {
  constructor(message: string = 'Accesso negato. Permessi insufficienti per questa operazione.') {
    super(message, 403);
  }
}
