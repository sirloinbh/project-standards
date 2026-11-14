// Central command for app keys in AWS SSM Parameter Store (ADR-0010, ADR-0014). It stores a
// value, checks that values exist, and copies them into a local .env (ignored by Git). It never
// prints a value.
//
//   Shared Claude API key (/sirloinbh/shared/anthropic-api-key, kept in this repository's .env):
//     node tools/app-secrets.mjs set   [--profile <aws profile>]            (value from standard input)
//     node tools/app-secrets.mjs check [--profile <aws profile>]
//     node tools/app-secrets.mjs pull  [--profile <aws profile>]
//   Any parameter, and the keys an app tags with @ssm= in its .env.example:
//     node tools/app-secrets.mjs set   <parameter> [--profile <aws profile>]  (value from standard input)
//     node tools/app-secrets.mjs check <app> [--dir <app clone>] [--profile <aws profile>]
//     node tools/app-secrets.mjs pull  <app> [--dir <app clone>] [--profile <aws profile>]
//
// --profile defaults to SIRLOINBH_AWS_PROFILE. Use the personal AWS profile, never the company one.
// --dir defaults to the app clone next to this repository (../<app>).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnvExample, SSM_PATH, ssmProblems } from '../scripts/lib/env-tags.mjs';

export const PARAMETER = '/sirloinbh/shared/anthropic-api-key';
export const ENV_KEY = 'ANTHROPIC_API_KEY';
export const REGION = 'ap-northeast-2';
const central = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = 'Usage: node tools/app-secrets.mjs set [<parameter>] | check [<app>] | pull [<app>] [--dir <app clone>] [--profile <aws profile>]';

const activeProjects = (root) => JSON.parse(fs.readFileSync(path.join(root, 'registry/projects.json'), 'utf8')).projects.filter((p) => p.status === 'active');

export function claudeApps(root = central) {
  return activeProjects(root).filter((p) => p.features?.claude).map((p) => p.name);
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

/** Why a parameter name cannot be stored, or null: /sirloinbh/shared/<name> or /sirloinbh/<active app>/<name>. */
export function parameterProblem(parameter, root = central) {
  const m = SSM_PATH.exec(parameter ?? '');
  if (!m) return `${parameter} is not /sirloinbh/shared/<name> or /sirloinbh/<app>/<name> (lowercase letters, digits, hyphens)`;
  if (m[1] !== 'shared' && !activeProjects(root).some((p) => p.name === m[1])) return `${m[1]} is not an active app in registry/projects.json`;
  return null;
}

/**
 * Why a value cannot be stored, or null (#531). A key is one token: copied terminal text has line
 * breaks or spaces. The message never repeats the value.
 */
export function valueProblem(parameter, value) {
  if (/[\r\n]/.test(value)) return `the value has ${value.split(/\r?\n/).length} lines, so it is not a key. Copy only the key and try again`;
  if (/\s/.test(value)) return 'the value contains spaces, so it is not a key. Copy only the key and try again';
  if (parameter === PARAMETER && !/^sk-ant-[A-Za-z0-9_-]+$/.test(value)) return 'the value does not look like a Claude API key (sk-ant-...). Copy the key from the Claude Console and try again';
  return null;
}

/** The @ssm= tagged keys of an app's .env.example: [{ key, parameter }]. Throws when a tag breaks the rules. */
export function appKeys(app, dir) {
  const file = path.join(dir, '.env.example');
  if (!fs.existsSync(file)) throw new Error(`${file} is missing. Pass the app clone with --dir`);
  const entries = parseEnvExample(fs.readFileSync(file, 'utf8'));
  const problems = ssmProblems(entries, app);
  if (problems.length) throw new Error(`${app} .env.example: ${problems.join('; ')}`);
  return entries.filter((e) => e.ssm).map((e) => ({ key: e.key, parameter: e.ssm }));
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
  });
}

