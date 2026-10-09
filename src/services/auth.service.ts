import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { getRsaKeys } from '../config/keys';
import { config } from '../config/env';
import { ErrorFactory } from '../errors';

export class AuthService {
  /**
   * Registrazione nuovo utente:
   * - Verifica unicità dell'indirizzo email.
   * - Hashing della password tramite bcrypt con salt round = 10 (protezione contro attacchi rainbow table).
   * - Assegnazione del credito iniziale (default 1000.0 token).
   * - Generazione del token JWT RS256 asimmetrico.
   */
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

  /**
   * Autenticazione (Login) dell'utente:
   * - Ricerca dell'utente tramite email.
   * - Confronto sicuro della password tramite bcrypt.compare (immune da timing attacks).
   * - Rilascio del token JWT firmato con chiave privata RSA.
   */
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

  /**
   * Generazione Token JWT con Crittografia Asimmetrica (Algoritmo RS256).
   * Il token viene firmato esclusivamente con la chiave privata del server.
   * Qualsiasi client o servizio ricevente potrà verificarne la firma con la sola chiave pubblica.
   */
  private generateJwtToken(user: User): string {
    const { privateKey } = getRsaKeys();

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, privateKey, {
      algorithm: config.jwt.algorithm,
      expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    });
  }
}

export const authService = new AuthService();
