import Queue from 'bull';
import { redisConfig } from '../config/redis';

export interface InferenceJobData {
  processingId: string;
  datasetId: string;
  modelId: string;
  userId: string;
}

// Instantiate Bull Queue with Redis configuration
export const inferenceQueue = new Queue<InferenceJobData>('yolo-inference-queue', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 2,
    backoff: 5000,
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});
