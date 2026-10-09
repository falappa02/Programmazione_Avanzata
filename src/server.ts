import app from './app';
import { config } from './config/env';
import { sequelize } from './config/database';
import { getRsaKeys } from './config/keys';
import './queue/inference.worker'; // Import worker listener

async function connectWithRetry(maxRetries = 10, delayMs = 3000) {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      console.log(`[DATABASE] Connecting and syncing database models (Attempt ${i}/${maxRetries})...`);
      await sequelize.authenticate();
      await sequelize.sync({ alter: true });
      console.log('[DATABASE] Database synchronized successfully.');
      return;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[DATABASE WARNING] Connection attempt ${i} failed (${errMsg}). Retrying in ${delayMs / 1000}s...`);
      if (i === maxRetries) throw err;
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
}

async function bootstrap() {
  try {
    // 1. Ensure RSA Keypair exists for JWT RS256
    getRsaKeys();

    // 2. Sync Database Schema with retries for container readiness
    await connectWithRetry();

    // 3. Start Express HTTP Server
    const server = app.listen(config.port, () => {
      console.log(`=======================================================`);
      console.log(` Server running on http://localhost:${config.port}`);
      console.log(` Environment: ${config.nodeEnv}`);
      console.log(`=======================================================`);
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}
