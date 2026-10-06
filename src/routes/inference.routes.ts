import { Router } from 'express';
import { inferenceController } from '../controllers/inference.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { z } from 'zod';
import { DEFAULT_MODEL_ID, SUPPORTED_MODEL_IDS } from '../config/models';

const router = Router();

const triggerInferenceSchema = z.object({
  body: z.object({
    datasetId: z.string().uuid('ID dataset non valido'),
    modelId: z
      .enum(SUPPORTED_MODEL_IDS as unknown as [string, ...string[]], {
        errorMap: () => ({
          message: `Modello non supportato. Modelli YOLO ammessi: ${SUPPORTED_MODEL_IDS.join(', ')}`,
        }),
      })
      .optional()
      .default(DEFAULT_MODEL_ID),
  }),
});

// Get lista dei modelli di YOLO (consultabile anche prima dell'auth)
router.get('/models', (req, res, next) =>
  inferenceController.getAvailableModels(req, res, next)
);

router.use(authMiddleware);

//Trigger Inferenza sul Dataset
router.post('/', validate(triggerInferenceSchema), (req, res, next) =>
  inferenceController.trigger(req, res, next)
);

// Get stato del processo e risultato
router.get('/:id/status', (req, res, next) =>
  inferenceController.getStatus(req, res, next)
);

// Get immagine side by side
router.get('/:id/frame/:frameIndex', (req, res, next) =>
  inferenceController.getFrameVisualization(req, res, next)
);

export default router;
