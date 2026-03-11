import { DataSource } from 'typeorm';
import * as entities from './entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '54322'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  entities: Object.values(entities),
  synchronize: false, // NEVER true in production - use migrations
  logging: process.env.NODE_ENV === 'development',
  extra: {
    max: 25, // Maximum connections in pool
    min: 5, // Minimum connections always open
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});
