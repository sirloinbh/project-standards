import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type { Pool } from 'pg';
import { z } from 'zod';

import { createApp } from '../src/app.js';
import { buildOpenApi, jsonSchema, registeredRoutes } from '../src/openapi.js';

// Routes are only registered here, never called, so no database is needed.
const app = () => createApp({} as Pool);

test('docs/openapi.json is up to date with the routes and schemas', async () => {
  const committed = JSON.parse(
    await readFile(new URL('../../docs/openapi.json', import.meta.url), 'utf8'),
  ) as unknown;
  assert.deepEqual(committed, buildOpenApi(app()), 'run `npm run openapi -w backend` and commit');
});

test('API paths start with /api and use lowercase words joined by hyphens', () => {
  const routes = registeredRoutes(app());
  assert.ok(routes.includes('GET /api/health'));
  for (const route of routes)
    assert.match(route, /^[A-Z]+ \/api(\/(:\w+|[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+)?))*$/);
});

test('unsupported schemas and undocumented routes fail instead of being skipped', () => {
  assert.throws(() => jsonSchema(z.date()), /Unsupported Zod type for OpenAPI: ZodDate/);
  const extended = app();
  extended.get('/api/undocumented', (_req, res) => void res.json({}));
  assert.throws(() => buildOpenApi(extended), /\+GET \/api\/undocumented/);
});
