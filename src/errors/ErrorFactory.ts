import { AppError } from './AppError';
import { BadRequestError } from './BadRequestError';
import { NotFoundError } from './NotFoundError';
import { InsufficientCreditError } from './InsufficientCreditError';
import { UnauthorizedError } from './UnauthorizedError';
import { ForbiddenError } from './ForbiddenError';

/**
 * Design Pattern: Factory Method (ErrorFactory)
 * Centralizza la creazione tipizzata delle eccezioni applicative.
 * Evita l'accoppiamento diretto ('new ErrorClass(...)') nei vari layer
 * del software e garantisce conformità con l'Open/Closed Principle.
 */
export class ErrorFactory {
  /**
   * Crea un'eccezione 400 Bad Request
   */
  public static badRequest(message: string = 'Richiesta non valida.', details: unknown = null): BadRequestError {
    return new BadRequestError(message, details);
  }

  /**
   * Crea un'eccezione 404 Not Found per una risorsa specifica o generica
   */
  public static notFound(resource: string = 'Risorsa', identifier?: string): NotFoundError {
    const msg = identifier
      ? `${resource} non trovato/a con ID '${identifier}'.`
      : `${resource} non trovato/a.`;
    return new NotFoundError(msg);
  }

  /**
   * Crea un'eccezione 401 Unauthorized
   */
  public static unauthorized(message: string = 'Accesso non autorizzato o token non valido.'): UnauthorizedError {
    return new UnauthorizedError(message);
  }

  /**
   * Crea un'eccezione 403 Forbidden
   */
  public static forbidden(message: string = 'Accesso negato. Permessi insufficienti.'): ForbiddenError {
    return new ForbiddenError(message);
  }

  /**
   * Crea un'eccezione specifica 400 InsufficientCreditError
   */
  public static insufficientCredit(required: number, available: number): InsufficientCreditError {
    return new InsufficientCreditError(
      `Credito token insufficiente. Richiesti: ${required}, disponibili: ${available}.`
    );
  }

  /**
   * Crea un'eccezione generica 500 Internal Server Error
   */
  public static internal(message: string = 'Errore interno del server.', details: unknown = null): AppError {
    return new AppError(message, 500, details);
  }
}
