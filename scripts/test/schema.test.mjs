import assert from 'node:assert/strict';
import test from 'node:test';
import { validate } from '../lib/schema.mjs';

const messages = (schema, value) => validate(schema, value).map((e) => `${e.path} ${e.message}`);

test('accepts a value that matches every keyword', () => {
  const schema = {
    type: 'object',
    required: ['name', 'port', 'tags'],
    additionalProperties: false,
    properties: {
      name: { type: 'string', pattern: '^[a-z-]+$', minLength: 2 },
      port: { type: 'integer', minimum: 1024, maximum: 65535 },
      tags: { type: 'array', uniqueItems: true, minItems: 1, items: { enum: ['a', 'b'] } },
      until: { type: ['string', 'null'], format: 'date' },
    },
  };
  assert.deepEqual(validate(schema, { name: 'study-log', port: 3102, tags: ['a'], until: null }), []);
});

test('reports type, required, and unknown properties with JSON paths', () => {
  const schema = { type: 'object', required: ['a'], additionalProperties: false, properties: { a: { type: 'integer' } } };
  assert.deepEqual(messages(schema, { a: 'x', b: 1 }), ['/a expected integer, got string', '/ unknown property "b"']);
  assert.deepEqual(messages(schema, {}), ['/ missing required property "a"']);
});

test('checks string, number, and array constraints', () => {
  assert.deepEqual(messages({ type: 'string', pattern: '^[a-z]+$' }, 'A'), ['/ must match ^[a-z]+$']);
  assert.deepEqual(messages({ type: 'string', minLength: 5 }, 'abc'), ['/ must be at least 5 characters']);
  assert.deepEqual(messages({ type: 'integer', minimum: 10 }, 9), ['/ must be >= 10']);
  assert.deepEqual(messages({ type: 'integer', maximum: 10 }, 11), ['/ must be <= 10']);
  assert.deepEqual(messages({ type: 'array', uniqueItems: true }, [1, 1]), ['/ item 1 is a duplicate']);
  assert.deepEqual(messages({ type: 'array', minItems: 1 }, []), ['/ must have at least 1 items']);
  assert.deepEqual(messages({ enum: ['active', 'retired'] }, 'gone'), ['/ must be one of "active", "retired"']);
  assert.deepEqual(messages({ const: 1 }, 2), ['/ must be 1']);
});

test('validates dates strictly', () => {
  assert.deepEqual(messages({ type: 'string', format: 'date' }, '2026-02-30'), ['/ must be a date (YYYY-MM-DD)']);
  assert.deepEqual(messages({ type: 'string', format: 'date' }, '2026-10-22'), []);
});

test('nullable fields skip string rules when null', () => {
  assert.deepEqual(messages({ type: ['string', 'null'], pattern: '^[a-z]+$' }, null), []);
  assert.deepEqual(messages({ type: ['string', 'null'], pattern: '^[a-z]+$' }, 'A'), ['/ must match ^[a-z]+$']);
});

test('resolves local $ref and validates additionalProperties schemas', () => {
  const schema = {
    type: 'object',
    additionalProperties: { $ref: '#/$defs/sha' },
    $defs: { sha: { type: 'string', pattern: '^[0-9a-f]{40}$' } },
  };
  assert.deepEqual(messages(schema, { checkout: 'a'.repeat(40) }), []);
  assert.deepEqual(messages(schema, { checkout: 'v4' }), ['/checkout must match ^[0-9a-f]{40}$']);
});

test('refuses unsupported keywords instead of silently ignoring them', () => {
  assert.throws(() => validate({ oneOf: [] }, 1), /Unsupported schema keyword "oneOf"/);
  assert.throws(() => validate({ $ref: 'other.json#/x' }, 1), /Only local \$ref/);
});
