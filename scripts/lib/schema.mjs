// Minimal JSON Schema validator. Supports only the keywords this repo's schemas use,
// so registry checks run without installing any npm package.
const SUPPORTED = new Set([
  '$schema', '$id', '$defs', '$ref', 'title', 'description', 'type', 'enum', 'const',
  'properties', 'required', 'additionalProperties', 'items', 'minItems', 'uniqueItems',
  'minLength', 'pattern', 'format', 'minimum', 'maximum',
]);

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function matchesType(value, type) {
  const actual = typeOf(value);
  return actual === type || (type === 'number' && actual === 'integer');
}

function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error(`Only local $ref is supported: ${ref}`);
  return ref
    .slice(2)
    .split('/')
    .reduce((node, key) => {
      if (node?.[key] === undefined) throw new Error(`Unresolved $ref: ${ref}`);
      return node[key];
    }, root);
}

const pointer = (path) => (path.length ? `/${path.join('/')}` : '/');

function check(schema, value, path, root, errors) {
  for (const key of Object.keys(schema)) {
    if (!SUPPORTED.has(key)) throw new Error(`Unsupported schema keyword "${key}" at ${pointer(path)}`);
  }
  if (schema.$ref) return check(resolveRef(root, schema.$ref), value, path, root, errors);

  const fail = (message) => errors.push({ path: pointer(path), message });

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) {
      fail(`expected ${types.join(' or ')}, got ${typeOf(value)}`);
      return;
    }
  }
  if (schema.const !== undefined && value !== schema.const) fail(`must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) fail(`must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(', ')}`);

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) fail(`must be at least ${schema.minLength} characters`);
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) fail(`must match ${schema.pattern}`);
    if (schema.format === 'date' && !isDate(value)) fail('must be a date (YYYY-MM-DD)');
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) fail(`must be >= ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) fail(`must be <= ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) fail(`must have at least ${schema.minItems} items`);
    if (schema.uniqueItems) {
      const seen = new Set();
      value.forEach((item, i) => {
        const key = JSON.stringify(item);
        if (seen.has(key)) fail(`item ${i} is a duplicate`);
        seen.add(key);
      });
    }
    if (schema.items) value.forEach((item, i) => check(schema.items, item, [...path, String(i)], root, errors));
  }
  if (typeOf(value) === 'object') {
    for (const key of schema.required ?? []) {
      if (!(key in value)) fail(`missing required property "${key}"`);
    }
    for (const [key, child] of Object.entries(value)) {
      if (schema.properties?.[key]) check(schema.properties[key], child, [...path, key], root, errors);
      else if (schema.additionalProperties === false) fail(`unknown property "${key}"`);
      else if (typeof schema.additionalProperties === 'object') check(schema.additionalProperties, child, [...path, key], root, errors);
    }
  }
}

function isDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}

/** Returns a list of { path, message }. An empty list means the value is valid. */
export function validate(schema, value) {
  const errors = [];
  check(schema, value, [], schema, errors);
  return errors;
}
