import fs from 'fs';
import path from 'path';
import { Processing, Dataset, Content, User } from '../models';
import { CostStrategyFactory } from '../strategies/cost.strategy';
import { inferenceQueue } from '../queue/inference.queue';
import { createSideBySideFrameImage } from '../utils/imageCombiner';
import { ErrorFactory } from '../errors';
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
   * Aziona ML sul dataset
   * Calcola i token (4 token/immagine, 1.75 token/frame video).
   * Verifica i crediti e abortisce se non sono abbastanza
   */
  public async triggerInference(userId: string, datasetId: string, modelId: string = DEFAULT_MODEL_ID) {
    if (!isValidModelId(modelId)) {
      throw ErrorFactory.badRequest(
        `Modello '${modelId}' non supportato. Modelli YOLO ammessi: ${SUPPORTED_MODEL_IDS.join(', ')}`
      );
    }

    const dataset = await Dataset.findOne({
      where: { id: datasetId, userId, isDeleted: false },
      include: [{ model: Content, as: 'contents' }],
    });

    if (!dataset) {
      throw ErrorFactory.notFound('Dataset', datasetId);
    }

    const contents = (dataset as any).contents as Content[];
    if (!contents || contents.length === 0) {
      throw ErrorFactory.badRequest('Impossibile avviare l\'inferenza: il dataset è vuoto.');
    }

    // Calcola il costo
    let totalInferenceCost = 0;
    for (const item of contents) {
      const strategy = CostStrategyFactory.getStrategy(item.type);
      const count = item.type === 'video' ? item.frameCount : 1;
      totalInferenceCost += strategy.calculateInferenceCost(count);
    }

    totalInferenceCost = Math.round(totalInferenceCost * 100) / 100;

    // Check user
    const user = await User.findByPk(userId);
    if (!user) {
      throw ErrorFactory.notFound('Utente', userId);
    }

    // Verifica i crediti e abortisce se non sono abbastanza
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

      throw ErrorFactory.insufficientCredit(totalInferenceCost, user.tokens);
    }

    // Toglie i crediti
    user.tokens = Math.round((user.tokens - totalInferenceCost) * 100) / 100;
    await user.save();

    
    const processing = await Processing.create({
      datasetId,
      userId,
      modelId,
      status: 'PENDING',
      totalCost: totalInferenceCost,
    });

    //Bull queue
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
      throw ErrorFactory.notFound('Processamento', processingId);
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
  public async getFrameVisualization(
    userId: string,
    processingId: string,
    frameIndex: number = 0,
    contentId?: string
  ): Promise<Buffer> {
    const processing = await Processing.findOne({
      where: { id: processingId, userId },
    });

    if (!processing) {
      throw ErrorFactory.notFound('Processamento', processingId);
    }

    if (processing.status !== 'COMPLETED') {
      throw ErrorFactory.badRequest(`Il processamento è in stato '${processing.status}'. La visualizzazione dei frame è disponibile solo in stato 'COMPLETED'.`);
    }

    const result = processing.resultJson;
    if (!result || !result.detections || result.detections.length === 0) {
      throw ErrorFactory.notFound('Nessun risultato di rilevamento disponibile per questo processamento.');
    }

    let frameData: any;

    if (contentId) {
      //Cerca direttamente il contenuto specifico tramite il suo contentId
      const targetDetection = result.detections.find((d: any) => d.contentId === contentId);
      if (!targetDetection) {
        throw ErrorFactory.notFound('Contenuto', contentId);
      }

      const frames = targetDetection.frames || [];
      if (frames.length === 0) {
        throw ErrorFactory.notFound(`Nessun frame disponibile per il contenuto '${contentId}'.`);
      }

      frameData = frames.find((f: any) => f.frameIndex === frameIndex) || frames[frameIndex] || frames[0];
    } else {
      //Se non viene passato contentId, indicizza sequenzialmente tutte le immagini e i frame del dataset
      const allFrames: any[] = [];
      for (const det of result.detections) {
        for (const f of det.frames || []) {
          allFrames.push({
            ...f,
            contentId: det.contentId,
            originalName: det.originalName,
          });
        }
      }

      if (allFrames.length === 0) {
        throw ErrorFactory.notFound('Nessun fotogramma o immagine disponibile nei risultati.');
      }

      // Prima cerca per corrispondenza esplicita su frameIndex, altrimenti usa l'indice posizionale
      const foundByFrameIndex = allFrames.find((f: any) => f.frameIndex === frameIndex);
      if (foundByFrameIndex) {
        frameData = foundByFrameIndex;
      } else if (frameIndex >= 0 && frameIndex < allFrames.length) {
        frameData = allFrames[frameIndex];
      } else {
        throw ErrorFactory.notFound(
          `Indice frame/immagine ${frameIndex} non trovato. Questo dataset contiene ${allFrames.length} frame/immagini elaborate (indici validi da 0 a ${allFrames.length - 1}).`
        );
      }
    }

    const originalPath = frameData.originalPath;
    const annotatedPath = frameData.annotatedPath;
    const objects = frameData.objects || [];

    if (!originalPath || !fs.existsSync(originalPath)) {
      throw ErrorFactory.notFound(`Immagine originale del frame non trovata sul disco: ${originalPath}`);
    }

    const ext = path.extname(originalPath).toLowerCase();
    if (['.mp4', '.avi', '.mov', '.mkv'].includes(ext)) {
      throw ErrorFactory.badRequest(
        `Il percorso registrato punta direttamente al file video (${ext}) anziché ad un fotogramma immagine estratto. Riavviare l'inferenza sul dataset per estrarre i singoli frame JPEG.`
      );
    }

    const imageBuffer = await createSideBySideFrameImage(originalPath, annotatedPath, objects);
    return imageBuffer;
  }
}

export const inferenceService = new InferenceService();
