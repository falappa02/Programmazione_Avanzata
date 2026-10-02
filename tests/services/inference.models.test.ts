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
import { NotFoundError } from '../../src/errors/NotFoundError';
import { Processing } from '../../src/models';
import * as imageCombiner from '../../src/utils/imageCombiner';
import fs from 'fs';

jest.mock('../../src/queue/inference.queue', () => ({
  inferenceQueue: {
    add: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('YOLO Models Configuration & Inference Service', () => {
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

  describe('InferenceService: getFrameVisualization multi-content & frame search', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('dovrebbe sollevare NotFoundError se il processamento non esiste', async () => {
      jest.spyOn(Processing, 'findOne').mockResolvedValue(null as any);

      await expect(
        inferenceService.getFrameVisualization('user-1', 'proc-missing', 0)
      ).rejects.toThrow(NotFoundError);
    });

    it('dovrebbe sollevare BadRequestError se il processamento non è COMPLETED', async () => {
      jest.spyOn(Processing, 'findOne').mockResolvedValue({
        id: 'proc-running',
        userId: 'user-1',
        status: 'RUNNING',
      } as any);

      await expect(
        inferenceService.getFrameVisualization('user-1', 'proc-running', 0)
      ).rejects.toThrow(BadRequestError);
    });

    it('dovrebbe trovare frameIndex specifico anche in contenuti successivi (es. video dopo immagine)', async () => {
      const mockResultJson = {
        detections: [
          {
            contentId: 'img-1',
            type: 'image',
            frames: [
              {
                frameIndex: 0,
                originalPath: '/mock/img0.jpg',
                annotatedPath: '/mock/ann0.jpg',
                objects: [],
              },
            ],
          },
          {
            contentId: 'vid-1',
            type: 'video',
            frames: [
              {
                frameIndex: 0,
                originalPath: '/mock/vid0.jpg',
                annotatedPath: '/mock/ann_vid0.jpg',
                objects: [],
              },
              {
                frameIndex: 5,
                originalPath: '/mock/vid5.jpg',
                annotatedPath: '/mock/ann_vid5.jpg',
                objects: [{ classId: 0, className: 'person', confidence: 0.95, bbox: [10, 10, 50, 50] }],
              },
            ],
          },
        ],
      };

      jest.spyOn(Processing, 'findOne').mockResolvedValue({
        id: 'proc-done',
        userId: 'user-1',
        status: 'COMPLETED',
        resultJson: mockResultJson,
      } as any);

      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const combinerSpy = jest
        .spyOn(imageCombiner, 'createSideBySideFrameImage')
        .mockResolvedValue(Buffer.from('fake-split-image'));

      const result = await inferenceService.getFrameVisualization('user-1', 'proc-done', 5);
      expect(result).toBeDefined();
      expect(combinerSpy).toHaveBeenCalledWith(
        '/mock/vid5.jpg',
        '/mock/ann_vid5.jpg',
        expect.arrayContaining([expect.objectContaining({ className: 'person' })])
      );
    });

    it('dovrebbe sollevare NotFoundError se frameIndex non è presente in nessuna detection', async () => {
      const mockResultJson = {
        detections: [
          {
            contentId: 'img-1',
            type: 'image',
            frames: [
              { frameIndex: 0, originalPath: '/mock/img0.jpg' },
            ],
          },
        ],
      };

      jest.spyOn(Processing, 'findOne').mockResolvedValue({
        id: 'proc-done',
        userId: 'user-1',
        status: 'COMPLETED',
        resultJson: mockResultJson,
      } as any);

      await expect(
        inferenceService.getFrameVisualization('user-1', 'proc-done', 99)
      ).rejects.toThrow(NotFoundError);
    });
  });
});

