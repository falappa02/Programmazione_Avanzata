import { Sequelize, Options } from 'sequelize';
import { config } from './env';

/**
 * Singleton Pattern: Database connection manager holding a single Sequelize instance.
 */
class Database {
  private static instance: Sequelize;

  private constructor() {}

  public static getInstance(): Sequelize {
    if (!Database.instance) {
      let sequelizeOptions: Options = {
        logging: false, // Set to console.log for SQL debug output
      };

      if (config.db.dialect === 'sqlite') {
        sequelizeOptions = {
          ...sequelizeOptions,
          dialect: 'sqlite',
          storage: config.db.storage,
        };
      } else {
        sequelizeOptions = {
          ...sequelizeOptions,
          dialect: 'postgres',
          host: config.db.host,
          port: config.db.port,
          database: config.db.name,
          username: config.db.user,
          password: config.db.password,
          pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000,
          },
        };
      }

      Database.instance = new Sequelize(sequelizeOptions);
    }

    return Database.instance;
  }
}

export const sequelize = Database.getInstance();
