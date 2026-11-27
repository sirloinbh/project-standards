// Sync central templates into project repositories.
// Usage:
//   node scripts/sync.mjs --dry-run --out <folder> [--target <owner/repo>]... [--local <repo-name>=<checkout>]... [--sha <commit>]
// --dry-run writes what each target would receive into <folder>/<repo-name>/ plus <folder>/plan.json.
// --local reads a local checkout so project sections and package.json fields merge with real files.
// --labels-from <repo-name>=<file> reads a target's labels exported with
// `label list --json name,color,description --limit 200` and adds the planned label changes to plan.json.
//   node scripts/sync.mjs --apply
// --apply (sync workflow only) opens or updates sync PRs for enabled targets and creates or
// updates their issue labels (templates/common/labels.json), using the GitHub App credentials in
// SYNC_APP_ID and SYNC_APP_PRIVATE_KEY.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, getInstallationToken } from './lib/github-app.mjs';
import { describeLabelPlan, loadLabels, planLabels, syncLabels } from './lib/labels.mjs';
import { resolveDesignSystem } from './lib/design-system.mjs';
import { loadAll } from './lib/registry.mjs';
import { planTarget } from './lib/sync-plan.mjs';
import { syncTarget } from './lib/sync-pr.mjs';
import { autoMergeSyncPr } from './lib/sync-merge.mjs';
import { DEFAULT_WAIT, describeHold, groupWaves, waitForChecks } from './lib/sync-waves.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Last central commit (at or before `sha`) that changed a reusable workflow; CI callers pin to it. */
export function lastWorkflowCommit(sha) {
  const out = execFileSync('git', ['log', '-1', '--format=%H', sha, '--', '.github/workflows/reusable-app-ci.yml', '.github/workflows/reusable-infra-ci.yml', '.github/workflows/reusable-service-ci.yml'], { cwd: root, encoding: 'utf8' }).trim();
  if (!out) throw new Error('could not find the commit that last changed the reusable workflows (is the checkout shallow?)');
  return out;
}

function parseArgs(argv) {
  const args = { dryRun: false, out: null, targets: [], local: {}, labelsFrom: {}, sha: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--target') args.targets.push(argv[++i]);
    else if (a === '--sha') args.sha = argv[++i];
    else if (a === '--local') {
      const [name, dir] = argv[++i].split('=');
      args.local[name] = path.resolve(dir);
    } else if (a === '--labels-from') {
      const [name, file] = argv[++i].split('=');
      args.labelsFrom[name] = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8').replace(/^﻿/, ''));
    } else throw new Error(`unknown argument: ${a}`);
  }
  return args;
}

