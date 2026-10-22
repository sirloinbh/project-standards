export const stages = [
  'queued',
  'tests',
  'implementation',
  'review',
  'verification',
  'delivery',
  'ci',
  'done',
];

// Branch names follow std-git-writing: <type>/<issue>-<english-slug>.
export const branchTypes = ['feat', 'fix', 'docs', 'chore', 'refactor', 'test', 'ci'];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+){0,4}$/;
const issueUrl = /^https:\/\/github\.com\/([A-Za-z0-9-]+\/[A-Za-z0-9._-]+)\/issues\/(\d+)$/;

export function issueRepository(url) {
  return issueUrl.exec(url ?? '')?.[1] ?? null;
}

export function slugify(title) {
  const words = String(title)
    .replace(/^\s*\[[^\]]*\]\s*/, '')
    .replace(/^\s*[a-z]+(?:\([^)]*\))?:\s*/i, '')
    .toLowerCase()
    .match(/[a-z0-9]+/g);
  return words?.length ? words.slice(0, 5).join('-') : 'agent-task';
}

export function branchName(number, { type = 'feat', slug } = {}) {
  if (!branchTypes.includes(type)) throw new Error(`Invalid branch type: ${type}`);
  if (!slugPattern.test(slug)) throw new Error('Slug must be 1-5 lowercase English words joined by hyphens.');
  return `${type}/${number}-${slug}`;
}

// Jobs queued before the branch rule keep their recorded note path.
export const changeRecord = (job) => job.changeRecord ?? `docs/changes/${job.id}-agent-task.md`;

export function assertIssue(issue, repo = issueRepository(issue?.url)) {
  if (
    !Number.isSafeInteger(issue.number) ||
    issue.number < 1 ||
    !issue.title?.trim() ||
    !issue.body?.trim() ||
    !/(완료 기준|acceptance criteria)/i.test(issue.body) ||
    !repo ||
    issue.url !== `https://github.com/${repo}/issues/${issue.number}` ||
    (issue.state && issue.state !== 'OPEN')
  ) {
    throw new Error('Open project issue with a title, body and acceptance criteria is required.');
  }
}

export function createJob(issue, baseSha, { repo, type = 'feat', slug } = {}) {
  assertIssue(issue, repo);
  if (!/^[a-f0-9]{40}$/.test(baseSha)) throw new Error('A full base commit SHA is required.');
  const name = slug ?? slugify(issue.title);
  return {
    id: String(issue.number),
    issue: structuredClone(issue),
    baseSha,
    branch: branchName(issue.number, { type, slug: name }),
    changeRecord: `docs/changes/${issue.number}-${name}.md`,
    stage: 'queued',
    attempts: 0,
    history: [],
    results: {},
    createdAt: new Date().toISOString(),
  };
}

export function assertSnapshot(job, issue) {
  assertIssue(issue, issueRepository(job.issue.url));
  for (const key of ['number', 'title', 'body', 'updatedAt', 'url']) {
    if (job.issue[key] !== issue[key])
      throw new Error('Issue requirements changed. Reconcile the snapshot before retrying.');
  }
}

export function nextStage(stage) {
  const index = stages.indexOf(stage);
  if (index < 0 || index >= stages.length - 1) throw new Error(`Invalid transition from ${stage}`);
  return stages[index + 1];
}

export async function runStages(job, handlers) {
  if (['done', 'blocked', 'cancelled'].includes(job.stage)) return job;
  while (job.stage !== 'done') {
    const stage = job.stage;
    try {
      if (handlers.stopping?.()) return job;
      assertSnapshot(job, await handlers.issue(job));
      job.runningStage = stage;
      await handlers.save(job);
      const result = await handlers[stage === 'queued' ? 'prepare' : stage](job);
      if (result?.blocked || (result?.failed && stage !== 'ci'))
        throw new Error(result.summary || `${stage} failed`);
      job.results ??= {};
      job.results[stage] = result;
      job.runningStage = null;
      if (stage === 'ci' && result?.pending) {
        await handlers.save(job);
        return job;
      }
      job.history.push({ stage, at: new Date().toISOString(), summary: result?.summary });
      if ((stage === 'review' && result?.approved !== true) || (stage === 'ci' && result?.failed)) {
        job.attempts += 1;
        await handlers.event?.(job, {
          kind: 'repair-retry',
          failureKind: stage,
          attempt: job.attempts,
        });
        if (job.attempts >= (handlers.maxAttempts ?? 2))
          throw new Error(`${stage} retry limit reached.`);
        job.stage = 'implementation';
      } else {
        job.stage = nextStage(stage);
      }
      await handlers.save(job);
      if (stage === 'verification' && result?.reused) return job;
    } catch (error) {
      job.stage = 'blocked';
      job.blockedStage = stage;
      job.runningStage = null;
      job.error = error.message;
      job.failureKind =
        error.failureKind ||
        (stage === 'verification'
          ? 'test'
          : stage === 'review'
            ? 'review'
            : stage === 'ci'
              ? 'ci'
              : 'code');
      await handlers.event?.(job, {
        kind: 'blocked',
        stage,
        failureKind: job.failureKind,
        error: job.error,
      });
      await handlers.save(job);
      return job;
    }
  }
  return job;
}
