import { Dataset, Content, User } from '../models';
import { CostStrategyFactory } from '../strategies/cost.strategy';
import { getMediaMetadata } from '../utils/media.utils';
import { ErrorFactory } from '../errors';
import path from 'path';
import fs from 'fs';

export class ContentService {
  /**
   * Carica un file multimediale (immagine o video) all'interno di un dataset.
   * Flusso di esecuzione:
   * 1. Verifica esistenza e appartenenza del dataset all'utente.
   * 2. Estrazione metadati (dimensione in KB, numero di frame se video con ffprobe).
   * 3. Calcolo del costo in token tramite Strategy Pattern (ImageCostStrategy / VideoCostStrategy).
   * 4. Verifica disponibilità crediti (abort e cleanup file se insufficienti).
   * 5. Scalo dei token e salvataggio del record nel database.
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
      // Pulizia del file temporaneo su disco in caso di dataset inesistente
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw ErrorFactory.notFound('Dataset', datasetId);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const type: 'image' | 'video' = ['.mp4'].includes(ext) ? 'video' : 'image';

    // Ispezione metadati multimediali (peso in KB, conteggio frame per video)
    const mediaMeta = await getMediaMetadata(file.path, type);

    // Calcolo costo in token tramite Strategy Pattern
    const costStrategy = CostStrategyFactory.getStrategy(type);
    const tokenCost = costStrategy.calculateUploadCost(mediaMeta.fileSizeKb, mediaMeta.frameCount);

    // Controllo disponibilità token dell'utente
    const user = await User.findByPk(userId);
    if (!user) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw ErrorFactory.notFound('Utente', userId);
    }

    if (user.tokens < tokenCost) {
      // Rimozione file da disco se i token sono insufficienti per evitare accumulo di orfani
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw ErrorFactory.insufficientCredit(tokenCost, user.tokens);
    }

    // Scalo dei crediti token all'utente
    user.tokens = Math.round((user.tokens - tokenCost) * 100) / 100;
    await user.save();

    // Creazione del record Content associato al Dataset
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
