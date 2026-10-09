import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { inferenceQueue, InferenceJobData } from './inference.queue';
import { Processing, Content } from '../models';
import { config } from '../config/env';
import { IInferenceResult } from '../types';

/**
 * Bull Queue Worker: Processes ML Inference Jobs asynchronously.
 */
inferenceQueue.process(async (job) => {
  const { processingId, datasetId, modelId } = job.data;
  console.log(`[BULL WORKER] Starting inference job for processingId: ${processingId}`);

  const processing = await Processing.findByPk(processingId);
  if (!processing) {
    throw new Error(`Record Processing non trovato per id: ${processingId}`);
  }

  // Update status to RUNNING
  processing.status = 'RUNNING';
  await processing.save();

  try {
    const contents = await Content.findAll({ where: { datasetId } });
    if (contents.length === 0) {
      processing.status = 'FAILED';
      processing.errorType = 'EMPTY_DATASET';
      processing.errorDetails = 'Impossibile eseguire inferenza su un dataset privo di contenuti.';
      await processing.save();
      return;
    }

    const outputFolder = path.resolve(process.cwd(), 'outputs', processingId);
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const contentsJson = JSON.stringify(
      contents.map((c) => ({
        id: c.id,
        filePath: c.filePath,
        type: c.type,
        originalName: c.originalName,
        fileSizeKb: c.fileSizeKb,
        frameCount: c.frameCount,
      }))
    );

    const scriptPath = path.resolve(process.cwd(), 'src', 'scripts', 'infer_yolo.py');

    // Run Python inference script
    const resultJson: IInferenceResult = await new Promise((resolve, reject) => {
      execFile(
        config.pythonPath,
        [scriptPath, '--contents', contentsJson, '--output_dir', outputFolder, '--model', modelId],
        { maxBuffer: 10 * 1024 * 1024, timeout: 120000 },
        (error, stdout, stderr) => {
          if (error) {
            console.error('[PYTHON ERROR]', stderr || error.message);
            return reject(new Error(stderr || error.message));
          }
          try {
            const jsonStart = stdout.indexOf('{');
            const jsonEnd = stdout.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
              const jsonStr = stdout.substring(jsonStart, jsonEnd + 1);
              return resolve(JSON.parse(jsonStr));
            }
            const parsed = JSON.parse(stdout.trim());
            resolve(parsed);
          } catch (parseErr) {
            reject(new Error(`Errore durante il parsing del JSON ritornato da Python: ${stdout}`));
          }
        }
      );
    });

    // Mark as COMPLETED and store result
    processing.status = 'COMPLETED';
    processing.resultJson = resultJson;
    processing.outputFolderPath = outputFolder;
    await processing.save();

    console.log(`[BULL WORKER] Successfully completed processingId: ${processingId}`);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`[BULL WORKER FAILED] ProcessingId: ${processingId}`, error);
    processing.status = 'FAILED';
    processing.errorType = error.name || 'INFERENCE_EXECUTION_ERROR';
    processing.errorDetails = error.message || 'Errore imprevisto durante l\'esecuzione dell\'inferenza ML.';
    await processing.save();
  }
});
