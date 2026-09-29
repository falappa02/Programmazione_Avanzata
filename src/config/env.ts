import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  db: {
    dialect: process.env.DB_DIALECT || 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'yolo_db',
    user: process.env.DB_USER || 'yolo_user',
    password: process.env.DB_PASSWORD || 'yolo_pass',
  },

  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  jwt: {
    algorithm: (process.env.JWT_ALGORITHM || 'RS256') as 'RS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  pythonPath: process.env.PYTHON_PATH || 'python',
};
