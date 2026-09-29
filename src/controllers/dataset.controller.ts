import { Request, Response, NextFunction } from 'express';
import { datasetService } from '../services/dataset.service';

export class DatasetController {
  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { name, tags } = req.body;
      const dataset = await datasetService.createDataset(userId, name, tags);
      res.status(201).json({
        success: true,
        message: 'Dataset creato con successo.',
        data: dataset,
      });
    } catch (error) {
      next(error);
    }
  }

  public async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const datasets = await datasetService.getUserDatasets(userId);
      res.status(200).json({
        success: true,
        data: datasets,
      });
    } catch (error) {
      next(error);
    }
  }

  public async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { name, tags } = req.body;
      const updated = await datasetService.updateDataset(userId, id, name, tags);
      res.status(200).json({
        success: true,
        message: 'Dataset aggiornato con successo.',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const result = await datasetService.deleteDataset(userId, id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const datasetController = new DatasetController();
