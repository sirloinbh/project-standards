// Tests the managed backend file templates/app/backend/src/standard/http.ts (#309).
// Node runs it directly by stripping the types; the file imports only types, so no app packages are needed.
import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { createErrorHandler, errorHandler, HttpError, ID_PATTERN, MAX_ISSUES, notFound, parseId, requestLog, serviceDate } from '../../templates/app/backend/src/standard/http.ts';

function fakeResponse() {
  const res = Object.assign(new EventEmitter(), { statusCode: 0, body: undefined, locals: {}, headers: {}, writableFinished: true });
  res.setHeader = (name, value) => {
    res.headers[name.toLowerCase()] = value;
  };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

const answer = (err, handler = errorHandler) => {
  const res = fakeResponse();
  const logged = [];
  const original = console.error;
  console.error = (line) => logged.push(line);
  try {
    handler(err, {}, res, () => {});
  } finally {
    console.error = original;
  }
  return { status: res.statusCode, body: res.body, logged };
};

test('malformed and oversized JSON bodies are client errors, not a logged 500', () => {
  // The errors express.json() (body-parser) raises before any route runs.
  const parse = Object.assign(new SyntaxError('Unexpected token } in JSON'), { type: 'entity.parse.failed', status: 400 });
  assert.deepEqual(answer(parse), { status: 400, body: { error: 'Request body is not valid JSON' }, logged: [] });
  const large = Object.assign(new Error('request entity too large'), { type: 'entity.too.large', status: 413 });
  assert.deepEqual(answer(large), { status: 413, body: { error: 'Request body is too large' }, logged: [] });
  const charset = Object.assign(new Error('unsupported charset "UTF-7"'), { type: 'charset.unsupported', status: 415 });
  assert.deepEqual(answer(charset), { status: 415, body: { error: 'Cannot process the request' }, logged: [] });
});

test('zod 3 and zod 4 validation errors become 400 with the issue messages', () => {
  const zod = Object.assign(new Error('[...]'), { name: 'ZodError', issues: [{ message: 'Enter a name' }, { message: 'Invalid date format' }] });
  assert.equal(answer(zod).body.error, 'Enter a name, Invalid date format');
  assert.equal(answer(zod).status, 400);
});

const withFields = createErrorHandler({ fields: true });

test('a validation answer lists the invalid fields by path when fields are on, and `error` is unchanged (#674)', () => {
  const zod = Object.assign(new Error('[...]'), {
    name: 'ZodError',
    issues: [
      { message: 'Enter a name', path: ['name'] },
      { message: 'Enter a number', path: ['items', 0, 'count'] },
      { message: 'Invalid input', path: [] },
      { message: 'No path given' },
    ],
  });
  assert.deepEqual(answer(zod, withFields).body, {
    error: 'Enter a name, Enter a number, Invalid input, No path given',
    fields: [
      { path: 'name', message: 'Enter a name' },
      { path: 'items.0.count', message: 'Enter a number' },
      { path: '', message: 'Invalid input' },
      { path: '', message: 'No path given' },
    ],
  });
  // Other errors keep the one-key body.
  assert.deepEqual(answer(new HttpError(404, 'Not found'), withFields).body, { error: 'Not found' });
  // The plain errorHandler and createErrorHandler() leave the body as { error } (#799).
  const plain = { error: 'Enter a name, Enter a number, Invalid input, No path given' };
  assert.deepEqual(answer(zod).body, plain);
  assert.deepEqual(answer(zod, createErrorHandler()).body, plain);
  assert.equal(createErrorHandler().length, 4, 'Express needs four parameters to treat it as an error handler');
});

test('fields hold at most MAX_ISSUES entries (#326, #674)', () => {
  const issues = Array.from({ length: 50000 }, (_, i) => ({ message: `Bad ${i}`, path: [i] }));
  const { body } = answer(Object.assign(new Error('[...]'), { name: 'ZodError', issues }), withFields);
  assert.equal(body.fields.length, MAX_ISSUES);
  assert.deepEqual(body.fields[0], { path: '0', message: 'Bad 0' });
});

test('a huge invalid array answers with the first 10 messages and a count, not every issue (#326)', () => {
  const issues = Array.from({ length: 50000 }, (_, i) => ({ message: `Invalid ID at ${i}` }));
  const result = answer(Object.assign(new Error('[...]'), { name: 'ZodError', issues }));
  assert.equal(result.status, 400);
  const parts = result.body.error.split(', ');
  assert.equal(parts.length, MAX_ISSUES + 1);
  assert.equal(parts[0], 'Invalid ID at 0');
  assert.equal(parts.at(-1), `and ${50000 - MAX_ISSUES} more`);
  const ten = Array.from({ length: MAX_ISSUES }, () => ({ message: 'x' }));
  assert.equal(answer(Object.assign(new Error(''), { name: 'ZodError', issues: ten })).body.error, Array(MAX_ISSUES).fill('x').join(', '));
});

test('HttpError keeps its status and message; PostgreSQL input errors are 400 and 409', () => {
  assert.deepEqual(answer(new HttpError(404, 'Textbook not found')), { status: 404, body: { error: 'Textbook not found' }, logged: [] });
  assert.deepEqual(answer(Object.assign(new Error('invalid byte sequence'), { code: '22021' })).status, 400);
  assert.deepEqual(answer(Object.assign(new Error('duplicate key'), { code: '23505' })), { status: 409, body: { error: 'This item already exists' }, logged: [] });
});

test('client-caused PostgreSQL errors are 400 with a short message and no database text (#673)', () => {
  const expected = {
    23503: 'A related item does not exist or is still in use',
    23514: 'Input is not allowed',
    '22P02': 'Input has an invalid format',
    '22007': 'Input has an invalid date or time',
    '22008': 'Input has an invalid date or time',
  };
  for (const [code, message] of Object.entries(expected)) {
    const err = Object.assign(new Error('violates constraint "items_owner_fkey" on table "items"'), { code });
    assert.deepEqual(answer(err), { status: 400, body: { error: message }, logged: [] }, code);
  }
});

test('after the response has started the error goes to Express and nothing is written (#673)', () => {
  const res = fakeResponse();
  res.headersSent = true;
  res.json = () => assert.fail('must not write a second response');
  const passed = [];
  const err = new HttpError(404, 'late');
  errorHandler(err, {}, res, (value) => passed.push(value));
  assert.deepEqual(passed, [err]);
  assert.equal(res.statusCode, 0);
});

test('anything else is a 500 whose internal message reaches only the log', () => {
  const result = answer(new Error('connect ECONNREFUSED 127.0.0.1:5432'));
  assert.deepEqual(result.body, { error: 'Server error' });
  assert.equal(result.status, 500);
  const [line, ...rest] = result.logged.map((l) => JSON.parse(l));
  assert.equal(rest.length, 0);
  assert.match(line.time, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual({ ...line, time: undefined }, { time: undefined, level: 'error', event: 'request_error', message: 'connect ECONNREFUSED 127.0.0.1:5432' });
  assert.equal(answer('a thrown string').status, 500);
  assert.equal(answer(null).status, 500);
});

test('an unknown /api path is a JSON 404', () => {
  const res = fakeResponse();
  notFound({}, res);
  assert.deepEqual([res.statusCode, res.body], [404, { error: 'API not found' }]);
});

test('ids are 1 to 15 digits without a leading zero, sign, exponent, or spaces', () => {
  assert.equal(parseId('7', 'textbook'), 7);
  assert.equal(parseId('999999999999999', 'textbook'), 999999999999999);
  for (const bad of ['0', '07', '-1', '1e3', ' 7 ', '7.0', '1000000000000000', '', undefined, 7]) {
    assert.throws(() => parseId(bad, 'textbook'), (err) => err instanceof HttpError && err.status === 400 && err.message === 'Invalid textbook ID', String(bad));
  }
  assert.ok(Number.isSafeInteger(Number('9'.repeat(15))), 'every allowed id is exact as a JS number');
  assert.equal(ID_PATTERN.test('123'), true);
});

test('the service date is the Asia/Seoul calendar date', () => {
  // 2026-10-27 15:30 UTC is already 2026-10-28 00:30 in Seoul.
  assert.equal(serviceDate(new Date('2026-10-27T15:30:00Z')), '2026-10-28');
  assert.equal(serviceDate(new Date('2026-10-27T14:59:59Z')), '2026-10-27');
});

// requestLog (#552): the request ID header and one JSON line per request.
function logRequest({ headers = {}, method = 'GET', url = '/api/workouts?from=2026-11-01', status = 200, finished = true } = {}) {
  const req = { method, originalUrl: url, get: (name) => headers[name.toLowerCase()] };
  const res = fakeResponse();
  const lines = { log: [], error: [] };
  const original = { log: console.log, error: console.error };
  console.log = (line) => lines.log.push(line);
  console.error = (line) => lines.error.push(line);
  try {
    let called = false;
    requestLog(req, res, () => {
      called = true;
    });
    assert.ok(called, 'requestLog calls next');
    res.statusCode = status;
    res.writableFinished = finished;
    res.emit('close');
  } finally {
    Object.assign(console, original);
  }
  return { res, lines };
}

test('requestLog creates a request ID, returns it in the header and logs one JSON line without the query', () => {
  const { res, lines } = logRequest();
  const id = res.headers['x-request-id'];
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.equal(res.locals.requestId, id);
  assert.equal(lines.error.length, 0);
  assert.equal(lines.log.length, 1);
  const line = JSON.parse(lines.log[0]);
  assert.deepEqual(Object.keys(line), ['time', 'level', 'requestId', 'method', 'path', 'status', 'ms']);
  assert.deepEqual([line.level, line.requestId, line.method, line.path, line.status], ['info', id, 'GET', '/api/workouts', 200]);
  assert.ok(Number.isInteger(line.ms) && line.ms >= 0);
});

test('requestLog keeps a valid incoming X-Request-Id and replaces one that is not an ID', () => {
  assert.equal(logRequest({ headers: { 'x-request-id': 'abc123.def-4_5' } }).res.headers['x-request-id'], 'abc123.def-4_5');
  for (const bad of ['two words', 'x'.repeat(129), '{"level":"error"}']) {
    assert.notEqual(logRequest({ headers: { 'x-request-id': bad } }).res.headers['x-request-id'], bad);
  }
});

test('requestLog logs 4xx as warn and 5xx as error, and errorHandler logs the same request ID', () => {
  assert.equal(JSON.parse(logRequest({ status: 404 }).lines.log[0]).level, 'warn');
  const failed = logRequest({ status: 500 });
  assert.equal(failed.lines.log.length, 0);
  assert.equal(JSON.parse(failed.lines.error[0]).level, 'error');
  const res = fakeResponse();
  res.locals.requestId = 'req-1';
  const original = console.error;
  const logged = [];
  console.error = (line) => logged.push(line);
  try {
    errorHandler(new Error('boom'), {}, res, () => {});
  } finally {
    console.error = original;
  }
  assert.equal(JSON.parse(logged[0]).requestId, 'req-1');
});

test('requestLog logs a request closed before the response was written as 499 aborted at warn level (#869)', () => {
  const { lines } = logRequest({ status: 200, finished: false });
  assert.equal(lines.error.length, 0);
  const line = JSON.parse(lines.log[0]);
  assert.deepEqual([line.level, line.status, line.aborted], ['warn', 499, true]);
  const normal = JSON.parse(logRequest({ status: 200 }).lines.log[0]);
  assert.equal(normal.aborted, undefined, 'a finished request has no aborted field');
  assert.equal(normal.status, 200);
});

test('requestLog on a real server: a client that hangs up before the handler answers logs 499, a normal request logs 200 (#869)', async () => {
  const { createServer, request } = await import('node:http');
  const lines = [];
  const original = console.log;
  console.log = (line) => lines.push(JSON.parse(line));
  let release;
  const server = createServer((req, res) => {
    // The few Express members requestLog reads, set by hand on the plain Node request and response.
    Object.assign(req, { originalUrl: req.url, get: (name) => req.headers[name.toLowerCase()] });
    res.locals ??= {};
    requestLog(req, res, () => {
      if (req.url === '/slow') release = () => res.end('late');
      else res.end('ok');
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await new Promise((resolve) => request({ port, path: '/ok' }, (res) => res.resume().on('end', resolve)).end());
    const aborted = request({ port, path: '/slow' });
    aborted.on('error', () => {});
    aborted.end();
    await new Promise((resolve) => setTimeout(resolve, 50));
    aborted.destroy();
    await new Promise((resolve) => setTimeout(resolve, 100));
    release?.();
  } finally {
    console.log = original;
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  const byPath = Object.fromEntries(lines.map((l) => [l.path, l]));
  assert.deepEqual([byPath['/ok'].status, byPath['/ok'].level, byPath['/ok'].aborted], [200, 'info', undefined]);
  assert.deepEqual([byPath['/slow'].status, byPath['/slow'].level, byPath['/slow'].aborted], [499, 'warn', true]);
});
