// Tests the managed backend file templates/jobs/backend/src/standard/jobs.ts (ADR-0018, #556) against an in-memory
// fake of the pg-boss 12 calls it uses. Node runs the file directly by stripping the types; it imports only types.
// The fake follows pg-boss 12.38's rules: a `failed` result is retried until retryLimit, a `deadletter` result
// skips the retries, a job that runs out of retries is copied to the queue's deadLetter (the copy keeps the failure in
// sourceOutput and sourceRetryCount, its own output is null), and a singletonKey is unique only per the queue policy's
// unique index (plans.js job_i1, i2, i3, i6): none on standard, created on short, active on singleton, per state on
// stately, created to active on exclusive.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEAD_LETTER_QUEUE,
  JOB_POOL_MAX,
  JOB_TIME_ZONE,
  jobBossOptions,
  jobsModeFromEnv,
  jobsStatus,
  jobsStatusData,
  MAX_ERROR_LENGTH,
  MAX_PAYLOAD_BYTES,
  NonRetryable,
  startJobs,
} from '../../templates/jobs/backend/src/standard/jobs.ts';

function fakeBoss() {
  const queues = new Map();
  const jobs = [];
  const workers = new Map();
  const schedules = new Map();
  const calls = [];
  let nextId = 1;
  const boss = {
    calls,
    jobs,
    started: false,
    stopped: null,
    async start() {
      boss.started = true;
    },
    async stop(options) {
      boss.stopped = options;
    },
    async getQueue(name) {
      return queues.get(name) ?? null;
    },
    async createQueue(name, options = {}) {
      calls.push(['createQueue', name, options]);
      if (!queues.has(name)) queues.set(name, { name, ...options });
    },
    async updateQueue(name, options = {}) {
      calls.push(['updateQueue', name, options]);
      if (Object.keys(options).length === 0) throw new Error('no properties found to update'); // as pg-boss 12
      queues.set(name, { ...queues.get(name), ...options });
    },
    async work(name, options, handler) {
      calls.push(['work', name, options]);
      workers.set(name, handler);
      return `worker-${name}`;
    },
    async send(name, data, options = {}) {
      calls.push(['send', name, data, options]);
      const key = options.singletonKey ?? null;
      const policy = queues.get(name)?.policy ?? 'standard';
      const blocking = { standard: [], short: ['created'], singleton: [], stately: ['created'], exclusive: ['created', 'retry', 'active'] }[policy];
      if (jobs.some((j) => j.name === name && j.singletonKey === key && blocking.includes(j.state))) return null;
      const job = { id: String(nextId++), name, data, singletonKey: key ?? null, state: 'created', retryCount: 0, createdOn: new Date(), completedOn: null, output: null };
      jobs.push(job);
      return job.id;
    },
    async schedule(name, cron, data, options) {
      calls.push(['schedule', name, cron, data, options]);
      schedules.set(name, { name, cron, timezone: options?.tz ?? 'UTC', lastJobId: null });
    },
    async unschedule(name) {
      calls.push(['unschedule', name]);
      schedules.delete(name);
    },
    async getSchedules() {
      return [...schedules.values()];
    },
    async getQueues() {
      return [...queues.values(), { name: '__pgboss__send-it' }].map((q) => {
        const own = jobs.filter((j) => j.name === q.name);
        const count = (states) => own.filter((j) => states.includes(j.state)).length;
        return { ...q, queuedCount: count(['created', 'retry']), activeCount: count(['active']), failedCount: count(['failed']), deferredCount: 0, totalCount: own.length };
      });
    },
    async findJobs(name, { limit = 1000, after } = {}) {
      const own = jobs.filter((j) => j.name === name);
      const start = after ? own.findIndex((j) => j.id === after) + 1 : 0;
      return own.slice(start, start + limit);
    },
    /** Works every waiting job once, like one polling pass. */
    async drain() {
      for (const job of jobs.filter((j) => j.state === 'created' || j.state === 'retry')) {
        const handler = workers.get(job.name);
        if (!handler) continue;
        job.state = 'active';
        const [result] = await handler([{ id: job.id, name: job.name, data: job.data, retryCount: job.retryCount }]);
        const queue = queues.get(job.name);
        job.output = result.output ?? null;
        if (result.status === 'completed') {
          job.state = 'completed';
          job.completedOn = new Date();
        } else if (result.status === 'failed' && job.retryCount < queue.retryLimit) {
          job.state = 'retry';
          job.retryCount += 1;
        } else {
          job.state = 'failed';
          if (queue.deadLetter) {
            jobs.push({ ...job, id: String(nextId++), name: queue.deadLetter, state: 'created', retryCount: 0, output: null, sourceName: job.name, sourceOutput: job.output, sourceRetryCount: job.retryCount });
          }
        }
      }
    },
    async drainAll() {
      for (let i = 0; i < 10; i += 1) await boss.drain();
    },
  };
  return boss;
}

