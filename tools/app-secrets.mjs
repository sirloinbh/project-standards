// Central command for the shared Claude API key (ADR-0010, #265). The value lives in AWS SSM
// Parameter Store; this command sets it, checks that it exists, and copies it into the local
// .env of every app with features.claude in the registry. It never prints the value.
//
//   node tools/app-secrets.mjs check [--profile <aws profile>]
//   node tools/app-secrets.mjs pull  [--profile <aws profile>] [--app <name>] [--base <folder>]
//   node tools/app-secrets.mjs set   [--profile <aws profile>]     (value from standard input)
//
// --profile defaults to SIRLOINBH_AWS_PROFILE. Use the personal AWS profile, never the company one.
// --base is the folder that holds the app clones, by default the parent of this repository.
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
  if (r.error) throw new Error(`aws CLI를 실행하지 못했습니다: ${r.error.message}`);
  // stderr may name the parameter but never holds its value; stdout is not shown on failure.
  if (r.status !== 0) throw new Error(`aws ${args.slice(0, 2).join(' ')} 실패 (종료 코드 ${r.status}): ${r.stderr.trim()}`);
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
  if (!['check', 'pull', 'set'].includes(command)) throw new Error('사용법: node tools/app-secrets.mjs check|pull|set [--profile <aws 프로필>] [--app <앱>] [--base <폴더>]');
  if (!profile) throw new Error('--profile 또는 SIRLOINBH_AWS_PROFILE로 개인 AWS 프로필을 지정하세요');
  const base = path.resolve(opt('base') ?? path.dirname(root));
  const apps = opt('app') ? [opt('app')] : claudeApps(root);
  for (const app of apps) if (!claudeApps(root).includes(app)) throw new Error(`${app}: 레지스트리에서 features.claude가 꺼진 앱입니다`);

  if (command === 'set') {
    const value = (await input()).trim();
    if (!value) throw new Error('표준 입력으로 키 값을 넘기세요. 예: Get-Clipboard | node tools/app-secrets.mjs set --profile <프로필>');
    // The value goes to the AWS CLI through a private temporary file, not as an argument.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-secrets-'));
    const file = path.join(dir, 'value');
    try {
      fs.writeFileSync(file, value, { mode: 0o600 });
      aws(['ssm', 'put-parameter', '--name', PARAMETER, '--type', 'SecureString', '--overwrite', '--value', `file://${file}`], profile);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    log(`SSM ${PARAMETER}: 저장함. 서버는 다음 배포부터, PC는 pull을 다시 실행하면 새 값을 씁니다`);
    return 0;
  }

  if (command === 'check') {
    let ok = true;
    try {
      const modified = aws(['ssm', 'get-parameter', '--name', PARAMETER, '--query', 'Parameter.LastModifiedDate', '--output', 'text'], profile).trim();
      log(`SSM ${PARAMETER}: 있음 (마지막 변경 ${modified})`);
    } catch (error) {
      ok = false;
      log(`SSM ${PARAMETER}: 읽지 못함 — ${error.message}`);
    }
    for (const app of apps) {
      const file = path.join(base, app, '.env');
      const has = fs.existsSync(file) && hasEnvValue(fs.readFileSync(file, 'utf8'), ENV_KEY);
      if (!has) ok = false;
      log(`${app}/.env ${ENV_KEY}: ${has ? '있음' : '없음'}`);
    }
    return ok ? 0 : 1;
  }

  // pull
  const value = aws(['ssm', 'get-parameter', '--name', PARAMETER, '--with-decryption', '--query', 'Parameter.Value', '--output', 'text'], profile).trim();
  if (!value) throw new Error(`SSM ${PARAMETER} 값이 비어 있습니다`);
  for (const app of apps) {
    const dir = path.join(base, app);
    if (!fs.existsSync(dir)) {
      log(`${app}: ${dir}에 클론이 없어 건너뜀`);
      continue;
    }
    const file = path.join(dir, '.env');
    fs.writeFileSync(file, setEnvLine(fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '', ENV_KEY, value));
    log(`${app}/.env ${ENV_KEY}: 넣음`);
  }
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
