import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { inferenceQueue, InferenceJobData } from './inference.queue';
import { Processing, Content } from '../models';
import { config } from '../config/env';
import { IInferenceResult } from '../types';

/**
 * Bull Queue Worker (Pattern Observer / Job Queue)
 * Elabora i task di inferenza Machine Learning (YOLO) in modo completamente asincrono.
 * 
 * Perché è asincrono? (Domanda d'esame):
 * L'elaborazione di immagini e video è un'operazione pesante (CPU/GPU-bound).
 * Se venisse eseguita nella rotta HTTP, bloccherebbe l'Event Loop di Node.js.
 * Utilizzando una coda Redis con worker in background, l'API risponde subito (202 PENDING)
 * e il worker processa il lavoro in parallelo senza rallentare il server.
 */
inferenceQueue.process(async (job) => {
  const { processingId, datasetId, modelId } = job.data;
  console.log(`[BULL WORKER] Inizio elaborazione job per processingId: ${processingId}`);

  // 1. Recupero del record di processamento dal database
  const processing = await Processing.findByPk(processingId);
  if (!processing) {
    throw new Error(`Record Processing non trovato per id: ${processingId}`);
  }

  // 2. Transizione di stato: PENDING -> RUNNING
  processing.status = 'RUNNING';
  await processing.save();

  try {
    // 3. Recupero dei file (immagini/video) associati al dataset
    const contents = await Content.findAll({ where: { datasetId } });
    if (contents.length === 0) {
      processing.status = 'FAILED';
      processing.errorType = 'EMPTY_DATASET';
      processing.errorDetails = 'Impossibile eseguire inferenza su un dataset privo di contenuti.';
      await processing.save();
      return;
    }

    // 4. Creazione cartella di output per salvare le immagini con i bounding box disegnati
    const outputFolder = path.resolve(process.cwd(), 'outputs', processingId);
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    // Preparazione dei metadati dei contenuti da passare allo script Python
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

    // 5. Esecuzione del processo esterno Python per l'inferenza YOLO
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
            // Estrae la porzione JSON valida stampata da Python su stdout
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

    // 6. Transizione di stato: RUNNING -> COMPLETED e salvataggio risultato JSON
    processing.status = 'COMPLETED';
    processing.resultJson = resultJson;
    processing.outputFolderPath = outputFolder;
    await processing.save();

    console.log(`[BULL WORKER] Elaborazione completata con successo per processingId: ${processingId}`);
  } catch (err: unknown) {
    // 7. Gestione degli errori: RUNNING -> FAILED con dettagli diagnostici
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`[BULL WORKER FAILED] ProcessingId: ${processingId}`, error);
    processing.status = 'FAILED';
    processing.errorType = error.name || 'INFERENCE_EXECUTION_ERROR';
    processing.errorDetails = error.message || 'Errore imprevisto durante l\'esecuzione dell\'inferenza ML.';
    await processing.save();
  }
});