const quiet = () => {
  const lines = [];
  const log = (line) => lines.push(line);
  return { lines, log };
};

test('jobBossOptions uses the app database, the pgboss schema and a pool of 2', () => {
  assert.deepEqual(jobBossOptions('postgres://x'), { connectionString: 'postgres://x', schema: 'pgboss', max: JOB_POOL_MAX, application_name: 'jobs' });
  assert.ok(JOB_POOL_MAX >= 2 && JOB_POOL_MAX <= 3);
});

test('jobsModeFromEnv defaults to working in the api process', () => {
  assert.equal(jobsModeFromEnv({}), 'all');
  assert.equal(jobsModeFromEnv({ JOBS_MODE: 'send' }), 'send');
  assert.equal(jobsModeFromEnv({ JOBS_MODE: 'off' }), 'off');
  assert.equal(jobsModeFromEnv({ JOBS_MODE: 'worker' }), 'all');
});

test('startJobs creates the dead-letter queue first and every queue with backoff retries pointing at it', async () => {
  const boss = fakeBoss();
  await startJobs(boss, [{ name: 'prices', policy: 'singleton', retryLimit: 6, handler: async () => {} }], { log: quiet().log });
  assert.equal(boss.started, true);
  const created = boss.calls.filter((c) => c[0] === 'createQueue');
  assert.deepEqual(created.map((c) => c[1]), [DEAD_LETTER_QUEUE, 'prices']);
  assert.deepEqual(created[1][2], { policy: 'singleton', retryLimit: 6, retryDelay: 30, retryBackoff: true, deadLetter: DEAD_LETTER_QUEUE });
  assert.deepEqual(boss.calls.find((c) => c[0] === 'work').slice(1, 3), ['prices', { batchSize: 1, perJobResults: true }]);
});

test('a second start updates existing queues without the fixed policy', async () => {
  const boss = fakeBoss();
  const queues = [{ name: 'prices', policy: 'singleton', handler: async () => {} }];
  await startJobs(boss, queues, { log: quiet().log });
  await startJobs(boss, [{ ...queues[0], retryLimit: 5 }], { log: quiet().log });
  const update = boss.calls.filter((c) => c[0] === 'updateQueue' && c[1] === 'prices').at(-1);
  assert.equal(update[2].retryLimit, 5);
  assert.equal('policy' in update[2], false);
});

test('start fails with a clear error when an existing queue has another policy (#681)', async () => {
  const boss = fakeBoss();
  await startJobs(boss, [{ name: 'prices', handler: async () => {} }], { log: quiet().log });
  await assert.rejects(
    startJobs(boss, [{ name: 'prices', policy: 'singleton', handler: async () => {} }], { log: quiet().log }),
    /Queue "prices" already exists with policy "standard", but the code asks for "singleton".*new name/,
  );
  // The same policy is fine, and nothing was updated by the failed start.
  await startJobs(boss, [{ name: 'prices', handler: async () => {} }], { log: quiet().log });
});

test('408, 425 and 429 are retried like a 5xx, not dead-lettered (#681)', async () => {
  for (const status of [408, 425, 429]) {
    const boss = fakeBoss();
    const { lines, log } = quiet();
    const jobs = await startJobs(boss, [{ name: 'upstream', retryLimit: 1, handler: async () => { throw Object.assign(new Error('slow down'), { status }); } }], { log });
    await jobs.send('upstream', { id: 1 });
    await boss.drainAll();
    assert.deepEqual(lines.map((l) => l.result), ['retry', 'failed'], String(status));
    assert.equal(boss.jobs.filter((j) => j.name === DEAD_LETTER_QUEUE).length, 1, String(status));
  }
});

