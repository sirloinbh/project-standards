import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkAll, loadAll, serviceHost } from '../lib/registry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const original = loadAll(root);
const today = '2026-10-22';

// Each test mutates its own deep copy of the committed files.
const fixture = (mutate) => {
  const copy = structuredClone(original);
  mutate(copy.data);
  return checkAll(copy, { today });
};
const byName = (data, name) => data.projects.projects.find((p) => p.name === name);

test('the committed registry, versions, and sync config pass', () => {
  assert.deepEqual(checkAll(original, { today }), { errors: [], warnings: [] });
});

test('every active project has six ports that follow the slot formula', () => {
  for (const p of original.data.projects.projects) {
    assert.equal(p.ports.web, 8100 + p.slot, p.name);
    assert.equal(p.ports.db, 15400 + p.slot, p.name);
  }
});

test('schema errors stop cross-file checks and name the file', () => {
  const { errors } = fixture((d) => {
    byName(d, 'study-log').allowedDifferences.push({ path: 'compose.yaml', reason: '', until: null });
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^registry\/projects\.json \/projects\/1\/allowedDifferences\/0\/reason: must be at least 5 characters/);
});

test('detects duplicate ports across projects even between different kinds', () => {
  const { errors } = fixture((d) => {
    byName(d, 'study-log').ports.vite = byName(d, 'workout-memo').ports.e2eWeb;
  });
  assert.ok(errors.some((e) => e.startsWith('port "5301" is used by workout-memo.e2eWeb, study-log.vite')), errors.join('\n'));
  assert.ok(errors.some((e) => e.includes('study-log.ports.vite is 5301, expected 5202')));
});

test('detects duplicate slot, name, repository, and database names', () => {
  const { errors } = fixture((d) => {
    const health = byName(d, 'health-log');
    health.slot = 2;
    health.repos.db = 'study-log-db';
    health.db.testName = 'study';
  });
  assert.ok(errors.some((e) => e.startsWith('slot "2" is used by study-log, health-log')));
  assert.ok(errors.some((e) => e.startsWith('repository "study-log-db"')));
  assert.ok(errors.some((e) => e.startsWith('database name "study"')));
});

test('null domains and AWS prefixes are not duplicates, real values are', () => {
  assert.deepEqual(fixture(() => {}).errors, []);
  const { errors } = fixture((d) => {
    for (const name of ['study-log', 'health-log']) {
      byName(d, name).service = { domain: 'example.com', subdomain: 'shared' };
      byName(d, name).aws.prefix = 'shared';
    }
  });
  assert.ok(errors.some((e) => e.startsWith('subdomain "shared" is used by study-log, health-log')), errors.join('\n'));
  assert.ok(errors.some((e) => e.startsWith('service host "shared.example.com"')));
  assert.ok(errors.some((e) => e.startsWith('AWS prefix "shared"')));
});

test('each subdomain is the app name under the root domain (ADR-0012)', () => {
  for (const p of original.data.projects.projects) {
    assert.equal(p.service.subdomain, p.name);
    assert.equal(serviceHost(p, { rootDomain: null }), null);
    assert.equal(serviceHost(p, { rootDomain: 'example.com' }), `${p.name}.example.com`);
  }
  // A per-app domain overrides the root domain.
  assert.equal(serviceHost({ service: { domain: 'other.net', subdomain: 'study-log' } }, { rootDomain: 'example.com' }), 'study-log.other.net');
  const { errors } = fixture((d) => {
    d.platform.rootDomain = 'example.com';
    byName(d, 'study-log').service.subdomain = 'workout-memo';
  });
  assert.ok(errors.some((e) => e.startsWith('subdomain "workout-memo" is used by workout-memo, study-log')), errors.join('\n'));
  assert.ok(errors.some((e) => e.startsWith('service host "workout-memo.example.com"')));
  assert.ok(errors.some((e) => e === 'study-log: service.subdomain "workout-memo" must equal name (ADR-0012)'));
});

test('subdomains must be one DNS label and not a reserved name', () => {
  const reserved = fixture((d) => {
    byName(d, 'study-log').service.subdomain = 'www';
  }).errors;
  assert.ok(reserved.includes('study-log: service.subdomain "www" is reserved'), reserved.join('\n'));
  for (const bad of ['study.log', 'Study-Log', '-study', 'study_log', null]) {
    const { errors } = fixture((d) => {
      byName(d, 'study-log').service.subdomain = bad;
    });
    assert.equal(errors.length, 1, `${bad}: ${errors.join('\n')}`);
    assert.match(errors[0], /^registry\/projects\.json \/projects\/1\/service\/subdomain: /);
  }
});

test('rejects reserved ports and a port scheme that would hit them for any slot', () => {
  const { errors } = fixture((d) => {
    d.platform.reservedPorts.push(8103);
  });
  assert.ok(errors.some((e) => e === 'health-log.ports.web uses reserved port 8103'));
  assert.ok(errors.some((e) => e === 'portScheme.web + slot 3 hits reserved port 8103'));
});

// #435: a local tool holds a slot and lists only the ports it uses.
test('file-control holds slot 9 as a local tool with web 8109 only', () => {
  const [tool] = original.data.projects.localTools;
  assert.deepEqual([tool.name, tool.slot, tool.ports], ['file-control', 9, { web: 8109 }]);
  assert.ok(!original.data.projects.projects.some((p) => p.slot === 9), 'no app has slot 9');
});

test('local tools share the slot sequence and port formula with apps, and need one port', () => {
  const { errors } = fixture((d) => {
    const [tool] = d.projects.localTools;
    tool.slot = 2;
    d.projects.localTools.push({ slot: 10, name: 'other-tool', repo: 'other-tool', summary: 'a test tool', ports: { api: 3111 } }, { slot: 11, name: 'empty-tool', repo: 'empty-tool', summary: 'a test tool', ports: {} });
  });
  assert.ok(errors.some((e) => e.startsWith('slot "2" is used by study-log, file-control')), errors.join('\n'));
  assert.ok(errors.some((e) => e === 'file-control.ports.web is 8109, expected 8102 (8100 + slot 2)'));
  assert.ok(errors.some((e) => e === 'other-tool.ports.api is 3111, expected 3110 (3100 + slot 10)'));
  assert.ok(errors.some((e) => e === 'empty-tool: a local tool must list at least one port'));
  assert.ok(!errors.some((e) => e.includes('other-tool.ports.web')), 'unlisted ports are not checked');
});

test('display names must be unique because they are the only difference between apps', () => {
  const { errors } = fixture((d) => {
    byName(d, 'health-log').displayName = byName(d, 'study-log').displayName;
  });
  assert.ok(errors.includes('display name "Study Log" is used by study-log, health-log'), errors.join('\n'));
});

test('db.testName must differ from db.name', () => {
  const { errors } = fixture((d) => {
    byName(d, 'money-ledger').db.testName = 'money';
  });
  assert.ok(errors.includes('money-ledger: db.testName must differ from db.name'));
});

test('warns about expired allowed differences', () => {
  const { errors, warnings } = fixture((d) => {
    byName(d, 'plan-routine').allowedDifferences.push({ path: 'compose.yaml', reason: '이전 포트 유지 기간', until: '2026-10-01' });
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, ['plan-routine: allowedDifferences "compose.yaml" expired on 2026-10-01']);
});

test('sync targets must match registry projects and profiles', () => {
  const { errors } = fixture((d) => {
    d.sync.targets.push({ repo: 'sirloinbh/unknown-app', profile: 'app', project: 'unknown-app', rollout: 2 });
    d.sync.targets.find((t) => t.profile === 'infra').project = 'workout-memo';
    d.sync.targets.find((t) => t.project === 'study-log').repo = 'sirloinbh/study-log-frontend';
  });
  assert.ok(errors.includes('sync target sirloinbh/unknown-app: project "unknown-app" is not an active registry project'));
  assert.ok(errors.includes('sync target sirloinbh/shared-aws-infrastructure: only app targets may name a project'));
  assert.ok(errors.includes('sync target sirloinbh/study-log-frontend: expected sirloinbh/study-log'));
});

test('a retired project may not stay a sync target', () => {
  const { errors } = fixture((d) => {
    byName(d, 'cert-manager').status = 'retired';
  });
  assert.ok(errors.includes('sync target sirloinbh/cert-manager: project "cert-manager" is not an active registry project'));
});

test('profile packages must be listed in versions.json', () => {
  const { errors } = fixture((d) => {
    delete d.versions.packages['@sirloinbh/tsconfig'];
  });
  assert.ok(errors.includes('profile app: package @sirloinbh/tsconfig is missing from versions.json'));
});

test('external actions must be pinned to a commit SHA', () => {
  const { errors } = fixture((d) => {
    d.versions.actions.checkout.sha = 'v4';
  });
  assert.deepEqual(errors, ['versions.json /actions/checkout/sha: must match ^[0-9a-f]{40}$']);
});
