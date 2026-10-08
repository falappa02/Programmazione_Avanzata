import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { getRsaKeys } from '../config/keys';
import { config } from '../config/env';
import { ErrorFactory } from '../errors';

export class AuthService {
  //Registra utente con credito 1000
  public async register(email: string, password: string, role: 'admin' | 'user' = 'user', initialTokens: number = 1000.0) {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw ErrorFactory.badRequest(`Utente con email '${email}' già registrato.`);
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

  //Login dell'utente
  public async login(email: string, password: string) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw ErrorFactory.unauthorized('Credenziali non valide (email o password errate).');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw ErrorFactory.unauthorized('Credenziali non valide (email o password errate).');
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

  //Genera token privato
  private generateJwtToken(user: User): string {
    const { privateKey } = getRsaKeys();

    
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