test('a failing job is retried until its retry limit, then copied to the dead-letter queue', async () => {
  const boss = fakeBoss();
  const { lines, log } = quiet();
  let runs = 0;
  const jobs = await startJobs(boss, [{ name: 'flaky', retryLimit: 2, handler: async () => { runs += 1; throw new Error('source down'); } }], { log });
  await jobs.send('flaky', { id: 1 }, { requestId: 'req-1' });
  await boss.drainAll();
  assert.equal(runs, 3);
  assert.deepEqual(lines.map((l) => l.result), ['retry', 'retry', 'failed']);
  assert.deepEqual(lines.map((l) => l.attempt), [1, 2, 3]);
  assert.ok(lines.every((l) => l.queue === 'flaky' && l.requestId === 'req-1' && l.message === 'source down'));
  const dead = boss.jobs.filter((j) => j.name === DEAD_LETTER_QUEUE);
  assert.equal(dead.length, 1);
  assert.equal(dead[0].sourceName, 'flaky');
});

test('a job that succeeds on a retry completes and logs ok', async () => {
  const boss = fakeBoss();
  const { lines, log } = quiet();
  let runs = 0;
  const jobs = await startJobs(boss, [{ name: 'once-flaky', handler: async () => { runs += 1; if (runs === 1) throw new Error('timeout'); } }], { log });
  await jobs.send('once-flaky', { id: 1 });
  await boss.drainAll();
  assert.deepEqual(lines.map((l) => l.result), ['retry', 'ok']);
  assert.equal(boss.jobs[0].state, 'completed');
});

test('NonRetryable, a 4xx HttpError and a zod error dead-letter at once without retries', async () => {
  for (const error of [new NonRetryable('bad input'), Object.assign(new Error('Not found'), { status: 404 }), Object.assign(new Error('invalid'), { name: 'ZodError' })]) {
    const boss = fakeBoss();
    const { lines, log } = quiet();
    let runs = 0;
    const jobs = await startJobs(boss, [{ name: 'strict', retryLimit: 5, handler: async () => { runs += 1; throw error; } }], { log });
    await jobs.send('strict', { id: 1 });
    await boss.drainAll();
    assert.equal(runs, 1, error.name);
    assert.deepEqual(lines.map((l) => [l.result, l.level]), [['dead-letter', 'error']]);
    assert.equal(boss.jobs.filter((j) => j.name === DEAD_LETTER_QUEUE).length, 1);
  }
});

test('a 5xx error is retried, not dead-lettered', async () => {
  const boss = fakeBoss();
  const { lines, log } = quiet();
  const jobs = await startJobs(boss, [{ name: 'upstream', retryLimit: 1, handler: async () => { throw Object.assign(new Error('bad gateway'), { status: 502 }); } }], { log });
  await jobs.send('upstream', { id: 1 });
  await boss.drainAll();
  assert.deepEqual(lines.map((l) => l.result), ['retry', 'failed']);
});

test('send with the same key on an exclusive queue is a no-op, so a double click queues one job', async () => {
  const boss = fakeBoss();
  let runs = 0;
  const jobs = await startJobs(boss, [{ name: 'receipt', policy: 'exclusive', handler: async () => { runs += 1; } }], { log: quiet().log });
  const first = await jobs.send('receipt', { entryId: 42 }, { key: 'entry-42' });
  const second = await jobs.send('receipt', { entryId: 42 }, { key: 'entry-42' });
  assert.ok(first);
  assert.equal(second, null);
  await boss.drainAll();
  assert.equal(runs, 1);
  assert.deepEqual(boss.calls.find((c) => c[0] === 'send')[3], { singletonKey: 'entry-42' });
});

