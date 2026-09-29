import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Route: [U] Get remaining user token credit
router.get('/credit', authMiddleware, (req, res, next) => userController.getCredit(req, res, next));

export default router;
