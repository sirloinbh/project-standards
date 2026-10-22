// Generates docs/projects.md from the registry.
// Usage: node scripts/gen-docs.mjs          write the file
//        node scripts/gen-docs.mjs --check  fail if the committed file is stale
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from './lib/registry.mjs';

const UNSET = '미정';

export function renderProjects({ projects, platform, sync }) {
  const rollout = new Map(sync.targets.map((t) => [t.project, t.rollout]));
  const lines = [
    '# 프로젝트 개요',
    '',
    '<!-- 자동 생성 파일. 수정은 registry/projects.json에서 하고 `npm run docs` 로 다시 생성한다. -->',
    '',
    '## 프로젝트',
    '',
    '| 슬롯 | 프로젝트 | 분야 | 상태 | DB / 테스트 DB | 서비스 주소 | AWS 접두어 | 적용 단계 |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const p of [...projects.projects].sort((a, b) => a.slot - b.slot)) {
    const host = p.service.domain ? [p.service.subdomain, p.service.domain].filter(Boolean).join('.') : UNSET;
    lines.push(
      `| ${String(p.slot).padStart(2, '0')} | ${p.name} | ${p.domain} | ${p.status} | ${p.db.name} / ${p.db.testName} | ${host} | ${p.aws.prefix ?? UNSET} | ${rollout.get(p.name) ?? '-'} |`,
    );
  }
  lines.push('', '## 포트', '', '| 프로젝트 | web | api | e2e api | vite | e2e web | db |', '|---|---|---|---|---|---|---|');
  for (const p of [...projects.projects].sort((a, b) => a.slot - b.slot)) {
    const ports = p.ports;
    lines.push(`| ${p.name} | ${ports.web} | ${ports.api} | ${ports.e2eApi} | ${ports.vite} | ${ports.e2eWeb} | ${ports.db} |`);
  }
  const s = platform.portScheme;
  lines.push(
    '',
    `포트 공식: 기준값 + 슬롯. web ${s.web}, api ${s.api}, e2e api ${s.e2eApi}, vite ${s.vite}, e2e web ${s.e2eWeb}, db ${s.db}. 예약 포트(배정 금지): ${platform.reservedPorts.join(', ')}. 근거: [ADR-0006](adr/0006-port-slot-allocation.md)`,
    '',
    '## 공통값',
    '',
    '| 항목 | 값 |',
    '|---|---|',
    `| 루트 도메인 | ${platform.rootDomain ?? UNSET} |`,
    `| AWS 리전 | ${platform.aws.region} |`,
    `| AWS 계정 별칭 | ${platform.aws.accountAlias ?? UNSET} |`,
    `| AWS 공유 접두어 | ${platform.aws.sharedPrefix ?? UNSET} |`,
    '',
  );
  return lines.join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const target = path.join(root, 'docs/projects.md');
  const text = renderProjects(loadAll(root).data);
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : '';
    if (current !== text) {
      console.error('docs/projects.md is stale. Run `npm run docs` and commit the result.');
      process.exit(1);
    }
    console.log('docs/projects.md: up to date');
  } else {
    fs.writeFileSync(target, text);
    console.log('wrote docs/projects.md');
  }
}