test('the handler gets the input, not the wrapper, plus its attempt and request ID', async () => {
  const boss = fakeBoss();
  const seen = [];
  const jobs = await startJobs(boss, [{ name: 'echo', handler: async (input, job) => { seen.push([input, job.attempt, job.requestId]); } }], { log: quiet().log });
  await jobs.send('echo', { entryId: 7 }, { requestId: 'req-9' });
  await boss.drainAll();
  assert.deepEqual(seen, [[{ entryId: 7 }, 1, 'req-9']]);
  assert.deepEqual(boss.jobs[0].data, { input: { entryId: 7 }, requestId: 'req-9' });
});

test('send refuses an unknown queue and a payload over the size limit', async () => {
  const jobs = await startJobs(fakeBoss(), [{ name: 'small', handler: async () => {} }], { log: quiet().log });
  await assert.rejects(jobs.send('other', {}), /Unknown queue/);
  await assert.rejects(jobs.send('small', { text: 'x'.repeat(MAX_PAYLOAD_BYTES) }), /over 4096 bytes/);
});

test('queue names must be unique and not the dead-letter queue', async () => {
  const handler = async () => {};
  await assert.rejects(startJobs(fakeBoss(), [{ name: 'a', handler }, { name: 'a', handler }]), /unique/);
  await assert.rejects(startJobs(fakeBoss(), [{ name: DEAD_LETTER_QUEUE, handler }]), /unique/);
});

test('schedules run in Asia/Seoul, and a schedule removed from the code is unscheduled', async () => {
  const boss = fakeBoss();
  const handler = async () => {};
  await startJobs(boss, [{ name: 'prices', handler, schedule: '0 12-18 * * *' }], { log: quiet().log });
  const call = boss.calls.find((c) => c[0] === 'schedule');
  assert.deepEqual(call.slice(1), ['prices', '0 12-18 * * *', { input: {}, requestId: null }, { tz: JOB_TIME_ZONE }]);
  assert.equal(JOB_TIME_ZONE, 'Asia/Seoul');
  await startJobs(boss, [{ name: 'prices', handler }], { log: quiet().log });
  assert.ok(boss.calls.some((c) => c[0] === 'unschedule' && c[1] === 'prices'));
});

test('mode send sets up queues and schedules but does not work them; mode off never starts pg-boss', async () => {
  const send = fakeBoss();
  await startJobs(send, [{ name: 'q', handler: async () => {}, schedule: '0 * * * *' }], { mode: 'send', log: quiet().log });
  assert.equal(send.calls.some((c) => c[0] === 'work'), false);
  assert.equal(send.calls.some((c) => c[0] === 'schedule'), true);

  const off = fakeBoss();
  const jobs = await startJobs(off, [{ name: 'q', handler: async () => {} }], { mode: 'off', log: quiet().log });
  assert.equal(off.started, false);
  assert.equal(await jobs.send('q', {}), null);
  await jobs.stop();
  assert.equal(off.stopped, null);
});

test('stop waits for running jobs with a timeout shorter than docker stop', async () => {
  const boss = fakeBoss();
  const jobs = await startJobs(boss, [{ name: 'q', handler: async () => {} }], { log: quiet().log });
  await jobs.stop();
  assert.equal(boss.stopped.graceful, true);
  assert.ok(boss.stopped.timeout > 0 && boss.stopped.timeout < 10_000);
});

test('the status view lists counts, recent and failed jobs, dead-lettered jobs and schedules, never the input', async () => {
  const boss = fakeBoss();
  const jobs = await startJobs(
    boss,
    [
      { name: 'ok', handler: async () => {}, schedule: '0 12 * * *' },
      { name: 'bad', retryLimit: 0, handler: async () => { throw new Error('nope'); } },
    ],
    { log: quiet().log },
  );
  await jobs.send('ok', { secretish: 'x' }, { requestId: 'req-1' });
  await jobs.send('bad', { id: 2 });
  await boss.drainAll();
  const status = await jobsStatusData(boss);
  assert.deepEqual(status.queues.map((q) => q.name).sort(), ['bad', DEAD_LETTER_QUEUE, 'ok']);
  assert.equal(status.recent.ok[0].state, 'completed');
  assert.equal(status.recent.ok[0].requestId, 'req-1');
  assert.deepEqual(status.failed.map((j) => j.error), ['nope']);
  assert.equal(status.deadLetter.length, 1);
  assert.equal(status.deadLetter[0].from, 'bad');
  assert.deepEqual(status.schedules, [{ name: 'ok', cron: '0 12 * * *', timezone: 'Asia/Seoul', lastJobId: null }]);
  assert.equal(JSON.stringify(status).includes('secretish'), false);
});

