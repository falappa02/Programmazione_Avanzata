import app from './app';
import { config } from './config/env';
import { sequelize } from './config/database';
import { getRsaKeys } from './config/keys';
import './queue/inference.worker'; // Import worker listener

async function bootstrap() {
  try {
    // 1. Ensure RSA Keypair exists for JWT RS256
    getRsaKeys();

    // 2. Sync Database Schema
    console.log('[DATABASE] Connecting and syncing database models...');
    await sequelize.sync({ alter: true });
    console.log('[DATABASE] Database synchronized successfully.');

    // 3. Start Express HTTP Server
    const server = app.listen(config.port, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Server running on http://localhost:${config.port}`);
      console.log(`📡 Environment: ${config.nodeEnv}`);
      console.log(`=======================================================`);
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}
