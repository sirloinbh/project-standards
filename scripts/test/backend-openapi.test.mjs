// Tests the managed OpenAPI builder templates/app/backend/src/standard/openapi.ts (#679): how the document is assembled
// (security scheme, default 401/413/429, parameters, ordering). Zod is not installed in this repository, so a hook swaps
// 'zod/v4' for a stub whose toJSONSchema returns the JSON Schema a test attaches to the fake schema. The conversion with
// real Zod runs in the scaffold's backend/test/openapi.test.ts (the scaffold-tests CI job).
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'zod/v4') return { url: 'data:text/javascript,export const toJSONSchema = (schema) => ({ $schema: "x", ...schema.json });', shortCircuit: true };
    return next(specifier, context);
  },
});
const { buildOpenApi, schemaOf } = await import('../../templates/app/backend/src/standard/openapi.ts');

const schema = (json) => ({ json });

test('schemaOf drops the $schema key', () => {
  assert.deepEqual(schemaOf(schema({ type: 'string' })), { type: 'string' });
});

const doc = buildOpenApi({
  title: 'Demo API',
  description: 'About',
  errorDescription: 'Error text',
  statusText: { 409: 'Taken' },
  operations: {
    'POST /api/items': { summary: 'Create', body: ['CreateItem', schema({ type: 'object', required: ['name'] })], status: [201, 400, 409] },
    'GET /api/items/:id': { summary: 'Read', status: [200, 404] },
    'GET /api/health': { summary: 'Health', status: [200, 500], public: true },
    'GET /api/items': { summary: 'List', query: schema({ type: 'object', properties: { q: { type: 'string' }, page: { type: 'integer' } }, required: ['page'] }), status: [200] },
  },
});

test('the document has the sign-in scheme and requires it by default', () => {
  assert.equal(doc.openapi, '3.1.0');
  assert.deepEqual(doc.info, { title: 'Demo API', version: '1.0.0', description: 'About' });
  assert.deepEqual(doc.security, [{ session: [] }]);
  assert.deepEqual(doc.components.securitySchemes.session, {
    type: 'apiKey',
    in: 'cookie',
    name: 'sirloinbh.session_token',
    description: 'The shared sign-in session cookie (ADR-0015).',
  });
  assert.equal(doc.components.schemas.Error.properties.error.description, 'Error text');
});

test('guarded routes get 401 and 429, a body adds 413, the public route gets none and opts out of the scheme', () => {
  const codes = (path, method) => Object.keys(doc.paths[path][method].responses);
  assert.deepEqual(codes('/api/items', 'post'), ['201', '400', '401', '409', '413', '429']);
  assert.deepEqual(codes('/api/items', 'get'), ['200', '401', '429']);
  assert.deepEqual(codes('/api/items/{id}', 'get'), ['200', '401', '404', '429']);
  assert.deepEqual(codes('/api/health', 'get'), ['200', '500']);
  assert.deepEqual(doc.paths['/api/health'].get.security, []);
  assert.equal(doc.paths['/api/items'].get.security, undefined);
});

test('descriptions come from the defaults and the statusText override', () => {
  const responses = doc.paths['/api/items'].post.responses;
  assert.equal(responses['409'].description, 'Taken');
  assert.equal(responses['401'].description, 'Sign-in required');
  assert.equal(responses['201'].description, 'Created');
  assert.deepEqual(responses['429'].content['application/json'].schema, { $ref: '#/components/schemas/Error' });
  assert.equal(responses['201'].content, undefined);
});

test('paths use {id} parameters, query properties become parameters, and bodies become components', () => {
  assert.deepEqual(doc.paths['/api/items/{id}'].get.parameters, [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }]);
  assert.deepEqual(doc.paths['/api/items'].get.parameters, [
    { name: 'q', in: 'query', required: false, schema: { type: 'string' } },
    { name: 'page', in: 'query', required: true, schema: { type: 'integer' } },
  ]);
  assert.deepEqual(doc.components.schemas.CreateItem, { type: 'object', required: ['name'] });
  assert.deepEqual(doc.paths['/api/items'].post.requestBody.content['application/json'].schema, { $ref: '#/components/schemas/CreateItem' });
  assert.deepEqual(Object.keys(doc.paths), ['/api/health', '/api/items', '/api/items/{id}']);
});

