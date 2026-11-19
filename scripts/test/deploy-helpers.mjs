// Shared setup of the deploy-template tests (deploy-*.test.mjs): the rendered deploy files of every app (#36, ADR-0009).
// Not a test file itself, so `node --test scripts/test/*.test.mjs` does not run it.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from '../lib/registry.mjs';
import { renderProfile } from '../lib/templates.mjs';
import { buildVars } from '../lib/vars.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const { data } = loadAll(root);
export const appTargets = data.sync.targets.filter((t) => t.profile === 'app');
const render = (target) => {
  const files = renderProfile({ root, profile: 'app', folders: ['common', 'deploy', 'app'], vars: buildVars(data, target, { centralSha: 'abcdef1234567' }) });
  return Object.fromEntries(files.filter((f) => f.path.startsWith('deploy/')).map((f) => [f.path, f.content]));
};
export const rendered = Object.fromEntries(appTargets.map((t) => [t.project, render(t)]));
export const project = (name) => data.projects.projects.find((p) => p.name === name);
export const has = (cmd) => spawnSync(cmd, ['--version'], { encoding: 'utf8' }).status === 0;
export const DEPLOY_FILES = [
  'deploy/autodeploy.service',
  'deploy/autodeploy.sh',
  'deploy/autodeploy.timer',
  'deploy/backup.service',
  'deploy/backup.sh',
  'deploy/backup.timer',
  'deploy/health.service',
  'deploy/health.timer',
  'deploy/install-autodeploy.sh',
  'deploy/install-backup.sh',
  'deploy/notify.sh',
  'deploy/remote-deploy.sh',
  'deploy/report.service',
  'deploy/report.sh',
  'deploy/report.timer',
  'deploy/restore-check.service',
  'deploy/restore-check.timer',
  'deploy/ssm-get.sh',
];

