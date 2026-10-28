// Tests the managed backend file templates/app/backend/src/standard/http.ts (#309).
// Node runs it directly by stripping the types; the file imports only types, so no app packages are needed.
import assert from 'node:assert/strict';
import test from 'node:test';
import { errorHandler, HttpError, ID_PATTERN, MAX_ISSUES, notFound, parseId, serviceDate } from '../../templates/app/backend/src/standard/http.ts';

function fakeResponse() {
  const res = { statusCode: 0, body: undefined };
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

const answer = (err) => {
  const res = fakeResponse();
  const logged = [];
  const original = console.error;
  console.error = (line) => logged.push(line);
  try {
    errorHandler(err, {}, res, () => {});
  } finally {
    console.error = original;
  }
  return { status: res.statusCode, body: res.body, logged };
};

test('malformed and oversized JSON bodies are client errors, not a logged 500', () => {
  // The errors express.json() (body-parser) raises before any route runs.
  const parse = Object.assign(new SyntaxError('Unexpected token } in JSON'), { type: 'entity.parse.failed', status: 400 });
  assert.deepEqual(answer(parse), { status: 400, body: { error: '요청 본문의 JSON 형식이 올바르지 않습니다' }, logged: [] });
  const large = Object.assign(new Error('request entity too large'), { type: 'entity.too.large', status: 413 });
  assert.deepEqual(answer(large), { status: 413, body: { error: '요청 본문이 너무 큽니다' }, logged: [] });
  const charset = Object.assign(new Error('unsupported charset "UTF-7"'), { type: 'charset.unsupported', status: 415 });
  assert.deepEqual(answer(charset), { status: 415, body: { error: '요청을 처리할 수 없습니다' }, logged: [] });
});

test('zod 3 and zod 4 validation errors become 400 with the issue messages', () => {
  const zod = Object.assign(new Error('[...]'), { name: 'ZodError', issues: [{ message: '이름을 입력하세요' }, { message: '날짜 형식이 올바르지 않습니다' }] });
  assert.deepEqual(answer(zod).body, { error: '이름을 입력하세요, 날짜 형식이 올바르지 않습니다' });
  assert.equal(answer(zod).status, 400);
});

test('a huge invalid array answers with the first 10 messages and a count, not every issue (#326)', () => {
  const issues = Array.from({ length: 50000 }, (_, i) => ({ message: `${i}번째 ID가 올바르지 않습니다` }));
  const result = answer(Object.assign(new Error('[...]'), { name: 'ZodError', issues }));
  assert.equal(result.status, 400);
  const parts = result.body.error.split(', ');
  assert.equal(parts.length, MAX_ISSUES + 1);
  assert.equal(parts[0], '0번째 ID가 올바르지 않습니다');
  assert.equal(parts.at(-1), `외 ${50000 - MAX_ISSUES}개`);
  const ten = Array.from({ length: MAX_ISSUES }, () => ({ message: 'x' }));
  assert.equal(answer(Object.assign(new Error(''), { name: 'ZodError', issues: ten })).body.error, Array(MAX_ISSUES).fill('x').join(', '));
});

test('HttpError keeps its status and message; PostgreSQL input errors are 400 and 409', () => {
  assert.deepEqual(answer(new HttpError(404, '교재를 찾을 수 없습니다')), { status: 404, body: { error: '교재를 찾을 수 없습니다' }, logged: [] });
  assert.deepEqual(answer(Object.assign(new Error('invalid byte sequence'), { code: '22021' })).status, 400);
  assert.deepEqual(answer(Object.assign(new Error('duplicate key'), { code: '23505' })), { status: 409, body: { error: '이미 등록된 항목입니다' }, logged: [] });
});

test('anything else is a 500 whose internal message reaches only the log', () => {
  const result = answer(new Error('connect ECONNREFUSED 127.0.0.1:5432'));
  assert.deepEqual(result.body, { error: '서버 오류가 발생했습니다' });
  assert.equal(result.status, 500);
  assert.deepEqual(result.logged.map((l) => JSON.parse(l)), [{ event: 'request_error', message: 'connect ECONNREFUSED 127.0.0.1:5432' }]);
  assert.equal(answer('a thrown string').status, 500);
  assert.equal(answer(null).status, 500);
});

test('an unknown /api path is a JSON 404', () => {
  const res = fakeResponse();
  notFound({}, res);
  assert.deepEqual([res.statusCode, res.body], [404, { error: '요청한 API를 찾을 수 없습니다' }]);
});

test('ids are 1 to 15 digits without a leading zero, sign, exponent, or spaces', () => {
  assert.equal(parseId('7', '교재'), 7);
  assert.equal(parseId('999999999999999', '교재'), 999999999999999);
  for (const bad of ['0', '07', '-1', '1e3', ' 7 ', '7.0', '1000000000000000', '', undefined, 7]) {
    assert.throws(() => parseId(bad, '교재'), (err) => err instanceof HttpError && err.status === 400 && err.message === '교재 ID가 올바르지 않습니다', String(bad));
  }
  assert.ok(Number.isSafeInteger(Number('9'.repeat(15))), 'every allowed id is exact as a JS number');
  assert.equal(ID_PATTERN.test('123'), true);
});

test('the service date is the Asia/Seoul calendar date', () => {
  // 2026-10-27 15:30 UTC is already 2026-10-28 00:30 in Seoul.
  assert.equal(serviceDate(new Date('2026-10-27T15:30:00Z')), '2026-10-28');
  assert.equal(serviceDate(new Date('2026-10-27T14:59:59Z')), '2026-10-27');
});
