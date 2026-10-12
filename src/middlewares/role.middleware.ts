import { Request, Response, NextFunction } from 'express';
import { ErrorFactory } from '../errors';

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
