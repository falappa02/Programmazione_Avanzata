
export interface ICostStrategy {
  calculateUploadCost(fileSizeKb: number, frameCount: number): number;
  calculateInferenceCost(count: number): number;
}

/**
 * Costo fisso di upload (0.25 token) e costo fisso di inferenza (4.0 token per immagine).
 */
export class ImageCostStrategy implements ICostStrategy {
  private readonly UPLOAD_COST_PER_IMAGE = 0.25;
  private readonly INFERENCE_COST_PER_IMAGE = 4.0;

  calculateUploadCost(fileSizeKb: number, frameCount: number = 1): number {
    return this.UPLOAD_COST_PER_IMAGE;
  }

  calculateInferenceCost(count: number = 1): number {
    return this.INFERENCE_COST_PER_IMAGE * count;
  }
}

/**
 * Costo variabile per KB caricato (0.08 token/KB) e costo per singolo fotogramma estratto (1.75 token/frame).
 */
export class VideoCostStrategy implements ICostStrategy {
  private readonly UPLOAD_COST_PER_KB = 0.08;
  private readonly INFERENCE_COST_PER_FRAME = 1.75;

  calculateUploadCost(fileSizeKb: number, frameCount: number = 1): number {
    return Math.round(fileSizeKb * this.UPLOAD_COST_PER_KB * 100) / 100;
  }

  calculateInferenceCost(frameCount: number = 1): number {
    return Math.round(frameCount * this.INFERENCE_COST_PER_FRAME * 100) / 100;
  }
}

/**
 * Factory Method per ottenere la corretta Strategy in base al tipo di file.
 */
export class CostStrategyFactory {
  public static getStrategy(type: 'image' | 'video'): ICostStrategy {
    if (type === 'image') {
      return new ImageCostStrategy();
    } else if (type === 'video') {
      return new VideoCostStrategy();
    }
    throw new Error(`Tipo di contenuto non supportato per il calcolo costi: ${type}`);
  }
}
