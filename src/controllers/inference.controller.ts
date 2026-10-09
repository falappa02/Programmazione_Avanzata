import { Request, Response, NextFunction } from 'express';
import { inferenceService } from '../services/inference.service';
import { HttpStatus } from '../enums';

export class InferenceController {
  /**
   * GET /inference/models
   * Restituisce il catalogo dei modelli YOLO supportati e le loro caratteristiche.
   */
  public async getAvailableModels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = inferenceService.getAvailableModels();
      res.status(HttpStatus.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /inference
   * Avvia il processamento asincrono. Risponde con 202 ACCEPTED (richiesta presa in carico ed accodata).
   * Usa il non-null assertion operator (!) su req.user! garantito dal middleware authMiddleware.
   */
  public async trigger(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { datasetId, modelId } = req.body;
      const result = await inferenceService.triggerInference(userId, datasetId, modelId);
      res.status(HttpStatus.ACCEPTED).json({
        success: true,
        message: 'Richiesta di inferenza presa in carico e accodata.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /inference/:id/status
   * Recupera lo stato di elaborazione (PENDING, RUNNING, COMPLETED, FAILED, ABORTED)
   * e il JSON dei risultati dettagliati se COMPLETED.
   */
  public async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const result = await inferenceService.getProcessingStatus(userId, id);
      res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /inference/:id/frame/:frameIndex
   * Restituisce il rendering grafico del frame side-by-side con bboxes (Content-Type: image/png).
   */
  public async getFrameVisualization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id, frameIndex } = req.params;
      const contentId = (req.query.contentId as string) || undefined;
      const frameIdx = parseInt(frameIndex, 10) || 0;

      const imageBuffer = await inferenceService.getFrameVisualization(userId, id, frameIdx, contentId);
      res.setHeader('Content-Type', 'image/png');
      res.status(HttpStatus.OK).send(imageBuffer);
    } catch (error) {
      next(error);
    }
  }
}

export const inferenceController = new InferenceController();
