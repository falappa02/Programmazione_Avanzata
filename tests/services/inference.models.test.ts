import {
  SUPPORTED_MODELS,
  SUPPORTED_MODEL_IDS,
  DEFAULT_MODEL_ID,
  isValidModelId,
  getModelById,
  getAllSupportedModels,
} from '../../src/config/models';
import { inferenceService } from '../../src/services/inference.service';
import { BadRequestError } from '../../src/errors/BadRequestError';
import { inferenceQueue } from '../../src/queue/inference.queue';

describe('YOLO Models Configuration & Inference Service', () => {
  afterAll(async () => {
    await inferenceQueue.close();
  });
  describe('YOLO Models Catalog', () => {
    it('dovrebbe includere combinazioni di versioni v8 e v11 e taglie nano, small, medium', () => {
      const models = getAllSupportedModels();
      expect(models.length).toBeGreaterThanOrEqual(6);

      const versions = new Set(models.map((m) => m.version));
      expect(versions.has('v8')).toBe(true);
      expect(versions.has('v11')).toBe(true);

      const sizes = new Set(models.map((m) => m.size));
      expect(sizes.has('nano')).toBe(true);
      expect(sizes.has('small')).toBe(true);
      expect(sizes.has('medium')).toBe(true);
    });

    it('dovrebbe validare correttamente i modelId ammessi', () => {
      expect(isValidModelId('yolov8n')).toBe(true);
      expect(isValidModelId('yolov8s')).toBe(true);
      expect(isValidModelId('yolov11n')).toBe(true);
      expect(isValidModelId('yolov11s')).toBe(true);

      expect(isValidModelId('resnet50')).toBe(false);
      expect(isValidModelId('yolo_fake')).toBe(false);
      expect(isValidModelId('')).toBe(false);
    });

    it('dovrebbe recuperare i metadati di uno specifico modello tramite getModelById', () => {
      const model = getModelById('yolov8s');
      expect(model).toBeDefined();
      expect(model?.name).toBe('YOLOv8 Small');
      expect(model?.version).toBe('v8');
      expect(model?.size).toBe('small');
      expect(model?.parameters).toBeDefined();

      const nonExistent = getModelById('non_existent');
      expect(nonExistent).toBeUndefined();
    });

    it('dovrebbe avere yolov11n come modello predefinito', () => {
      expect(DEFAULT_MODEL_ID).toBe('yolov11n');
      const defaultModel = getModelById(DEFAULT_MODEL_ID);
      expect(defaultModel).toBeDefined();
      expect(defaultModel?.isDefault).toBe(true);
    });
  });

  describe('InferenceService: getAvailableModels & triggerInference validation', () => {
    it('getAvailableModels dovrebbe restituire la lista completa e il default', () => {
      const result = inferenceService.getAvailableModels();
      expect(result.defaultModel).toBe('yolov11n');
      expect(result.totalModels).toBe(SUPPORTED_MODEL_IDS.length);
      expect(Array.isArray(result.supportedModels)).toBe(true);
      expect(result.supportedModels.length).toBe(SUPPORTED_MODEL_IDS.length);
    });

    it('triggerInference dovrebbe lanciare BadRequestError se il modelId non è supportato', async () => {
      await expect(
        inferenceService.triggerInference('user-123', 'dataset-123', 'unsupported_model')
      ).rejects.toThrow(BadRequestError);
    });
  });
});
