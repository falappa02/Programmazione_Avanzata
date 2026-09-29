import { Dataset, Content, User } from '../models';
import { CostStrategyFactory } from '../strategies/cost.strategy';
import { getMediaMetadata } from '../utils/media.utils';
import { NotFoundError } from '../errors/NotFoundError';
import { InsufficientCreditError } from '../errors/InsufficientCreditError';
import { BadRequestError } from '../errors/BadRequestError';
import path from 'path';
import fs from 'fs';

export class ContentService {
  /**
   * Upload image or video content to a specific dataset.
   * Calculates cost via CostStrategy, checks user token balance, deducts tokens, and saves content.
   */
  public async addContentToDataset(
    userId: string,
    datasetId: string,
    file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestError('Nessun file caricato.');
    }

    const dataset = await Dataset.findOne({
      where: { id: datasetId, userId, isDeleted: false },
    });

    if (!dataset) {
      // Clean up uploaded temp file if dataset is not found
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new NotFoundError('Dataset non trovato o eliminato.');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const type: 'image' | 'video' = ['.mp4'].includes(ext) ? 'video' : 'image';

    // Inspect media metadata (file size in KB, frame count for video)
    const mediaMeta = await getMediaMetadata(file.path, type);

    // Calculate token cost using Strategy Pattern
    const costStrategy = CostStrategyFactory.getStrategy(type);
    const tokenCost = costStrategy.calculateUploadCost(mediaMeta.fileSizeKb, mediaMeta.frameCount);

    // Fetch user and check credit
    const user = await User.findByPk(userId);
    if (!user) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new NotFoundError('Utente non trovato.');
    }

    if (user.tokens < tokenCost) {
      // Clean up file if tokens are insufficient
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new InsufficientCreditError(
        `Credito insufficiente per il caricamento del file (${type}). Costo richiesto: ${tokenCost} token. Credito disponibile: ${user.tokens} token.`
      );
    }

    // Deduct user token credit
    user.tokens = Math.round((user.tokens - tokenCost) * 100) / 100;
    await user.save();

    // Create content record
    const content = await Content.create({
      datasetId: dataset.id,
      type,
      filePath: file.path,
      originalName: file.originalname,
      fileSizeKb: mediaMeta.fileSizeKb,
      frameCount: mediaMeta.frameCount,
      tokenCost,
    });

    return {
      content,
      tokensDeducted: tokenCost,
      remainingTokens: user.tokens,
    };
  }
}

export const contentService = new ContentService();