test('path parameters: ids and names ending in Id are integers, others strings, and params schemas win (#829)', () => {
  const withParams = buildOpenApi({
    title: 'Demo API',
    description: 'About',
    operations: {
      'GET /api/workouts/:workoutId/sets/:kind/:start': {
        summary: 'Sets',
        params: { kind: schema({ type: 'string', enum: ['a', 'b'] }), start: schema({ type: 'string', format: 'date' }) },
        status: [200],
      },
      'GET /api/things/:slug/:grid': { summary: 'Things', status: [200] },
      'GET /api/things/:id/:ID': { summary: 'Id forms', params: { id: schema({ type: 'string', pattern: '^[a-z]+$' }) }, status: [200] },
    },
  });
  assert.deepEqual(withParams.paths['/api/workouts/{workoutId}/sets/{kind}/{start}'].get.parameters, [
    { name: 'workoutId', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
    { name: 'kind', in: 'path', required: true, schema: { type: 'string', enum: ['a', 'b'] } },
    { name: 'start', in: 'path', required: true, schema: { type: 'string', format: 'date' } },
  ]);
  // "grid" ends in "id" but not in "Id"; a listed schema replaces the default for the name.
  assert.deepEqual(withParams.paths['/api/things/{slug}/{grid}'].get.parameters.map((p) => p.schema), [{ type: 'string' }, { type: 'string' }]);
  assert.deepEqual(withParams.paths['/api/things/{id}/{ID}'].get.parameters.map((p) => p.schema), [{ type: 'string', pattern: '^[a-z]+$' }, { type: 'string' }]);
});

test('request headers and non-JSON success bodies are documented (#709)', () => {
  const withExtras = buildOpenApi({
    title: 'Demo API',
    description: 'About',
    operations: {
      'POST /api/items': {
        summary: 'Create',
        headers: { 'Idempotency-Key': { description: 'Retry key', schema: schema({ type: 'string', format: 'uuid' }) }, 'X-Plain': { description: 'Plain', required: true } },
        status: [201],
      },
      'GET /api/export.csv': { summary: 'Export', produces: 'text/csv', status: [200] },
    },
  });
  assert.deepEqual(withExtras.paths['/api/items'].post.parameters, [
    { name: 'Idempotency-Key', in: 'header', required: false, description: 'Retry key', schema: { type: 'string', format: 'uuid' } },
    { name: 'X-Plain', in: 'header', required: true, description: 'Plain', schema: { type: 'string' } },
  ]);
  assert.deepEqual(withExtras.paths['/api/export.csv'].get.responses[200], { description: 'OK', content: { 'text/csv': { schema: { type: 'string' } } } });
  assert.equal(withExtras.paths['/api/export.csv'].get.parameters, undefined);
});

test('a table the builder cannot document throws an error that names the route (#868)', () => {
  const build = (operations) => () => buildOpenApi({ title: 'Demo API', description: 'About', operations });
  const objectQuery = schema({ type: 'object', properties: { q: { type: 'string' } } });
  assert.throws(build({ 'GET /api/a': { summary: 'A', status: [] } }), /GET \/api\/a: status needs at least the success status/);
  assert.throws(build({ 'GET /api/a': { summary: 'A', query: schema({ anyOf: [{ type: 'object' }, { type: 'object' }] }), status: [200] } }), /GET \/api\/a: query must be a Zod object/);
  assert.throws(build({ 'GET /api/a': { summary: 'A', query: schema({ type: 'array' }), status: [200] } }), /GET \/api\/a: query must be a Zod object/);
  assert.throws(build({ 'GET /api/a/:id': { summary: 'A', params: { slug: schema({ type: 'string' }) }, status: [200] } }), /GET \/api\/a\/:id: params lists 'slug'/);
  assert.throws(build({ 'GET /api/a/:id/b/:id': { summary: 'A', status: [200] } }), /GET \/api\/a\/:id\/b\/:id: the path parameter :id appears twice/);
  assert.throws(
    build({ 'POST /api/a': { summary: 'A', headers: { 'Idempotency-Key': { description: 'x' }, 'idempotency-key': { description: 'y' } }, status: [201] } }),
    /POST \/api\/a: the header 'idempotency-key' is listed twice/,
  );
  assert.throws(build({ 'GET': { summary: 'A', status: [200] } }), /the key must be 'METHOD \/path'/);
  assert.throws(build({ 'GET /api/a extra': { summary: 'A', status: [200] } }), /the key must be 'METHOD \/path'/);
  // A valid table, with a query object, still builds.
  assert.doesNotThrow(build({ 'GET /api/a/:id': { summary: 'A', query: objectQuery, params: { id: schema({ type: 'integer' }) }, status: [200] } }));
});
