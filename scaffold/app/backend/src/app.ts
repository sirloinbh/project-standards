import express from 'express';
import type { Pool } from 'pg';
import { types } from 'pg';
import { registerHealthRoutes } from './routes/health.js';
import { errorHandler } from './routes/shared.js';

// DATE columns stay `YYYY-MM-DD` strings instead of being shifted through JS Date.
types.setTypeParser(1082, (value) => value);

// Feature routes live in routes/<feature>.ts and register themselves here.
export function createApp(pool: Pool) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));
  registerHealthRoutes(app, pool);
  app.use(errorHandler);
  return app;
}
