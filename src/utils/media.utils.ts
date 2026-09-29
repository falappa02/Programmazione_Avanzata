import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { config } from '../config/env';

export interface MediaMetadata {
  fileSizeKb: number;
  frameCount: number;
}

/**
 * Utility to inspect media file metadata (size in KB and frame count for videos).
 */
export async function getMediaMetadata(filePath: string, type: 'image' | 'video'): Promise<MediaMetadata> {
  const stats = fs.statSync(filePath);
  const fileSizeKb = Math.round((stats.size / 1024) * 100) / 100;

  if (type === 'image') {
    return { fileSizeKb, frameCount: 1 };
  }

  // For video, count frames using python (cv2 / ultralytics / ffprobe helper if available)
  return new Promise((resolve) => {
    const pythonCode = `
import cv2, sys, json
try:
    cap = cv2.VideoCapture(sys.argv[1])
    frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()
    if frames <= 0: frames = 30
    print(json.dumps({'frameCount': frames}))
except Exception as e:
    print(json.dumps({'frameCount': 30}))
`;
    execFile(
      config.pythonPath,
      ['-c', pythonCode, filePath],
      { timeout: 10000 },
      (error, stdout) => {
        if (error || !stdout) {
          // Fallback estimated frame count if opencv-python is not installed locally
          const estimatedFrames = Math.max(10, Math.round(fileSizeKb / 50));
          return resolve({ fileSizeKb, frameCount: estimatedFrames });
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          return resolve({ fileSizeKb, frameCount: parsed.frameCount || 30 });
        } catch {
          const estimatedFrames = Math.max(10, Math.round(fileSizeKb / 50));
          return resolve({ fileSizeKb, frameCount: estimatedFrames });
        }
      }
    );
  });
}
