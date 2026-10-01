import { Request, Response, NextFunction } from 'express';
import { inferenceService } from '../services/inference.service';

export class InferenceController {
  public async getAvailableModels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = inferenceService.getAvailableModels();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  public async trigger(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { datasetId, modelId } = req.body;
      const result = await inferenceService.triggerInference(userId, datasetId, modelId);
      res.status(202).json({
        success: true,
        message: 'Richiesta di inferenza presa in carico e accodata.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const result = await inferenceService.getProcessingStatus(userId, id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getFrameVisualization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id, frameIndex } = req.params;
      const frameIdx = parseInt(frameIndex, 10) || 0;

      const imageBuffer = await inferenceService.getFrameVisualization(userId, id, frameIdx);
      res.setHeader('Content-Type', 'image/png');
      res.status(200).send(imageBuffer);
    } catch (error) {
      next(error);
    }
  }
}

export const inferenceController = new InferenceController();
