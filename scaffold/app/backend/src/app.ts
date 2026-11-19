import { meHandler } from '@sirloinbh/auth-client';
import express from 'express';
import type { Pool } from 'pg';
import { types } from 'pg';

import { registerHealthRoutes } from './routes/health.js';
import { createErrorHandler, notFound, requestLog } from './routes/shared.js';
import { setInt8Parser } from './standard/db.js';
import { apiRateLimit } from './standard/rate-limit.js';

// BIGINT ids come back as numbers, and a value above 2^53 throws (ADR-0025, docs/conventions/pg-ids-and-rows.md).
setInt8Parser(types);
// DATE columns stay `YYYY-MM-DD` strings instead of being shifted through JS Date.
types.setTypeParser(1082, (value) => value);

// Feature routes live in routes/<feature>.ts as register<Feature>Routes(app, pool) and are added
// here. Each new route also needs an entry in openapi.ts (`npm run openapi -w backend`).
export function createApp(pool: Pool, options: { auth?: express.RequestHandler } = {}) {
  const app = express();
  app.disable('x-powered-by');
  // First, so every request, a 401 from the sign-in included, gets a request ID and one log line (#552).
  app.use(requestLog);
  // Middleware order (#678): request log, rate limit, body parser, sign-in, routes, notFound, errorHandler.
  // The limit counts each client IP (trust proxy 1 + X-Forwarded-For from nginx), so it sits before any work.
  apiRateLimit(app);
  app.use(express.json({ limit: '256kb' }));
  // The shared sign-in (ADR-0015) guards every /api route except /api/health, before any route registers.
  if (options.auth) app.use('/api', options.auth);
  app.get('/api/me', meHandler);
  registerHealthRoutes(app, pool);
  app.use('/api', notFound);
  // fields: a validation 400 also lists the invalid fields by path (project-standards #674).
  app.use(createErrorHandler({ fields: true }));
  return app;
}
