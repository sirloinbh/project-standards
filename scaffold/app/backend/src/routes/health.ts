import type express from 'express';
import type { Db } from './shared.js';

export function registerHealthRoutes(app: express.Express, pool: Db) {
  app.get('/api/health', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  });
}
