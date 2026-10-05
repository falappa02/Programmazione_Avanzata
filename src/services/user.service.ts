import { User } from '../models/User';
import { NotFoundError } from '../errors/NotFoundError';
import { BadRequestError } from '../errors/BadRequestError';

export class UserService {
  //Get credito
  public async getUserCredit(userId: string) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('Utente non trovato.');
    }
    return {
      userId: user.id,
      email: user.email,
      tokens: user.tokens,
    };
  }

  //Ricarica Admin tramite mail
  public async rechargeUserCreditByEmail(email: string, newCredit: number) {
    if (newCredit < 0) {
      throw new BadRequestError('Il credito ricaricato deve essere un valore positivo.');
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundError(`Nessun utente trovato con email '${email}'.`);
    }

    user.tokens = Math.round(newCredit * 100) / 100;
    await user.save();

    return {
      userId: user.id,
      email: user.email,
      newTokensBalance: user.tokens,
    };
  }
}

export const userService = new UserService();
