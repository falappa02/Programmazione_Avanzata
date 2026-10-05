import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validation.middleware';
import { z } from 'zod';

const router = Router();

const rechargeSchema = z.object({
  body: z.object({
    email: z.string().email('Email non valida'),
    credit: z.number().positive('Il credito deve essere un numero positivo'),
  }),
});

// Ricarica Token 
router.post(
  '/recharge',
  authMiddleware,
  requireRole('admin'),
  validate(rechargeSchema),
  (req, res, next) => userController.rechargeCredit(req, res, next)
);

export default router;
