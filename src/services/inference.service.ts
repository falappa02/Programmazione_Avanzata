import fs from 'fs';
import path from 'path';
import { Processing, Dataset, Content, User } from '../models';
import { CostStrategyFactory } from '../strategies/cost.strategy';
import { inferenceQueue } from '../queue/inference.queue';
import { createSideBySideFrameImage } from '../utils/imageCombiner';
import { NotFoundError } from '../errors/NotFoundError';
import { InsufficientCreditError } from '../errors/InsufficientCreditError';
import { BadRequestError } from '../errors/BadRequestError';
import {
  DEFAULT_MODEL_ID,
  SUPPORTED_MODEL_IDS,
  getAllSupportedModels,
  isValidModelId,
} from '../config/models';

export class InferenceService {
  /**
   * Get list of supported YOLO models and configuration metadata.
   */
  public getAvailableModels() {
    return {
      defaultModel: DEFAULT_MODEL_ID,
      totalModels: SUPPORTED_MODEL_IDS.length,
      supportedModels: getAllSupportedModels(),
    };
  }

  /**
   * Trigger ML Inference on a specific dataset.
   * Calculates total required tokens (4 tokens/image, 1.75 tokens/frame video).
   * Verifies credit priori. Aborts priori if credit is insufficient.
   */
  public async triggerInference(userId: string, datasetId: string, modelId: string = DEFAULT_MODEL_ID) {
    if (!isValidModelId(modelId)) {
      throw new BadRequestError(
        `Modello '${modelId}' non supportato. Modelli YOLO ammessi: ${SUPPORTED_MODEL_IDS.join(', ')}`
      );
    }

    const dataset = await Dataset.findOne({
      where: { id: datasetId, userId, isDeleted: false },
      include: [{ model: Content, as: 'contents' }],
    });

    if (!dataset) {
      throw new NotFoundError('Dataset non trovato o eliminato.');
    }

    const contents = (dataset as any).contents as Content[];
    if (!contents || contents.length === 0) {
      throw new BadRequestError('Impossibile avviare l\'inferenza: il dataset è vuoto.');
    }

    // Calculate total required inference token cost
    let totalInferenceCost = 0;
    for (const item of contents) {
      const strategy = CostStrategyFactory.getStrategy(item.type);
      const count = item.type === 'video' ? item.frameCount : 1;
      totalInferenceCost += strategy.calculateInferenceCost(count);
    }

    totalInferenceCost = Math.round(totalInferenceCost * 100) / 100;

    // Check user token balance
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('Utente non trovato.');
    }

    // Priori Credit Check: Abort priori if balance is insufficient
    if (user.tokens < totalInferenceCost) {
      // Create an ABORTED processing record for audit
      const abortedProcessing = await Processing.create({
        datasetId,
        userId,
        modelId,
        status: 'ABORTED',
        totalCost: totalInferenceCost,
        errorType: 'INSUFFICIENT_CREDIT',
        errorDetails: `Credito token insufficiente per l'inferenza (${totalInferenceCost} token richiesti, ${user.tokens} disponibili). Processamento annullato apriori.`,
      });

      throw new InsufficientCreditError(
        `Credito token non sufficiente per l'inferenza. Costo richiesto: ${totalInferenceCost} token, credito disponibile: ${user.tokens}. ID Processamento annullato: ${abortedProcessing.id}`
      );
    }

    // Deduct user tokens
    user.tokens = Math.round((user.tokens - totalInferenceCost) * 100) / 100;
    await user.save();

    // Create PENDING processing job record
    const processing = await Processing.create({
      datasetId,
      userId,
      modelId,
      status: 'PENDING',
      totalCost: totalInferenceCost,
    });

    // Enqueue job in Bull Queue for background execution
    try {
      await inferenceQueue.add({
        processingId: processing.id,
        datasetId,
        modelId,
        userId,
      });
    } catch (queueErr) {
      console.warn('[BULL QUEUE WARNING] Queue enqueue failed (Redis connection may be offline). Job record created.', queueErr);
    }

    return {
      processingId: processing.id,
      status: processing.status,
      totalCost: totalInferenceCost,
      remainingTokens: user.tokens,
    };
  }

  /**
   * Get processing status and result JSON if COMPLETED.
   */
  public async getProcessingStatus(userId: string, processingId: string) {
    const processing = await Processing.findOne({
      where: { id: processingId, userId },
    });

    if (!processing) {
      throw new NotFoundError(`Processamento non trovato con id '${processingId}'.`);
    }

    const response: any = {
      processingId: processing.id,
      datasetId: processing.datasetId,
      modelId: processing.modelId,
      status: processing.status,
      totalCost: processing.totalCost,
      createdAt: processing.createdAt,
      updatedAt: processing.updatedAt,
    };

    if (processing.status === 'FAILED') {
      response.error = {
        type: processing.errorType,
        details: processing.errorDetails,
      };
    } else if (processing.status === 'ABORTED') {
      response.error = {
        type: processing.errorType,
        details: processing.errorDetails,
      };
    } else if (processing.status === 'COMPLETED') {
      response.result = processing.resultJson;
    }

    return response;
  }

  /**
   * Generate split/side-by-side visualization frame (left original, right annotated with bboxes & classes).
   */
  public async getFrameVisualization(userId: string, processingId: string, frameIndex: number = 0): Promise<Buffer> {
    const processing = await Processing.findOne({
      where: { id: processingId, userId },
    });

    if (!processing) {
      throw new NotFoundError(`Processamento con ID '${processingId}' non trovato.`);
    }

    if (processing.status !== 'COMPLETED') {
      throw new BadRequestError(`Il processamento è in stato '${processing.status}'. La visualizzazione dei frame è disponibile solo in stato 'COMPLETED'.`);
    }

    const result = processing.resultJson;
    if (!result || !result.detections || result.detections.length === 0) {
      throw new NotFoundError('Nessun risultato di rilevamento disponibile per questo processamento.');
    }

    const firstDetection = result.detections[0];
    const frames = firstDetection.frames || [];
    const frameData = frames.find((f: any) => f.frameIndex === frameIndex) || frames[0];

    if (!frameData) {
      throw new NotFoundError(`Frame index ${frameIndex} non trovato nei risultati.`);
    }

    const originalPath = frameData.originalPath;
    const annotatedPath = frameData.annotatedPath;
    const objects = frameData.objects || [];

    if (!originalPath || !fs.existsSync(originalPath)) {
      throw new NotFoundError(`Immagine originale del frame non trovata sul disco: ${originalPath}`);
    }

    const ext = path.extname(originalPath).toLowerCase();
    if (['.mp4', '.avi', '.mov', '.mkv'].includes(ext)) {
      throw new BadRequestError(
        `Il percorso registrato punta direttamente al file video (${ext}) anziché ad un fotogramma immagine estratto. Riavviare l'inferenza sul dataset per estrarre i singoli frame JPEG.`
      );
    }

    const imageBuffer = await createSideBySideFrameImage(originalPath, annotatedPath, objects);
    return imageBuffer;
  }
}

export const inferenceService = new InferenceService();
