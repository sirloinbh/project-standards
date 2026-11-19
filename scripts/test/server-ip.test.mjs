// tools/server-ip.ps1 and tools/server-ssh.ps1 (#794): Windows only, with a fake aws and a fake ssh on PATH.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve, sep } from 'node:path';
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

test('the .cmd shims run the scripts next to them in any terminal (#798)', { skip: !windows }, () => {
  const f = fixture({ awsOut: '203.0.113.7' });
  try {
    const ip = spawnSync('cmd', ['/c', tool('bin/server-ip.cmd')], { encoding: 'utf8', env: { ...process.env, PATH: join(f.dir, 'bin') + delimiter + process.env.PATH, AWS_OUT: '203.0.113.7', AWS_EXIT: '0', SIRLOINBH_AWS_PROFILE: 'p' }, timeout });
    assert.equal(ip.status, 0, ip.stderr);
    assert.equal(ip.stdout.trim(), '203.0.113.7');
    const ssh = spawnSync('cmd', ['/c', tool('bin/server-ssh.cmd'), 'uptime'], { encoding: 'utf8', env: { ...process.env, PATH: join(f.dir, 'bin') + delimiter + process.env.PATH, AWS_OUT: '203.0.113.7', AWS_EXIT: '0', SIRLOINBH_AWS_PROFILE: 'p' }, timeout });
    assert.equal(ssh.status, 0, ssh.stderr);
    assert.match(readFileSync(join(f.dir, 'ssh-args.txt'), 'utf8'), /ubuntu@203\.0\.113\.7 uptime/);
  } finally {
    f.cleanup();
  }
});

test('install copies the shims and adds the tools folder to the user PATH once (#798)', { skip: !windows }, () => {
  const f = fixture();
  try {
    const dest = join(f.dir, 'sirloinbh-tools');
    const pathFile = join(f.dir, 'user-path.txt');
    const before = ['C:' + sep + 'Other', 'C:' + sep + 'Tools' + sep].join(';');
    writeFileSync(pathFile, before);
    const install = () => spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tool('install.ps1'), '-Destination', dest, '-UserPathFile', pathFile], { encoding: 'utf8', timeout });
    const first = install();
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /updated {4}user PATH/);
    assert.equal(readFileSync(pathFile, 'utf8'), `${before};${join(dest, 'bin')}`);
    assert.ok(readFileSync(join(dest, 'bin/server-ip.cmd'), 'utf8').includes('-ExecutionPolicy Bypass'));
    assert.ok(readFileSync(join(dest, 'bin/server-ssh.cmd'), 'utf8').includes('ssh -i'));
    const second = install();
    assert.match(second.stdout, /unchanged {2}user PATH/);
    assert.equal(readFileSync(pathFile, 'utf8'), `${before};${join(dest, 'bin')}`);
    // Without -UserPathFile a custom destination never touches the real PATH.
    const plain = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tool('install.ps1'), '-Destination', dest], { encoding: 'utf8', timeout });
    assert.doesNotMatch(plain.stdout, /user PATH/);
  } finally {
    f.cleanup();
  }
});

test('install removes the tools folder itself from the user PATH, so PowerShell never picks the blocked .ps1 (#798)', { skip: !windows }, () => {
  const f = fixture();
  try {
    const dest = join(f.dir, 'sirloinbh-tools');
    const pathFile = join(f.dir, 'user-path.txt');
    writeFileSync(pathFile, ['C:' + sep + 'Other', dest + sep].join(';'));
    const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tool('install.ps1'), '-Destination', dest, '-UserPathFile', pathFile], { encoding: 'utf8', timeout });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(readFileSync(pathFile, 'utf8'), ['C:' + sep + 'Other', join(dest, 'bin')].join(';'));
  } finally {
    f.cleanup();
  }
});

test('server-ssh.cmd starts ssh itself and hands a command with && to it in one piece (#804)', { skip: !windows }, () => {
  const f = fixture({ awsOut: '203.0.113.7' });
  try {
    const remote = 'sudo cp /tmp/a /opt/b && rm /tmp/a && cd /opt && sudo bash c.sh reload';
    const line = `"${tool('bin/server-ssh.cmd')}" "${remote}"`;
    const env = { ...process.env, PATH: join(f.dir, 'bin') + delimiter + process.env.PATH, AWS_OUT: '203.0.113.7', AWS_EXIT: '0', SIRLOINBH_AWS_PROFILE: 'p' };
    const r = spawnSync('cmd', ['/d', '/s', '/c', `"${line}"`], { encoding: 'utf8', env, timeout, windowsVerbatimArguments: true });
    assert.equal(r.status, 0, r.stderr);
    const recorded = readFileSync(join(f.dir, 'ssh-args.txt'), 'utf8').trim();
    assert.ok(recorded.endsWith(`ubuntu@203.0.113.7 "${remote}"`), recorded);
    // The command reached ssh itself: no PowerShell sits between the shim and ssh.
    assert.doesNotMatch(readFileSync(tool('bin/server-ssh.cmd'), 'utf8'), /^(?!rem).*powershell/im);
  } finally {
    f.cleanup();
  }
});
