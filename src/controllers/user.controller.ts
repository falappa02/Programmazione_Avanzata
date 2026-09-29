import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';

export class UserController {
  public async getCredit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const creditInfo = await userService.getUserCredit(userId);
      res.status(200).json({
        success: true,
        data: creditInfo,
      });
    } catch (error) {
      next(error);
    }
  }

  public async rechargeCredit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, credit } = req.body;
      const result = await userService.rechargeUserCreditByEmail(email, parseFloat(credit));
      res.status(200).json({
        success: true,
        message: `Ricarica effettuata con successo per ${email}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
