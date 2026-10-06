import { Request, Response, NextFunction } from 'express';
import { contentService } from '../services/content.service';
import { HttpStatus } from '../enums';

export class ContentController {
  public async uploadContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id: datasetId } = req.params;
      const file = req.file;

      const result = await contentService.addContentToDataset(userId, datasetId, file!);
      res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Contenuto caricato con successo nel dataset.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const contentController = new ContentController();
