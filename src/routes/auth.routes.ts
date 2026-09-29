import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validation.middleware';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Email non valida'),
    password: z.string().min(6, 'La password deve contenere almeno 6 caratteri'),
    role: z.enum(['admin', 'user']).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email non valida'),
    password: z.string().min(1, 'Password richiesta'),
  }),
});

router.post('/register', validate(registerSchema), (req, res, next) => authController.register(req, res, next));
router.post('/login', validate(loginSchema), (req, res, next) => authController.login(req, res, next));

export default router;
