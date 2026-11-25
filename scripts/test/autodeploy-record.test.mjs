// After a successful deploy, autodeploy writes a GitHub deployment record and a success status (#1087). It never fails the deploy.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadAll } from '../lib/registry.mjs';
import { renderProfile } from '../lib/templates.mjs';
import { buildVars } from '../lib/vars.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { data } = loadAll(root);
const render = (target) => {
  const folders = data.sync.profiles[target.profile].templates;
  const files = renderProfile({ root, profile: target.profile, folders, vars: buildVars(data, target, { centralSha: 'abcdef1234567' }) });
  return files.find((f) => f.path === 'deploy/autodeploy.sh').content;
};
const targets = [data.sync.targets.find((t) => t.project === 'study-log'), data.sync.targets.find((t) => t.repo === 'sirloinbh/shared-auth')];
const posix = (p) => p.split(path.sep).join('/');
const skip = spawnSync('bash', ['--version']).status !== 0 && 'bash not found';
const TOKEN = 'github_pat_faketoken0123';
const SHA = 'a'.repeat(40);

// ssm: 'ok' prints the token, 'missing' exits 3 (no key pair), 'none' has no ssm-get.sh. github: 'ok' answers, 'down' fails.
function run(text, { ssm = 'ok', github = 'ok' } = {}) {
  const fn = text.match(/^deploy_record\(\) \{[\s\S]*?^\}$/m)[0];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-record-'));
  try {
    fs.mkdirSync(path.join(dir, 'deploy'));
    if (ssm !== 'none') {
      const body = ssm === 'ok' ? `printf '%s' "${TOKEN}"` : 'echo "SECRETS_AWS_ACCESS_KEY_ID is missing" >&2; exit 3';
      fs.writeFileSync(path.join(dir, 'deploy/ssm-get.sh'), `#!/bin/bash\necho "$*" >> "${posix(dir)}/ssm-args"\n${body}\n`);
    }
    const bin = path.join(dir, 'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(
      path.join(bin, 'curl'),
      ['#!/bin/bash', `echo "$*" >> "${posix(dir)}/curl-args"`, `cat >> "${posix(dir)}/curl-conf"`, '[ "$GITHUB" = ok ] || exit 22', 'if [[ "$*" == *"/deployments" ]]; then echo \'{"url": "x", "id": 987, "node_id": "n"}\'; else echo \'{}\'; fi', ''].join('\n'),
      { mode: 0o755 },
    );
    const pathVar = process.platform === 'win32' ? `${posix(bin).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`)}:$PATH` : `${bin}:$PATH`;
    const script = path.join(dir, 'run.sh');
    fs.writeFileSync(script, `export PATH="${pathVar}"\nrepo=sirloinbh/example\ncd "${posix(dir)}"\n${fn}\ndeploy_record ${SHA}\necho "rc=$?"\n`);
    const r = spawnSync('bash', [posix(script)], { encoding: 'utf8', env: { ...process.env, GITHUB: github } });
    const read = (name) => (fs.existsSync(path.join(dir, name)) ? fs.readFileSync(path.join(dir, name), 'utf8') : '');
    return { stdout: r.stdout, stderr: r.stderr, curlArgs: read('curl-args'), curlConf: read('curl-conf'), ssmArgs: read('ssm-args') };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

for (const target of targets) {
  const text = render(target);
  const name = target.project ?? target.repo;

  test(`${name}: the record is written only after a successful deploy, and never changes the exit status`, () => {
    assert.match(text, /rm -f \.autodeploy-failed\n {2}signal ok "deployed \$sha"\n {2}deploy_record "\$full" \|\| true\nelse/);
    assert.equal(text.split('deploy_record "$full"').length, 2, 'called once, in the success branch only');
  });

  test(`${name}: creates a production deployment for the deployed commit and marks it success`, { skip }, () => {
    const r = run(text);
    const calls = r.curlArgs.trim().split('\n');
    assert.equal(calls.length, 2);
    assert.match(calls[0], /-X POST .*https:\/\/api\.github\.com\/repos\/sirloinbh\/example\/deployments$/);
    assert.ok(calls[0].includes(`"ref":"${SHA}"`) && calls[0].includes('"environment":"production"'));
    assert.match(calls[1], /https:\/\/api\.github\.com\/repos\/sirloinbh\/example\/deployments\/987\/statuses$/);
    assert.ok(calls[1].includes('"state":"success"'));
    assert.equal(r.ssmArgs.trim(), '/sirloinbh/shared/github-ops-token');
    assert.match(r.stdout, /GitHub deployment record written for aaaaaaaaaaaa/);
    assert.match(r.stdout, /rc=0/);
  });

  test(`${name}: the token goes to curl on standard input, never to an argument or the output`, { skip }, () => {
    const r = run(text);
    assert.ok(r.curlConf.includes(TOKEN));
    for (const t of [r.stdout, r.stderr, r.curlArgs]) assert.ok(!t.includes(TOKEN));
  });

  test(`${name}: without a token or an ssm-get.sh nothing is called and nothing is said`, { skip }, () => {
    for (const ssm of ['missing', 'none']) {
      const r = run(text, { ssm });
      assert.equal(r.curlArgs, '');
      assert.equal(r.stdout.trim(), 'rc=0');
    }
  });

  test(`${name}: an unreachable GitHub is reported in one line and returns 0`, { skip }, () => {
    const r = run(text, { github: 'down' });
    assert.match(r.stdout, /could not create the GitHub deployment record for aaaaaaaaaaaa/);
    assert.match(r.stdout, /rc=0/);
    assert.ok(!r.stdout.includes(TOKEN) && !r.stderr.includes(TOKEN));
  });
}