const lastModified = (parameter, profile) => aws(['ssm', 'get-parameter', '--name', parameter, '--query', 'Parameter.LastModifiedDate', '--output', 'text'], profile).trim();
function getValue(parameter, profile) {
  const value = aws(['ssm', 'get-parameter', '--name', parameter, '--with-decryption', '--query', 'Parameter.Value', '--output', 'text'], profile).trim();
  if (!value) throw new Error(`SSM ${parameter} value is empty`);
  // A stored value with line breaks would split into several .env lines.
  if (/[\r\n]/.test(value)) throw new Error(`SSM ${parameter} value has line breaks, so it is not a key. Store the key again with set`);
  return value;
}
const readText = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');

export async function run(argv, { root = central, log = console.log, input = readStdin } = {}) {
  const [command, ...rest] = argv;
  const options = {};
  const positional = [];
  for (let i = 0; i < rest.length; i++) {
    if (['--profile', '--dir'].includes(rest[i])) options[rest[i].slice(2)] = rest[++i];
    else if (rest[i].startsWith('--')) throw new Error(`Unknown option ${rest[i]}. ${USAGE}`);
    else positional.push(rest[i]);
  }
  if (!['check', 'pull', 'set'].includes(command) || positional.length > 1) throw new Error(USAGE);
  const profile = options.profile ?? process.env.SIRLOINBH_AWS_PROFILE;
  if (!profile) throw new Error('Set a personal AWS profile with --profile or SIRLOINBH_AWS_PROFILE');
  const [target] = positional;

  if (command === 'set') {
    const parameter = target ?? PARAMETER;
    const problem = parameterProblem(parameter, root);
    if (problem) throw new Error(problem);
    const value = (await input()).trim();
    if (!value) throw new Error('Pass the key value on standard input. Example: Get-Clipboard | node tools/app-secrets.mjs set <parameter> --profile <profile>');
    const bad = valueProblem(parameter, value);
    if (bad) throw new Error(`${parameter}: ${bad}`);
    // The value goes to the AWS CLI through a private temporary file, not as an argument.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-secrets-'));
    const file = path.join(dir, 'value');
    try {
      fs.writeFileSync(file, value, { mode: 0o600 });
      aws(['ssm', 'put-parameter', '--name', parameter, '--type', 'SecureString', '--overwrite', '--value', `file://${file}`], profile);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    log(`SSM ${parameter}: saved. The server uses the new value from the next deploy, and the PC uses it after you run pull again`);
    return 0;
  }

  // Without an app: the shared Claude key and this repository's .env (ADR-0010).
  let keys = [{ key: ENV_KEY, parameter: PARAMETER }];
  let file = path.join(root, '.env');
  let label = 'project-standards/.env';
  if (target) {
    const project = activeProjects(root).find((p) => p.name === target);
    if (!project) throw new Error(`${target} is not an active app in registry/projects.json`);
    const dir = path.resolve(options.dir ?? path.join(root, '..', project.repos.umbrella));
    keys = appKeys(target, dir);
    file = path.join(dir, '.env');
    label = `${target}/.env`;
    if (!keys.length) {
      log(`${target} .env.example has no @ssm= keys`);
      return 0;
    }
  }

  if (command === 'check') {
    let ok = true;
    const text = readText(file);
    for (const { key, parameter } of keys) {
      try {
        log(`SSM ${parameter}: present (last modified ${lastModified(parameter, profile)})`);
      } catch (error) {
        ok = false;
        log(`SSM ${parameter}: could not read — ${error.message}`);
      }
      const has = hasEnvValue(text, key);
      if (!has) ok = false;
      log(`${label} ${key}: ${has ? 'present' : 'missing'}`);
    }
    if (!target) log(`Apps that read this key: ${claudeApps(root).join(', ') || 'none'}`);
    return ok ? 0 : 1;
  }

  // pull: read every value first, so a failed read leaves the .env untouched.
  const values = keys.map(({ key, parameter }) => [key, getValue(parameter, profile)]);
  let text = readText(file);
  for (const [key, value] of values) text = setEnvLine(text, key, value);
  fs.writeFileSync(file, text, { mode: 0o600 });
  for (const [key] of values) log(`${label} ${key}: written`);
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
