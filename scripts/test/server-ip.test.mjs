// tools/server-ip.ps1 and tools/server-ssh.ps1 (#794): Windows only, with a fake aws and a fake ssh on PATH.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '../../..');
const tool = (name) => join(root, 'tools', name);
const windows = process.platform === 'win32';
const timeout = 60000;

function fixture({ awsOut = '', awsExit = 0 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'server-ip-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  // aws prints AWS_OUT and exits AWS_EXIT; ssh records its arguments.
  writeFileSync(join(bin, 'aws.cmd'), '@echo off\r\nif defined AWS_OUT echo %AWS_OUT%\r\nexit /b %AWS_EXIT%\r\n');
  writeFileSync(join(bin, 'ssh.cmd'), `@echo off\r\necho %* > "${join(dir, 'ssh-args.txt')}"\r\nexit /b 0\r\n`);
  const env = { ...process.env, PATH: bin + delimiter + process.env.PATH, AWS_OUT: awsOut, AWS_EXIT: String(awsExit), SIRLOINBH_AWS_PROFILE: 'test-profile' };
  const run = (script, args = []) => spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tool(script), ...args], { encoding: 'utf8', env, timeout });
  return { dir, run, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('server-ip prints the address from the SSM parameter', { skip: !windows }, () => {
  const f = fixture({ awsOut: '203.0.113.7' });
  try {
    const r = f.run('server-ip.ps1');
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), '203.0.113.7');
    assert.equal(r.stderr.trim(), '');
  } finally {
    f.cleanup();
  }
});

test('server-ip falls back to DNS with a warning when SSM fails or returns something else', { skip: !windows }, () => {
  for (const options of [{ awsExit: 255 }, { awsOut: 'None' }, { awsOut: 'not-an-address' }]) {
    const f = fixture(options);
    try {
      const r = f.run('server-ip.ps1', ['-HostName', 'localhost']);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout.trim(), '127.0.0.1', JSON.stringify(options));
      assert.match(r.stderr, /could not read \/sirloinbh\/shared\/server-static-ip with profile test-profile; using the DNS address of localhost/);
    } finally {
      f.cleanup();
    }
  }
});

test('server-ssh connects to ubuntu at that address with the shared key and passes the arguments on', { skip: !windows }, () => {
  const f = fixture({ awsOut: '203.0.113.7' });
  try {
    const r = f.run('server-ssh.ps1', ['uptime']);
    assert.equal(r.status, 0, r.stderr);
    const args = readFileSync(join(f.dir, 'ssh-args.txt'), 'utf8').trim();
    assert.match(args, /^-i .*workout-memo-lightsail ubuntu@203\.0\.113\.7 uptime$/);
  } finally {
    f.cleanup();
  }
});
