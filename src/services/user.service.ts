import { User } from '../models/User';
import { ErrorFactory } from '../errors';

export class UserService {
  //Get credito
  public async getUserCredit(userId: string) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw ErrorFactory.notFound('Utente', userId);
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
      throw ErrorFactory.badRequest('Il credito ricaricato deve essere un valore positivo.');
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw ErrorFactory.notFound('Utente con email', email);
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