const readerFor = (dir) => (rel) => {
  if (!dir) return null;
  const file = path.join(dir, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
};

// Label plan for the dry run; null when the target's current labels were not given.
const labelSummary = (labels, existing) => {
  if (!existing) return null;
  const plan = planLabels(labels, existing);
  return { create: plan.create.map((l) => l.name), update: plan.update.map((u) => ({ name: u.name, changes: u.changes })), unchanged: plan.unchanged.length, unmanaged: plan.unmanaged };
};

export function dryRun({ data, targets, local, labelsFrom = {}, out, centralSha, workflowSha = centralSha }) {
  const labels = loadLabels(root);
  const summary = [];
  for (const target of targets) {
    const name = target.repo.split('/')[1];
    const plan = planTarget({ root, data, target, centralSha, workflowSha, readExisting: readerFor(local[name]) });
    const dir = path.join(out, name);
    for (const f of plan.files) {
      fs.mkdirSync(path.dirname(path.join(dir, f.path)), { recursive: true });
      fs.writeFileSync(path.join(dir, f.path), f.content);
    }
    summary.push({
      repo: target.repo,
      profile: target.profile,
      wave: target.wave ?? null,
      enabled: plan.enabled,
      localCheckout: Boolean(local[name]),
      files: plan.files.map((f) => ({ path: f.path, mode: f.mode, source: f.source })),
      skipped: plan.skipped,
      fieldsPending: plan.fieldsPending,
      labels: labelSummary(labels, labelsFrom[name]),
    });
  }
  const overview = { centralSha, labels: labels.map((l) => l.name), targets: summary };
  fs.writeFileSync(path.join(out, 'plan.json'), `${JSON.stringify(overview, null, 2)}\n`);
  return summary;
}

/**
 * Opens or updates sync PRs for targets that are not `enabled: false`. `getToken(repo)` returns an installation
 * token. With no enabled target it only checks that a token can be issued (docs/github-app.md step 5).
 * Each target's issue labels are then created or updated; a label failure is reported in `labelsError`.
 * `centralToken` reads the central repo's releases and publish runs. The workflow passes its own
 * GITHUB_TOKEN (actions: read) because the App has no Actions permission (#205).
 */
export async function apply({ data, targets, centralSha, workflowSha = centralSha, getToken, makeClient, centralToken, labels = loadLabels(root), log = console.log, allWaves = false, wait = {}, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), syncTargetFn = syncTarget, autoMergeFn = autoMergeSyncPr, centralPr = () => centralPrNumber(centralSha) }) {
  const enabled = targets.filter((t) => t.enabled !== false);
  if (!enabled.length) {
    await getToken('sirloinbh/project-standards');
    log(`Installation token issued. Every target is disabled, so there is nothing to sync.`);
    return [];
  }
  const centralApi = makeClient(centralToken ?? (await getToken('sirloinbh/project-standards')));
  const opts = { ...DEFAULT_WAIT, ...wait };
  const results = [];

  async function syncOne(target) {
    let api;
    try {
      api = makeClient(await getToken(target.repo));
      const result = await syncTargetFn({ root, data, target, centralSha, workflowSha, api, centralApi });
      log(`${target.repo}: ${result.status}${result.pr ? ` ${result.pr}` : ''} (changed ${result.changes.length}, deleted ${result.deletions.length})`);
      if (result.status === 'kept') log(`::warning::${target.repo}: The sync PR has a commit added by hand, so it was not updated. ${result.pr}`);
      results.push({ target: target.repo, ...result });
    } catch (error) {
      log(`${target.repo}: failed: ${error.message}`);
      results.push({ target: target.repo, status: 'failed', error: error.message });
    }
    if (!api) return { api: null, result: results.at(-1) };
    // Labels are independent of the sync PR, so they are applied even when the PR step failed.
    const result = results.at(-1);
    try {
      result.labels = await syncLabels({ api, repo: target.repo, labels });
      log(`${target.repo}: ${describeLabelPlan(result.labels)}`);
    } catch (error) {
      log(`${target.repo}: label failure: ${error.message}`);
      result.labelsError = error.message;
    }
    return { api, result };
  }

  // All waves at once for an urgent fix; otherwise one wave after another (#1055).
  const waves = allWaves ? [{ wave: 0, label: 'all', targets: enabled }] : groupWaves(enabled);
  for (const [index, wave] of waves.entries()) {
    if (waves.length > 1) log(`Wave ${wave.label}: ${wave.targets.map((t) => t.repo).join(', ')}`);
    const synced = [];
    for (const target of wave.targets) synced.push({ target, ...(await syncOne(target)) });
    if (index === waves.length - 1) break;

    // The next wave starts only when every sync PR of this wave is green.
    const failures = synced.filter((s) => s.result.status === 'failed').map((s) => ({ target: s.target.repo, reason: `sync failed: ${s.result.error}` }));
    const deadline = Date.now() + opts.timeoutMs;
    for (const s of synced.filter((x) => ['opened', 'updated'].includes(x.result.status))) {
      try {
        const checked = await waitForChecks({ api: s.api, repo: s.target.repo, branch: s.result.branch, sleep, deadline, pollMs: opts.pollMs, noChecksGraceMs: opts.noChecksGraceMs, log });
        s.result.checks = checked.state;
        log(`${s.target.repo}: checks ${checked.state} (${checked.detail})`);
        if (checked.state !== 'green') failures.push({ target: s.target.repo, reason: `CI ${checked.state}: ${checked.detail}` });
      } catch (error) {
        // Until the App has Checks: Read, the gate cannot work. Keep syncing as before and say so loudly (no regression).
        if (/ 403 /.test(error.message)) {
          s.result.checks = 'unverified';
          log(`::warning::${s.target.repo}: the sync App cannot read check runs (grant Checks: Read, docs/github-app.md), so wave ${wave.label} was not verified and the next wave is not held`);
          continue;
        }
        s.result.checks = 'error';
        log(`${s.target.repo}: could not read checks: ${error.message}`);
        failures.push({ target: s.target.repo, reason: `could not read checks: ${error.message}` });
      }
    }
    if (!failures.length) continue;

    const held = waves.slice(index + 1).flatMap((w) => w.targets.map((t) => t.repo));
    for (const repo of held) results.push({ target: repo, status: 'held', heldByWave: wave.label, changes: [], deletions: [] });
    const message = describeHold({ wave: wave.label, failures, held });
    log(`::warning::${message}`);
    await commentOnCentral({ centralApi: makeClient(await getToken('sirloinbh/project-standards')), centralSha, number: centralPr(), message, log });
    results.push({ target: 'waves', status: 'failed', error: message });
    break;
  }

  // Targets with `autoMergeSync` merge their own sync PR once its checks are green (#1105). Others stay open for review.
  const deadline = Date.now() + opts.timeoutMs;
  for (const target of enabled.filter((t) => t.autoMergeSync)) {
    const result = results.find((r) => r.target === target.repo);
    if (!result || !['opened', 'updated'].includes(result.status)) continue;
    try {
      const api = makeClient(await getToken(target.repo));
      const merge = await autoMergeFn({ api, repo: target.repo, result, sleep, deadline, pollMs: opts.pollMs, noChecksGraceMs: opts.noChecksGraceMs, log });
      result.merged = merge.merged;
      if (!merge.merged) result.mergeSkipped = merge.reason;
    } catch (error) {
      log(`::warning::${target.repo}: automatic merge failed: ${error.message}. The sync PR stays open for review.`);
      result.merged = false;
      result.mergeSkipped = error.message;
    }
  }
  return results;
}

