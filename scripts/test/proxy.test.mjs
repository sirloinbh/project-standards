import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { proxyApps, renderProxy } from '../lib/proxy.mjs';
import { loadAll } from '../lib/registry.mjs';

const root = path.join(import.meta.dirname, '..', '..');
const { data } = loadAll(root);
const domain = 'example.com';
const files = new Map(renderProxy(data, { domain }).map((f) => [f.path, f.content]));
const conf = files.get('nginx/apps.conf');
const active = data.projects.projects.filter((p) => p.status === 'active');

test('every active app gets a server block for its subdomain and registry web port', () => {
  assert.equal(active.length, 8);
  for (const p of active) {
    const block = conf.split(/\n\n(?=# )/).find((b) => b.includes(`server_name ${p.name}.${domain};`));
    assert.ok(block, p.name);
    assert.match(block, new RegExp(`proxy_pass http://127\\.0\\.0\\.1:${p.ports.web};`), p.name);
    assert.match(block, /listen 443 ssl;/);
    assert.match(block, /Strict-Transport-Security/);
  }
  assert.equal(proxyApps(data, domain).length, 8);
});

test('HTTP redirects only app names, and unknown names get nothing', () => {
  const redirect = conf.split('\n\n').find((b) => b.includes('return 301'));
  for (const p of active) assert.ok(redirect.includes(`${p.name}.${domain}`), p.name);
  assert.match(conf, /listen 80 default_server;\n  return 444;/);
  assert.match(conf, /listen 443 ssl default_server;\n  ssl_reject_handshake on;/);
  assert.match(conf, new RegExp(`/etc/letsencrypt/live/${domain}/fullchain\\.pem`));
});

test('the wildcard certificate is issued with DNS validation and renewal pings healthchecks.io', () => {
  const cert = files.get('cert.sh');
  assert.match(cert, /--dns-route53/);
  assert.match(cert, new RegExp(`--cert-name ${domain} -d ${domain} -d '\\*\\.${domain}'`));
  assert.match(cert, /CERTBOT_AWS_ACCESS_KEY_ID/);
  assert.match(cert, /HEALTHCHECK_URL_CERT/);
  assert.match(cert, /renew --dry-run/);
  assert.match(files.get('cert-renew.service'), /ExecStart=\/bin\/bash \/opt\/project-standards\/proxy\/cert\.sh renew/);
  assert.match(files.get('cert-renew.timer'), /OnCalendar=/);
});

test('compose pins the images from versions.json and keeps certbot out of `up`', () => {
  const compose = files.get('compose.yaml');
  assert.ok(compose.includes(`image: ${data.versions.images.nginx}`));
  assert.ok(compose.includes(`image: ${data.versions.images.certbot}`));
  assert.match(data.versions.images.certbot, /^certbot\/dns-route53:v[\d.]+@sha256:[0-9a-f]{64}$/);
  assert.match(compose, /network_mode: host/);
  assert.match(compose, /profiles: \[certbot\]/);
});

test('no file has leftover placeholders', () => {
  for (const [file, content] of files) assert.doesNotMatch(content, /undefined|\{\{/, file);
});

test('refuses to render without a root domain or for an app outside it', () => {
  const unset = structuredClone(data);
  unset.platform.rootDomain = null;
  assert.throws(() => renderProxy(unset), /rootDomain is not set yet \(#539\)/);
  const copy = structuredClone(data);
  copy.projects.projects[0].service.domain = 'other.net';
  assert.throws(() => renderProxy(copy, { domain }), /workout-memo: service\.domain "other\.net" is not covered/);
});

test('the command writes the files with Linux line endings', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'proxy-'));
  try {
    execFileSync(process.execPath, [path.join(root, 'scripts/proxy-config.mjs'), '--out', out, '--domain', domain]);
    const written = fs.readFileSync(path.join(out, 'nginx/apps.conf'), 'utf8');
    assert.equal(written, conf.replace(/\r\n/g, '\n'));
    assert.doesNotMatch(fs.readFileSync(path.join(out, 'cert.sh'), 'utf8'), /\r/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('without --domain the command uses the registry root domain', () => {
  assert.equal(data.platform.rootDomain, 'daysofme.com');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'proxy-'));
  try {
    execFileSync(process.execPath, [path.join(root, 'scripts/proxy-config.mjs'), '--out', out]);
    const written = fs.readFileSync(path.join(out, 'nginx/apps.conf'), 'utf8');
    assert.match(written, /server_name workout-memo\.daysofme\.com;/);
    assert.match(written, /\/etc\/letsencrypt\/live\/daysofme\.com\/fullchain\.pem/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('cert.sh is valid bash', { skip: spawnSync('bash', ['--version']).status !== 0 && 'bash not found' }, () => {
  const result = spawnSync('bash', ['-n'], { input: files.get('cert.sh'), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
