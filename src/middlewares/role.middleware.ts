import { Request, Response, NextFunction } from 'express';
import { ErrorFactory } from '../errors';

/**
 * Middleware di Autorizzazione basata sui Ruoli (RBAC).
 * 
 * Differenza tra 401 e 403 (Domanda classica d'esame):
 * - 401 Unauthorized: l'utente non è autenticato o il token manca ("Non so chi sei").
 * - 403 Forbidden: l'utente è autenticato ma non ha i privilegi necessari ("So chi sei, ma non puoi accedere").
 */
export function requireRole(role: 'admin' | 'user') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ErrorFactory.unauthorized('Utente non autenticato.'));
    }

    if (req.user.role !== role) {
      return next(ErrorFactory.forbidden(`Operazione riservata agli utenti con ruolo: ${role}.`));
    }

    next();
  };
}
