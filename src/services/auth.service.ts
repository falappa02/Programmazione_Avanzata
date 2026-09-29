import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { getRsaKeys } from '../config/keys';
import { config } from '../config/env';
import { BadRequestError } from '../errors/BadRequestError';
import { UnauthorizedError } from '../errors/UnauthorizedError';

export class AuthService {
  /**
   * Register a new user with initial seed token credit.
   */
  public async register(email: string, password: string, role: 'admin' | 'user' = 'user', initialTokens: number = 1000.0) {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw new BadRequestError(`Utente con email '${email}' già registrato.`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      role,
      tokens: initialTokens,
    });

    const token = this.generateJwtToken(user);
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tokens: user.tokens,
      },
      token,
    };
  }

  /**
   * Login user and issue RS256 signed JWT token containing essential metadata.
   */
  public async login(email: string, password: string) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedError('Credenziali non valide (email o password errate).');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('Credenziali non valide (email o password errate).');
    }

    const token = this.generateJwtToken(user);
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tokens: user.tokens,
      },
      token,
    };
  }

  /**
   * Helper: Generate RS256 JWT Token containing essential metadata only.
   */
  private generateJwtToken(user: User): string {
    const { privateKey } = getRsaKeys();

    // Payload contains ONLY essential user metadata: id, email, role
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, privateKey, {
      algorithm: config.jwt.algorithm,
      expiresIn: config.jwt.expiresIn as any,
    });
  }
}

export const authService = new AuthService();
