import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getRsaKeys } from '../config/keys';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import { User } from '../models/User';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
  tokens: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware: JWT Authentication using RS256 public key validation.
 * Ensures token validity and checks that user tokens are not exhausted (tokens > 0).
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token JWT non fornito. Inserire Header Authorization: Bearer <token>');
    }

    const token = authHeader.split(' ')[1];
    const { publicKey } = getRsaKeys();

    let decoded: any;
    try {
      decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    } catch (err: any) {
      throw new UnauthorizedError('Token JWT non valido o scaduto.');
    }

    // Verify user in Database and check remaining tokens
    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw new UnauthorizedError('Utente associato al token non trovato.');
    }

    // Requirement: "Nel caso di token terminati ogni richiesta da parte dello stesso utente deve restituire 401 Unauthorized."
    if (user.tokens <= 0) {
      throw new UnauthorizedError('Credito token terminato (0 token residui). Richiesta rifiutata (401 Unauthorized).');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tokens: user.tokens,
    };

    next();
  } catch (error) {
    next(error);
  }
}
