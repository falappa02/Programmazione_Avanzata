import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/ForbiddenError';
import { UnauthorizedError } from '../errors/UnauthorizedError';

/**
 * Middleware: Role Authorization check (e.g. restricts route to 'admin' role).
 */
export function requireRole(role: 'admin' | 'user') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Utente non autenticato.'));
    }

    if (req.user.role !== role) {
      return next(new ForbiddenError(`Operazione riservata agli utenti con ruolo: ${role}.`));
    }

    next();
  };
}