test('a key on a standard queue throws, because pg-boss would not dedupe it', async () => {
  const jobs = await startJobs(fakeBoss(), [{ name: 'plain', handler: async () => {} }], { log: quiet().log });
  await assert.rejects(jobs.send('plain', { id: 1 }, { key: 'k' }), /standard, so a key would not dedupe/);
  assert.ok(await jobs.send('plain', { id: 1 }));
});

test('a singleton queue keeps one run per key but accepts a queued duplicate', async () => {
  const jobs = await startJobs(fakeBoss(), [{ name: 'one-at-a-time', policy: 'singleton', handler: async () => {} }], { log: quiet().log });
  assert.ok(await jobs.send('one-at-a-time', {}, { key: 'k' }));
  assert.ok(await jobs.send('one-at-a-time', {}, { key: 'k' }));
});

test('a throwing log does not fail a job that succeeded', async () => {
  const boss = fakeBoss();
  const jobs = await startJobs(boss, [{ name: 'q', handler: async () => {} }], { log: () => { throw new Error('stdout closed'); } });
  await jobs.send('q', {});
  await boss.drainAll();
  assert.equal(boss.jobs[0].state, 'completed');
});

test('a long error message is cut before it is stored, logged or shown', async () => {
  const boss = fakeBoss();
  const { lines, log } = quiet();
  const jobs = await startJobs(boss, [{ name: 'q', retryLimit: 0, handler: async () => { throw new Error('x'.repeat(5000)); } }], { log });
  await jobs.send('q', {});
  await boss.drainAll();
  assert.equal(lines[0].message.length, MAX_ERROR_LENGTH);
  assert.equal(boss.jobs[0].output.message.length, MAX_ERROR_LENGTH);
});

test('the dead-letter entries show the original error and attempts from the source fields', async () => {
  const boss = fakeBoss();
  const jobs = await startJobs(boss, [{ name: 'bad', retryLimit: 2, retryDelay: 1, handler: async () => { throw new Error('gone'); } }], { log: quiet().log });
  await jobs.send('bad', {});
  await boss.drainAll();
  const [dead] = (await jobsStatusData(boss)).deadLetter;
  assert.deepEqual([dead.from, dead.error, dead.attempt], ['bad', 'gone', 3]);
});

test('the status view takes the newest jobs even past the first page of findJobs', async () => {
  const boss = fakeBoss();
  const jobs = await startJobs(boss, [{ name: 'busy', handler: async () => {} }], { log: quiet().log });
  for (let i = 0; i < 1005; i += 1) await jobs.send('busy', {}, { requestId: `req-${i}` });
  const { recent } = await jobsStatusData(boss);
  assert.equal(recent.busy.length, 10);
  assert.equal(recent.busy[0].requestId, 'req-1004');
});

test('in all mode a schedule whose queue left the code is removed; send mode leaves schedules alone', async () => {
  const boss = fakeBoss();
  const handler = async () => {};
  await startJobs(boss, [{ name: 'a', handler, schedule: '0 * * * *' }, { name: 'b', handler, schedule: '0 1 * * *' }], { log: quiet().log });
  await startJobs(boss, [{ name: 'a', handler, schedule: '0 * * * *' }], { mode: 'send', log: quiet().log });
  assert.deepEqual((await boss.getSchedules()).map((s) => s.name), ['a', 'b']);
  await startJobs(boss, [{ name: 'a', handler, schedule: '0 * * * *' }], { log: quiet().log });
  assert.deepEqual((await boss.getSchedules()).map((s) => s.name), ['a']);
});

test('jobsStatus answers the status data as JSON', async () => {
  const boss = fakeBoss();
  await startJobs(boss, [{ name: 'q', handler: async () => {} }], { log: quiet().log });
  let body;
  await jobsStatus(boss)({}, { json: (value) => { body = value; } });
  assert.deepEqual(Object.keys(body), ['queues', 'recent', 'failed', 'deadLetter', 'schedules']);
});
