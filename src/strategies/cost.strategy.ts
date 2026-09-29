/**
 * Strategy Pattern: Cost Calculation Strategy Interface and Concrete Implementations
 */

export interface ICostStrategy {
  calculateUploadCost(fileSizeKb: number, frameCount: number): number;
  calculateInferenceCost(count: number): number;
}

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
