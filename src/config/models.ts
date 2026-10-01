export type YoloVersion = 'v8' | 'v11';
export type YoloSize = 'nano' | 'small' | 'medium';

export interface YoloModelInfo {
  id: string;
  name: string;
  version: YoloVersion;
  size: YoloSize;
  parameters: string;
  description: string;
  isDefault?: boolean;
}

export const SUPPORTED_MODELS: YoloModelInfo[] = [
  {
    id: 'yolov8n',
    name: 'YOLOv8 Nano',
    version: 'v8',
    size: 'nano',
    parameters: '3.2M',
    description: 'Modello ultra-leggero e veloce, ideale per CPU e dispositivi a basse risorse.',
  },
  {
    id: 'yolov8s',
    name: 'YOLOv8 Small',
    version: 'v8',
    size: 'small',
    parameters: '11.2M',
    description: 'Ottimo bilanciamento tra velocità di inferenza e accuratezza di rilevamento.',
  },
  {
    id: 'yolov8m',
    name: 'YOLOv8 Medium',
    version: 'v8',
    size: 'medium',
    parameters: '25.9M',
    description: 'Modello a media scala con elevata capacità di rilevamento di oggetti complessi.',
  },
  {
    id: 'yolov11n',
    name: 'YOLOv11 Nano',
    version: 'v11',
    size: 'nano',
    parameters: '2.6M',
    description: 'Nuova generazione YOLOv11 ultra-veloce, massima efficienza computazionale.',
    isDefault: true,
  },
  {
    id: 'yolov11s',
    name: 'YOLOv11 Small',
    version: 'v11',
    size: 'small',
    parameters: '9.4M',
    description: 'Architettura YOLOv11 bilanciata con precisione migliorata su dettagli e piccoli oggetti.',
  },
  {
    id: 'yolov11m',
    name: 'YOLOv11 Medium',
    version: 'v11',
    size: 'medium',
    parameters: '20.1M',
    description: 'Modello YOLOv11 ad alta accuratezza per scenari con elevata densità di oggetti.',
  },
];

export const SUPPORTED_MODEL_IDS = [
  'yolov8n',
  'yolov8s',
  'yolov8m',
  'yolov11n',
  'yolov11s',
  'yolov11m',
] as const;

export type SupportedModelId = (typeof SUPPORTED_MODEL_IDS)[number];

export const DEFAULT_MODEL_ID: SupportedModelId = 'yolov11n';

export function isValidModelId(id: string): id is SupportedModelId {
  return SUPPORTED_MODEL_IDS.includes(id as SupportedModelId);
}

export function getModelById(id: string): YoloModelInfo | undefined {
  return SUPPORTED_MODELS.find((m) => m.id === id);
}

export function getAllSupportedModels(): YoloModelInfo[] {
  return [...SUPPORTED_MODELS];
}
