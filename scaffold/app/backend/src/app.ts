import express from 'express';
import type { Pool } from 'pg';
import { types } from 'pg';

import { registerHealthRoutes } from './routes/health.js';
import { errorHandler, notFound } from './routes/shared.js';

// DATE columns stay `YYYY-MM-DD` strings instead of being shifted through JS Date.
types.setTypeParser(1082, (value) => value);

// Feature routes live in routes/<feature>.ts as register<Feature>Routes(app, pool) and are added
// here. Each new route also needs an entry in openapi.ts (`npm run openapi -w backend`).
export function createApp(pool: Pool) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));
  registerHealthRoutes(app, pool);
  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
