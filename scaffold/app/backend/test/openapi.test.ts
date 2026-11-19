import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type { Pool } from 'pg';
import { z } from 'zod/v4';

import { createApp } from '../src/app.js';
import { document, operations } from '../src/openapi.js';
import { buildOpenApi, schemaOf } from '../src/standard/openapi.js';

// Routes are only registered here, never called, so no database is needed.
const app = () => createApp({} as Pool);

// The registered `METHOD /path` list. Express 5 keeps the top-level routes in `app.router.stack`; this reads them in
// the test only, so the managed OpenAPI builder does not depend on Express.
type Layer = { route?: { path: string; methods: Record<string, boolean> } };
function registeredRoutes(instance: ReturnType<typeof app>) {
  return (instance as unknown as { router: { stack: Layer[] } }).router.stack.flatMap((layer) =>
    layer.route
      ? Object.keys(layer.route.methods).map((m) => `${m.toUpperCase()} ${layer.route!.path}`)
      : [],
  );
}

test('docs/openapi.json is up to date with the operation table', async () => {
  const committed = JSON.parse(
    await readFile(new URL('../../docs/openapi.json', import.meta.url), 'utf8'),
  ) as unknown;
  assert.deepEqual(committed, JSON.parse(JSON.stringify(document)), 'run `npm run openapi -w backend` and commit');
});

test('the operation table and the registered routes are the same set', () => {
  const routes = registeredRoutes(app());
  assert.deepEqual(Object.keys(operations).sort(), [...routes].sort());
});

test('API paths start with /api and use lowercase words joined by hyphens', () => {
  const routes = registeredRoutes(app());
  assert.ok(routes.includes('GET /api/health'));
  for (const route of routes)
    assert.match(route, /^[A-Z]+ \/api(\/(:\w+|[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+)?))*$/);
});

test('guarded routes document the sign-in, 401 and 429; the public route does not', () => {
  const paths = document.paths as Record<string, Record<string, { security?: unknown[]; responses: Record<string, unknown> }>>;
  assert.deepEqual(document.security, [{ session: [] }]);
  assert.equal(document.components.securitySchemes.session.in, 'cookie');
  assert.deepEqual(paths['/api/health']!.get!.security, []);
  assert.ok(!('401' in paths['/api/health']!.get!.responses));
  assert.ok('401' in paths['/api/me']!.get!.responses);
  assert.ok('429' in paths['/api/me']!.get!.responses);
});

test('formats stay in the document whether they are the type or a check', () => {
  // z.int() also carries the safe integer bounds.
  assert.partialDeepStrictEqual(schemaOf(z.int().min(1)), { type: 'integer', minimum: 1 });
  assert.equal(schemaOf(z.uuid()).format, 'uuid');
  assert.equal(schemaOf(z.email()).format, 'email');
  assert.equal(schemaOf(z.iso.date()).format, 'date');
  assert.equal(schemaOf(z.iso.datetime()).format, 'date-time');
  assert.equal(schemaOf(z.string().min(1).max(20)).maxLength, 20);
});

test('a request body and a query become components and parameters', () => {
  const doc = buildOpenApi({
    title: 'Test API',
    description: 'test',
    operations: {
      'POST /api/items': {
        summary: 'Create',
        body: ['CreateItem', z.object({ name: z.string().min(1) })],
        status: [201, 400],
      },
      'GET /api/items/:id': { summary: 'Read', status: [200, 404] },
      'GET /api/items': {
        summary: 'List',
        query: z.object({ q: z.string().optional(), page: z.int().min(1) }),
        status: [200],
      },
    },
  });
  const paths = doc.paths as Record<string, Record<string, { parameters?: { name: string; required: boolean; schema: unknown }[]; responses: Record<string, unknown> }>>;
  assert.ok('413' in paths['/api/items']!.post!.responses);
  assert.ok(!('413' in paths['/api/items']!.get!.responses));
  const parameters = paths['/api/items']!.get!.parameters!;
  assert.deepEqual(parameters.map((p) => [p.name, p.required]), [['q', false], ['page', true]]);
  assert.deepEqual(parameters[0]!.schema, { type: 'string' });
  assert.partialDeepStrictEqual(parameters[1]!.schema, { type: 'integer', minimum: 1 });
  assert.equal(paths['/api/items/{id}']!.get!.parameters![0]!.required, true);
  assert.deepEqual((doc.components.schemas as Record<string, { required: string[] }>).CreateItem!.required, ['name']);
});

test('a type JSON Schema cannot express fails instead of being skipped', () => {
  assert.throws(() => schemaOf(z.date()), /Date cannot be represented/);
});
