import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkWorkflow, expressionsInRun } from '../check-workflows.mjs';
import { APP_CI, callerInputs, inlineReusable, REUSABLE_APP_CI } from '../lib/inline-ci.mjs';
import { loadAll } from '../lib/registry.mjs';
import { planTarget } from '../lib/sync-plan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const plan = (project) => planTarget({ root, data, target: data.sync.targets.find((t) => t.project === project), centralSha: 'a'.repeat(40) });
const ciOf = (p) => p.files.find((f) => f.path === APP_CI);

const reusable = `# how it is called
name: reusable-app-ci

on:
  workflow_call:
    inputs:
      node-version:
        type: string
        required: true
      e2e:
        type: boolean
        default: false
      e2e-visual:
        type: boolean
        default: false

permissions:
  contents: read

jobs:
  e2e:
    if: inputs.e2e && !inputs.e2e-visual
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/setup-node@x
        with:
          node-version: \${{ inputs.node-version }}
`;

test('callerInputs reads quoted strings and booleans from the with: block', () => {
  const caller = "jobs:\n  ci:\n    uses: x\n    with:\n      node-version: '24.21.0'\n      e2e: true\n";
  assert.deepEqual(callerInputs(caller), { 'node-version': '24.21.0', e2e: true });
});

test('inlineReusable fills inputs, applies defaults, and runs on push and pull_request', () => {
  const out = inlineReusable(reusable, { 'node-version': '24.21.0', e2e: true });
  assert.match(out, /^# public 리포는/);
  assert.match(out, /\nname: ci\n\non: \[push, pull_request\]\n\npermissions:/);
  assert.match(out, /if: true && !false\n/);
  assert.match(out, /node-version: 24\.21\.0\n/);
  assert.doesNotMatch(out, /inputs\.|workflow_call|how it is called/);
});

test('inlineReusable rejects unknown inputs and missing required ones', () => {
  assert.throws(() => inlineReusable(reusable, { 'node-version': '1', typo: true }), /unknown input\(s\): typo/);
  assert.throws(() => inlineReusable(reusable, {}), /required input node-version has no value/);
});

test('a public app gets the reusable workflow inlined; a private app keeps calling it (#209)', () => {
  const pub = ciOf(plan('workout-memo'));
  assert.equal(pub.source, REUSABLE_APP_CI);
  assert.match(pub.content, /^# 중앙 관리 파일\. 수정은 sirloinbh\/project-standards의 \.github\/workflows\/에서\n/);
  assert.doesNotMatch(pub.content, /uses: sirloinbh\/project-standards|inputs\./);
  assert.match(pub.content, /e2e-visual:\n    if: true && true\n/);
  assert.match(pub.content, /image: mcr\.microsoft\.com\/playwright:v1\.63\.0-noble@sha256:/);
  assert.match(pub.content, /POSTGRES_DB: 'workout_test'/);
  const priv = ciOf(plan('study-log'));
  assert.match(priv.content, /uses: sirloinbh\/project-standards\/\.github\/workflows\/reusable-app-ci\.yml@/);
});

test('the inlined workflow follows the central workflow rules', () => {
  const { content } = ciOf(plan('workout-memo'));
  assert.deepEqual(checkWorkflow(APP_CI, content, data.versions.actions, data.versions.runner), []);
  assert.deepEqual(expressionsInRun(APP_CI, content), []);
});
