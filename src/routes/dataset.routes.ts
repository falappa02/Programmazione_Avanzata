import { Router } from 'express';
import { datasetController } from '../controllers/dataset.controller';
import { contentController } from '../controllers/content.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { uploadMiddleware } from '../middlewares/upload.middleware';
import { validate } from '../middlewares/validation.middleware';
import { z } from 'zod';

const router = Router();

const createDatasetSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Il nome del dataset è obbligatorio'),
    tags: z.array(z.string()).optional(),
  }),
});

const updateDatasetSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID dataset non valido'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

router.use(authMiddleware);

// [U] Crea Dataset
router.post('/', validate(createDatasetSchema), (req, res, next) => datasetController.create(req, res, next));

// [U] Get Lista Dataset
router.get('/', (req, res, next) => datasetController.list(req, res, next));

// [U] Aggiorna Dataset
router.put('/:id', validate(updateDatasetSchema), (req, res, next) => datasetController.update(req, res, next));

// [U] Cancella Dataset
router.delete('/:id', (req, res, next) => datasetController.delete(req, res, next));

// [U] Upload Content (Immagine o Video) al Dataset
router.post('/:id/content', uploadMiddleware.single('file'), (req, res, next) =>
  contentController.uploadContent(req, res, next)
);

export default router;
