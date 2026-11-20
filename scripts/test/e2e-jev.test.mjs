// Tests the managed e2e helper templates/e2e/e2e/support/jev.ts (ADR-0028, #574): the request shape, the confidence
// gate, fixture replay and recording, and the skip rules. Node strips the types; no Playwright is needed.
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const { buildRequest, CONFIDENCE_GATE, gate, judge, MAX_CALLS, MAX_STATE_CHARS, requestHash } = await import(
  '../../templates/e2e/e2e/support/jev.ts'
);

const questions = {
  clear: { type: 'noul', instructions: 'Does the message say what to fix?' },
  tone: { type: 'choice', instructions: 'Which tone?', criteria: { polite: 'Polite', rude: 'Rude' } },
};
const answers = (noul, choice, confidence) => ({
  answers: { clear: { type: 'noul', noul }, tone: { type: 'choice', choice, confidence, probabilities: {} } },
  usage: { input_tokens: 100 },
});
const env = { JEV_API_KEY: 'k', JEV_API_URL: 'https://jev.example/v1/decisions' };
const fixtures = () => mkdtemp(join(tmpdir(), 'jev-'));
const fresh = () => ({ calls: 0, inputTokens: 0 });
const reply = (body, ok = true, status = 200) => async () => ({ ok, status, json: async () => body });
const expectBoth = { clear: true, tone: 'polite' };

test('the request is flat: model, state and questions; the hash ignores key order but not content', () => {
  const request = buildRequest('page text', questions);
  assert.deepEqual(Object.keys(request), ['model', 'state', 'questions']);
  assert.equal(request.model, 'typesafe/jev');
  const reordered = { questions: request.questions, state: request.state, model: request.model };
  assert.equal(requestHash(reordered), requestHash(request));
  assert.notEqual(requestHash(buildRequest('other text', questions)), requestHash(request));
  assert.match(requestHash(request), /^[0-9a-f]{32}$/);
});

test('the gate: a right answer passes; a wrong one fails only when confident (noul by probability)', () => {
  assert.equal(gate('clear', questions.clear, { noul: 0.97 }, true).ok, true);
  assert.equal(gate('clear', questions.clear, { noul: 0.1 }, false).ok, true);
  const confident = gate('clear', questions.clear, { noul: 0.02 }, true);
  assert.deepEqual([confident.ok, confident.confident], [false, true]);
  assert.equal(gate('clear', questions.clear, { noul: 0.6 }, true).ok, true);
  const mild = gate('clear', questions.clear, { noul: 0.3 }, true);
  assert.deepEqual([mild.ok, mild.confident], [false, false]);
  assert.equal(gate('tone', questions.tone, { choice: 'polite', confidence: 0.5 }, 'polite').ok, true);
  assert.equal(gate('tone', questions.tone, { choice: 'rude', confidence: CONFIDENCE_GATE }, 'polite').confident, true);
  assert.equal(gate('tone', questions.tone, { choice: 'rude', confidence: 0.89 }, 'polite').confident, false);
  const score = { type: 'score', instructions: 'Clarity', criteria: ['bad', 'ok', 'good'] };
  assert.equal(gate('s', score, { score: 1.8, confidence: 0.2 }, 2).ok, true, 'a score is rounded to its level');
  assert.equal(gate('s', questions.tone, undefined, 'polite').ok, false, 'a missing answer is not a pass');
});

test('with a key the API is called with a bearer token, the answer is gated and recorded as a fixture', async () => {
  const dir = await fixtures();
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init });
    return reply(answers(0.95, 'polite', 0.7))();
  };
  const result = await judge({ state: 'Enter a title', questions, expected: expectBoth, fixtureDir: dir, env, fetchFn, budget: fresh() });
  assert.deepEqual(result, { outcome: 'judged', source: 'api', failures: [], warnings: [] });
  assert.equal(calls[0].url, env.JEV_API_URL);
  assert.equal(calls[0].init.headers.authorization, 'Bearer k');
  assert.deepEqual(JSON.parse(calls[0].init.body), buildRequest('Enter a title', questions));
  const [file] = await readdir(dir);
  assert.equal(file, `${requestHash(buildRequest('Enter a title', questions))}.json`);
  assert.doesNotMatch(await readFile(join(dir, file), 'utf8'), /Bearer|"k"/, 'the key is never stored');
});

test('without a key the recorded answer is replayed offline, and a confident wrong answer fails', async () => {
  const dir = await fixtures();
  const base = { state: 'Enter a title', questions, fixtureDir: dir, budget: fresh() };
  await judge({ ...base, expected: expectBoth, env, fetchFn: reply(answers(0.01, 'rude', 0.95)) });
  const replayed = await judge({ ...base, expected: expectBoth, env: {}, fetchFn: async () => assert.fail('no network without a key') });
  assert.equal(replayed.outcome, 'judged');
  assert.equal(replayed.source, 'fixture');
  assert.equal(replayed.failures.length, 2);
  const lenient = await judge({ ...base, expected: { clear: false, tone: 'rude' }, env: {} });
  assert.deepEqual(lenient.failures, [], 'the same answers satisfy the opposite expectation');
});

test('no fixture and no key is a skip, not a failure; so is a key without a URL', async () => {
  const dir = await fixtures();
  for (const e of [{}, { JEV_API_KEY: 'k' }]) {
    const result = await judge({ state: 'x', questions, expected: expectBoth, fixtureDir: dir, env: e });
    assert.equal(result.outcome, 'skipped');
    assert.match(result.reason, /^jev-fixture-missing/);
  }
});

test('an API error, a bad body, a timeout, or a used-up budget is a skip', async () => {
  const dir = await fixtures();
  const run = (fetchFn, budget = fresh()) => judge({ state: 'x', questions, expected: expectBoth, fixtureDir: dir, env, fetchFn, budget });
  assert.match((await run(reply({}, false, 503))).reason, /^jev-error: HTTP 503/);
  assert.match((await run(reply({ nope: 1 }))).reason, /^jev-error: no answers/);
  assert.match((await run(async () => { throw new Error('timeout'); })).reason, /^jev-error: timeout/);
  const spent = await run(async () => assert.fail('over budget'), { calls: MAX_CALLS, inputTokens: 0 });
  assert.match(spent.reason, /^jev-budget/);
  assert.deepEqual(await readdir(dir), [], 'a skipped call records nothing');
});

test('text over the limit is an invalid check, not a judged one', async () => {
  const result = await judge({ state: 'a'.repeat(MAX_STATE_CHARS + 1), questions, expected: {}, fixtureDir: await fixtures(), env: {} });
  assert.equal(result.outcome, 'invalid');
  assert.match(result.message, /Judge a smaller region/);
});

test('a question without an expected value fails the check', async () => {
  const dir = await fixtures();
  await writeFile(join(dir, `${requestHash(buildRequest('x', questions))}.json`), JSON.stringify({ response: answers(0.9, 'polite', 0.9) }));
  const result = await judge({ state: 'x', questions, expected: { clear: true }, fixtureDir: dir, env: {} });
  assert.deepEqual(result.failures, ['tone: no expected value']);
});
