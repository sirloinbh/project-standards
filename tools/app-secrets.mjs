// Central command for the shared Claude API key (ADR-0010, #265). The value lives in AWS SSM
// Parameter Store; this command sets it, checks that it exists, and copies it into the one local
// .env of this repository (ignored by Git). Apps with features.claude read that file in local
// development, so the key is in one place on the PC too. It never prints the value.
//
//   node tools/app-secrets.mjs check [--profile <aws profile>]
//   node tools/app-secrets.mjs pull  [--profile <aws profile>]
//   node tools/app-secrets.mjs set   [--profile <aws profile>]     (value from standard input)
//
// --profile defaults to SIRLOINBH_AWS_PROFILE. Use the personal AWS profile, never the company one.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PARAMETER = '/sirloinbh/anthropic-api-key';
export const ENV_KEY = 'ANTHROPIC_API_KEY';
export const REGION = 'ap-northeast-2';
const central = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function claudeApps(root = central) {
  const { projects } = JSON.parse(fs.readFileSync(path.join(root, 'registry/projects.json'), 'utf8'));
  return projects.filter((p) => p.status === 'active' && p.features?.claude).map((p) => p.name);
}

/** Runs the AWS CLI. APP_SECRETS_AWS (a Node script) replaces it in tests. */
function aws(args, profile) {
  const full = [...args, '--region', REGION, '--profile', profile];
  const fake = process.env.APP_SECRETS_AWS;
  // No shell: arguments reach aws.exe as they are (AWS CLI v2 installs an executable).
  const r = fake ? spawnSync(process.execPath, [fake, ...full], { encoding: 'utf8' }) : spawnSync('aws', full, { encoding: 'utf8' });
  if (r.error) throw new Error(`could not run the aws CLI: ${r.error.message}`);
  // stderr may name the parameter but never holds its value; stdout is not shown on failure.
  if (r.status !== 0) throw new Error(`aws ${args.slice(0, 2).join(' ')} failed (exit code ${r.status}): ${r.stderr.trim()}`);
  return r.stdout;
}

/** Sets KEY=value in .env text, keeping the other lines and the line ending. */
export function setEnvLine(text, key, value) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.length ? text.split(/\r?\n/) : [];
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  const at = lines.findIndex((l) => l.startsWith(`${key}=`));
  if (at >= 0) lines[at] = `${key}=${value}`;
  else lines.push(`${key}=${value}`);
  return lines.join(eol) + eol;
}

export const hasEnvValue = (text, key) => text.split(/\r?\n/).some((l) => l.startsWith(`${key}=`) && l.length > key.length + 1);

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
  });
}

export async function run(argv, { root = central, log = console.log, input = readStdin } = {}) {
  const [command, ...rest] = argv;
  const opt = (name) => {
    const i = rest.indexOf(`--${name}`);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  const profile = opt('profile') ?? process.env.SIRLOINBH_AWS_PROFILE;
  if (!['check', 'pull', 'set'].includes(command)) throw new Error('Usage: node tools/app-secrets.mjs check|pull|set [--profile <aws profile>]');
  if (!profile) throw new Error('Set a personal AWS profile with --profile or SIRLOINBH_AWS_PROFILE');
  const file = path.join(root, '.env');

  if (command === 'set') {
    const value = (await input()).trim();
    if (!value) throw new Error('Pass the key value on standard input. Example: Get-Clipboard | node tools/app-secrets.mjs set --profile <profile>');
    // The value goes to the AWS CLI through a private temporary file, not as an argument.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-secrets-'));
    const file = path.join(dir, 'value');
    try {
      fs.writeFileSync(file, value, { mode: 0o600 });
      aws(['ssm', 'put-parameter', '--name', PARAMETER, '--type', 'SecureString', '--overwrite', '--value', `file://${file}`], profile);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    log(`SSM ${PARAMETER}: saved. The server uses the new value from the next deploy, and the PC uses it after you run pull again`);
    return 0;
  }

  if (command === 'check') {
    let ok = true;
    try {
      const modified = aws(['ssm', 'get-parameter', '--name', PARAMETER, '--query', 'Parameter.LastModifiedDate', '--output', 'text'], profile).trim();
      log(`SSM ${PARAMETER}: present (last modified ${modified})`);
    } catch (error) {
      ok = false;
      log(`SSM ${PARAMETER}: could not read — ${error.message}`);
    }
    const has = fs.existsSync(file) && hasEnvValue(fs.readFileSync(file, 'utf8'), ENV_KEY);
    if (!has) ok = false;
    log(`project-standards/.env ${ENV_KEY}: ${has ? 'present' : 'missing'}`);
    log(`Apps that read this key: ${claudeApps(root).join(', ') || 'none'}`);
    return ok ? 0 : 1;
  }

  // pull
  const value = aws(['ssm', 'get-parameter', '--name', PARAMETER, '--with-decryption', '--query', 'Parameter.Value', '--output', 'text'], profile).trim();
  if (!value) throw new Error(`SSM ${PARAMETER} value is empty`);
  fs.writeFileSync(file, setEnvLine(fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '', ENV_KEY, value), { mode: 0o600 });
  log(`project-standards/.env ${ENV_KEY}: written`);
  return 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  run(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(`app-secrets: ${error.message}`);
      process.exit(2);
    },
  );
}
