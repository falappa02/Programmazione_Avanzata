import { ProcessingStatus } from '../models/Processing';

export interface IDetectedObject {
  classId: number;
  className: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface IInferenceFrame {
  frameIndex: number;
  originalPath: string;
  annotatedPath: string | null;
  objects: IDetectedObject[];
  contentId?: string;
  originalName?: string;
}

export interface IContentDetection {
  contentId: string;
  type: 'image' | 'video';
  originalName: string;
  frameCount: number;
  frames: IInferenceFrame[];
}

export interface IInferenceResult {
  modelUsed: string;
  totalContentsProcessed: number;
  detections: IContentDetection[];
}

export interface IProcessingStatusResponse {
  processingId: string;
  datasetId: string;
  modelId: string;
  status: ProcessingStatus;
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
  error?: {
    type: string | null;
    details: string | null;
  };
  result?: IInferenceResult | null;
}
