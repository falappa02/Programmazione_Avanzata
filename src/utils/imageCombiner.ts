import sharp from 'sharp';
import fs from 'fs';

export interface BoundingBoxDetection {
  classId: number;
  className: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
}

/**
 * Utility to generate a side-by-side composite image:
 * Left: Original image frame
 * Right: Frame with drawn bounding boxes and class labels
 */
export async function createSideBySideFrameImage(
  originalImagePath: string,
  annotatedImagePath: string | null,
  detections: BoundingBoxDetection[] = []
): Promise<Buffer> {
  if (!fs.existsSync(originalImagePath)) {
    throw new Error(`Immagine originale non trovata: ${originalImagePath}`);
  }

  const originalMeta = await sharp(originalImagePath).metadata();
  const width = originalMeta.width || 640;
  const height = originalMeta.height || 480;

  // Prepare left image buffer
  const leftBuffer = await sharp(originalImagePath).resize(width, height).toBuffer();

  let rightBuffer: Buffer;

  if (annotatedImagePath && fs.existsSync(annotatedImagePath)) {
    rightBuffer = await sharp(annotatedImagePath).resize(width, height).toBuffer();
  } else {
    // Generate annotated image dynamically using SVG overlay if annotated image is not pre-saved
    const svgElements: string[] = [];

    detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.bbox;
      const boxWidth = x2 - x1;
      const boxHeight = y2 - y1;
      const labelText = `${det.className} ${Math.round(det.confidence * 100)}%`;

      svgElements.push(`
        <rect x="${x1}" y="${y1}" width="${boxWidth}" height="${boxHeight}" 
              style="fill:none;stroke:#00FF00;stroke-width:3;stroke-opacity:0.9" />
        <rect x="${x1}" y="${Math.max(0, y1 - 25)}" width="${labelText.length * 10 + 10}" height="22" 
              style="fill:#00FF00;fill-opacity:0.8" />
        <text x="${x1 + 5}" y="${Math.max(15, y1 - 8)}" 
              font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#000000">${labelText}</text>
      `);
    });

    const svgOverlay = `
      <svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg">
        ${svgElements.join('\n')}
      </svg>
    `;

    rightBuffer = await sharp(originalImagePath)
      .resize(width, height)
      .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
      .toBuffer();
  }

  // Combine Left and Right side-by-side (Total Width = width * 2)
  const compositeWidth = width * 2;
  const combinedBuffer = await sharp({
    create: {
      width: compositeWidth,
      height: height,
      channels: 3,
      background: { r: 30, g: 30, b: 30 },
    },
  })
    .composite([
      { input: leftBuffer, top: 0, left: 0 },
      { input: rightBuffer, top: 0, left: width },
    ])
    .png()
    .toBuffer();

  return combinedBuffer;
}