/** The PR number when the central commit is a merge commit of a PR; null otherwise. */
export function centralPrNumber(sha) {
  try {
    const subject = execFileSync('git', ['log', '-1', '--format=%s', sha], { cwd: root, encoding: 'utf8' });
    const number = subject.match(/^Merge pull request #(\d+) from /)?.[1];
    return number ? Number(number) : null;
  } catch {
    return null;
  }
}

// Best effort: the workflow warning above is the main report. Uses the App's Issues permission, which also covers PR comments.
async function commentOnCentral({ centralApi, centralSha, number, message, log }) {
  if (!number) return;
  try {
    await centralApi('POST', `/repos/sirloinbh/project-standards/issues/${number}/comments`, { body: `Sync of \`${centralSha.slice(0, 7)}\` to the downstream repos was held.

${message}` });
  } catch (error) {
    log(`could not comment on project-standards#${number}: ${error.message}`);
  }
}

const isMain = process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
/** Adds the pinned design-system release (or null before the first release) to the loaded data; fails when the pin cannot be fetched. */
export function withDesignSystem(data) {
  data.designSystemRelease = resolveDesignSystem({ pin: data.versions['design-system'], cacheDir: path.join(root, '.local/design-system') });
  return data;
}

if (isMain && process.argv.includes('--apply')) {
  const { data } = loadAll(root);
  withDesignSystem(data);
  const centralSha = process.env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const credentials = { appId: process.env.SYNC_APP_ID, privateKey: process.env.SYNC_APP_PRIVATE_KEY };
  if (!process.env.GITHUB_TOKEN) {
    console.error('sync: GITHUB_TOKEN is missing (sync.yml passes github.token to read releases and publish runs)');
    process.exit(1);
  }
  apply({
    data,
    targets: data.sync.targets,
    centralSha,
    workflowSha: lastWorkflowCommit(centralSha),
    getToken: async (repo) => (await getInstallationToken({ ...credentials, repo })).token,
    makeClient: (token) => createClient({ token }),
    centralToken: process.env.GITHUB_TOKEN,
    allWaves: process.env.SYNC_ALL_WAVES === 'true',
  })
    .then((results) => process.exit(results.some((r) => r.status === 'failed' || r.labelsError) ? 1 : 0))
    .catch((error) => {
      console.error(`sync: ${error.message}`);
      process.exit(1);
    });
} else if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.dryRun) throw new Error('use --dry-run --out <folder> to preview, or --apply in the sync workflow');
    if (!args.out) throw new Error('--dry-run needs --out <folder>');
    const { data } = loadAll(root);
    withDesignSystem(data);
    const targets = args.targets.length ? data.sync.targets.filter((t) => args.targets.includes(t.repo)) : data.sync.targets;
    const ordered = groupWaves(targets).flatMap((w) => w.targets);
    if (args.targets.length && targets.length !== args.targets.length) throw new Error(`unknown target in ${args.targets.join(', ')}`);
    const centralSha = args.sha ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    fs.mkdirSync(args.out, { recursive: true });
    for (const name of Object.keys(args.labelsFrom)) {
      if (!targets.some((t) => t.repo.split('/')[1] === name)) throw new Error(`--labels-from: unknown target ${name}`);
    }
    for (const t of dryRun({ data, targets: ordered, local: args.local, labelsFrom: args.labelsFrom, out: path.resolve(args.out), centralSha, workflowSha: args.sha ? args.sha : lastWorkflowCommit(centralSha) })) {
      const note = [t.enabled ? 'enabled' : 'disabled', t.skipped.length && `skipped ${t.skipped.length}`, t.fieldsPending.length && `fields not merged ${t.fieldsPending.length}`, t.labels && describeLabelPlan(t.labels)].filter(Boolean).join(', ');
      console.log(`wave ${t.wave ?? 'last'}: ${t.repo}: ${t.files.length} file(s) — ${note}`);
    }
    console.log(`Result: ${path.resolve(args.out)}`);
  } catch (error) {
    console.error(`sync: ${error.message}`);
    process.exit(1);
  }
}
