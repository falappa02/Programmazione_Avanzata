import { Router } from 'express';
import { inferenceController } from '../controllers/inference.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { z } from 'zod';

const router = Router();

const triggerInferenceSchema = z.object({
  body: z.object({
    datasetId: z.string().uuid('ID dataset non valido'),
    modelId: z.string().optional().default('yolov11n'),
  }),
});

router.use(authMiddleware);

// [U] Trigger Inference on a Dataset
router.post('/', validate(triggerInferenceSchema), (req, res, next) =>
  inferenceController.trigger(req, res, next)
);

// [U] Get Processing Status & Results
router.get('/:id/status', (req, res, next) =>
  inferenceController.getStatus(req, res, next)
);

// [U] Get Side-by-Side Visual Frame Image
router.get('/:id/frame/:frameIndex', (req, res, next) =>
  inferenceController.getFrameVisualization(req, res, next)
);

export default router;
