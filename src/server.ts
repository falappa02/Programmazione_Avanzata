import app from './app';
import { config } from './config/env';
import { sequelize } from './config/database';
import { getRsaKeys } from './config/keys';
import './queue/inference.worker'; // Importa e registra il worker asincrono di Bull Queue

/**
 * Connessione resiliente a PostgreSQL con meccanismo di Retry.
 * Risolve la problematica discussa all'orale: anche con depends_on in Docker,
 * il database potrebbe richiedere qualche istante per accettare socket.
 * Questa funzione ritenta la connessione fino a maxRetries volte.
 */
async function connectWithRetry(maxRetries = 10, delayMs = 3000) {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      console.log(`[DATABASE] Connessione e sincronizzazione modelli (Tentativo ${i}/${maxRetries})...`);
      await sequelize.authenticate();
      await sequelize.sync({ alter: true });
      console.log('[DATABASE] Database PostgreSQL connesso e sincronizzato con successo.');
      return;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[DATABASE WARNING] Tentativo ${i} fallito (${errMsg}). Nuovo tentativo tra ${delayMs / 1000}s...`);
      if (i === maxRetries) throw err;
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
}

/**
 * Funzione principale di avvio (Bootstrap) del server.
 */
async function bootstrap() {
  try {
    // 1. Verifica/generazione chiavi RSA asimmetriche per firma JWT RS256
    getRsaKeys();

    // 2. Connessione e sincronizzazione del Database con retry
    await connectWithRetry();

    // 3. Avvio del server HTTP Express in ascolto sulla porta configurata
    const server = app.listen(config.port, () => {
      console.log(`=======================================================`);
      console.log(` Server in ascolto su: http://localhost:${config.port}`);
      console.log(` Ambiente: ${config.nodeEnv}`);
      console.log(`=======================================================`);
    });

    return server;
  } catch (error) {
    console.error('Errore irreversibile durante l\'avvio del server:', error);
    process.exit(1);
  }
}

// Avvia il server solo in modalità normale (evita avvio duplicato durante i test Jest)
if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}
