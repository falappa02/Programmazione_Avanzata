import { Dataset, Content, User } from '../models';
import { CostStrategyFactory } from '../strategies/cost.strategy';
import { getMediaMetadata } from '../utils/media.utils';
import { ErrorFactory } from '../errors';
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
      throw ErrorFactory.badRequest('Nessun file caricato.');
    }

    const dataset = await Dataset.findOne({
      where: { id: datasetId, userId, isDeleted: false },
    });

    if (!dataset) {
      // Clean up uploaded temp file if dataset is not found
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw ErrorFactory.notFound('Dataset', datasetId);
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
      throw ErrorFactory.notFound('Utente', userId);
    }

    if (user.tokens < tokenCost) {
      // Clean up file if tokens are insufficient
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw ErrorFactory.insufficientCredit(tokenCost, user.tokens);
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
