// Generates docs/projects.md from the registry, docs/versions.md from versions.json, and docs/design-tokens.md.
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
    '| 슬롯 | 프로젝트 | 이름 | 표시 이름 | 분야 | 상태 | DB / 테스트 DB | 서비스 주소 | AWS 접두어 | 적용 단계 |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const p of [...projects.projects].sort((a, b) => a.slot - b.slot)) {
    const host = p.service.domain ? [p.service.subdomain, p.service.domain].filter(Boolean).join('.') : UNSET;
    lines.push(
      `| ${String(p.slot).padStart(2, '0')} | ${p.name} | ${p.title} | ${p.displayName} | ${p.domain} | ${p.status} | ${p.db.name} / ${p.db.testName} | ${host} | ${p.aws.prefix ?? UNSET} | ${rollout.get(p.name) ?? '-'} |`,
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

const table = (headers, rows) => [`| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)];

export function renderTokens(t) {
  const size = Object.fromEntries(t.fontSize.map((s) => [s.name, s]));
  const weight = Object.fromEntries(t.fontWeight.map((w) => [w.name, w]));
  const dark = Object.fromEntries(t.color.dark.map((c) => [c.name, c.value]));
  return [
    '# 디자인 토큰',
    '',
    '<!-- 자동 생성 파일. 수정은 design/tokens.json에서 하고 `npm run docs` 로 다시 생성한다. -->',
    '',
    `8개 앱이 함께 쓰는 값이다. 이름은 shadcn/ui와 Tailwind CSS 4 규칙을 따른다([ADR-0007](adr/0007-shadcn-ui-icons-emoji.md)). 앱마다 다른 것은 표시 이름뿐이고, 색은 모든 앱이 같은 흑백을 쓴다([ADR-0008](adr/0008-neutral-light-dark.md)).`,
    '',
    '## 글꼴',
    '',
    `- 본문·제목: \`${t.font.sans}\``,
    `- 고정폭: \`${t.font.mono}\``,
    `- Pretendard ${t.font.pretendard.version} (${t.font.pretendard.released}), ${t.font.pretendard.license}. ${t.font.pretendard.delivery} \`font-display: ${t.font.pretendard.fontDisplay}\`.`,
    '',
    '## 글자 크기',
    '',
    ...table(['이름', '크기', '줄 높이', '쓰는 곳'], t.fontSize.map((s) => [`\`text-${s.name}\``, `${s.size} (${s.px}px)`, s.lineHeight, s.use])),
    '',
    '## 글자 굵기',
    '',
    ...table(['이름', '값', '쓰는 곳'], t.fontWeight.map((w) => [`\`font-${w.name}\``, w.value, w.use])),
    '',
    '## 글자 스타일 (제목 단계, 본문, 주석)',
    '',
    '모바일 크기가 기본이고, `md`(768px) 이상에서 오른쪽 크기로 커진다.',
    '',
    ...table(
      ['스타일', '요소', '모바일', 'md 이상', '굵기', '자간', '색', '쓰는 곳'],
      t.textStyles.map((s) => [`\`${s.name}\``, `\`${s.element}\``, `${size[s.size].px}px`, `${size[s.sizeMd].px}px`, weight[s.weight].value, s.tracking, `\`${s.color}\``, s.use]),
    ),
    '',
    '## 간격',
    '',
    `- ${t.spacing.rule}`,
    '',
    ...table(['이름', '모바일', 'md', 'lg', '쓰는 곳'], t.spacing.layout.map((l) => [`\`${l.name}\``, l.mobile, l.md, l.lg, l.use])),
    '',
    '## 모서리 둥글기',
    '',
    ...table(['이름', 'CSS 변수', '값', 'px', '쓰는 곳'], t.radius.map((r) => [`\`rounded-${r.name}\``, `\`${r.css}\``, `\`${r.value}\``, r.px, r.use])),
    '',
    '## 그림자와 테두리',
    '',
    ...table(['이름', '쓰는 곳'], t.shadow.map((s) => [`\`shadow-${s.name}\``, s.use])),
    '',
    `- ${t.border.rule}`,
    '',
    '## 반응형',
    '',
    `- ${t.responsive.approach} 가장 좁은 화면은 ${t.responsive.minWidth}이다.`,
    `- ${t.responsive.touchRule}`,
    `- ${t.responsive.safeArea}`,
    `- ${t.responsive.verify}`,
    '',
    ...table(['기준점', '최소 너비', '쓰는 곳'], t.breakpoints.map((b) => [`\`${b.name}\``, `${b.minWidth} (${b.px}px)`, b.use])),
    '',
    '## 아이콘 크기',
    '',
    ...table(['이름', 'px', '쓰는 곳'], t.icon.map((i) => [`\`${i.name}\``, i.px, i.use])),
    '',
    '## 쌓임 순서 (z-index)',
    '',
    ...table(['이름', '값', '쓰는 곳'], t.zIndex.map((z) => [`\`${z.name}\``, z.value, z.use ?? ''])),
    '',
    '## 움직임',
    '',
    `- 빠름 ${t.motion.fast}, 보통 ${t.motion.normal}, 느림 ${t.motion.slow}, easing \`${t.motion.easing}\`.`,
    `- ${t.motion.rule}`,
    '',
    '## 로딩 표시',
    '',
    `- 스켈레톤: ${t.loading.skeleton}`,
    `- 스피너: ${t.loading.spinner}`,
    `- ${t.loading.rule}`,
    '',
    '## 색',
    '',
    `값은 ${t.color.format}이다. ${t.color.theme}`,
    '',
    `- ${t.color.mode}`,
    '',
    ...table(['토큰', '라이트', '다크', '쓰는 곳'], t.color.light.map((c) => [`\`--${c.name}\``, `\`${c.value}\``, `\`${dark[c.name]}\``, c.use])),
    '',
    '## workout-memo 기존 토큰 대응표',
    '',
    t.legacy.description,
    '',
    ...table(['기존', '새 토큰', '비고'], t.legacy.map.map((m) => [`\`${m.old}\``, m.new, m.note])),
    '',
  ].join('\n');
}

export function renderVersions(v, dependencyFiles) {
  const rows = [];
  for (const [part, sections] of Object.entries(v.dependencies)) {
    for (const [section, deps] of Object.entries(sections)) {
      for (const [name, version] of Object.entries(deps)) rows.push([`\`${name}\``, version, `\`${dependencyFiles[part]}\``, section]);
    }
  }
  return [
    '# 버전 원본',
    '',
    '<!-- 자동 생성 파일. 수정은 versions.json에서 하고 `npm run docs` 로 다시 생성한다. -->',
    '',
    '중앙이 정하는 도구·패키지 버전이다. 바꾸는 절차는 [의존성 정책](dependency-policy.md)을 따른다.',
    '',
    '## 도구',
    '',
    ...table(['항목', '버전'], [
      ['Node', v.node],
      ['npm', v.npm],
      ['PostgreSQL', v.postgres],
      ['Terraform', `${v.terraform.required} (CI ${v.terraform.cli ?? '미정'})`],
      ['GitHub 러너', `\`${v.runner}\``],
      ...Object.entries(v.images).map(([name, image]) => [`이미지 ${name}`, `\`${image.split('@')[0]}\`${image.includes('@') ? ' (digest 고정)' : ''}`]),
    ]),
    '',
    '## 공유 설정 패키지 (@sirloinbh)',
    '',
    ...table(['패키지', '버전'], Object.entries(v.packages).map(([name, version]) => [`\`${name}\``, version ?? '배포 전'])),
    '',
    '## 앱 공통 의존성',
    '',
    '앱 8개와 스캐폴드가 같은 파일·같은 칸에 같은 버전으로 쓰는 외부 의존성이다. 앱 `package.json`의 관리 필드라서, 앱 하나만 버전이 다르면 `standards-check`가 실패한다(#304). 한 앱만 쓰는 의존성은 여기에 없다.',
    '',
    ...table(['패키지', '버전', '파일', '칸'], rows),
    '',
  ].join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const tokens = JSON.parse(fs.readFileSync(path.join(root, 'design/tokens.json'), 'utf8'));
  const outputs = [
    ['docs/projects.md', renderProjects(loadAll(root).data)],
    ['docs/versions.md', renderVersions(loadAll(root).data.versions, JSON.parse(fs.readFileSync(path.join(root, 'templates/index.json'), 'utf8')).dependencyFields.files)],
    ['docs/design-tokens.md', renderTokens(tokens)],
  ];
  let stale = false;
  for (const [rel, text] of outputs) {
    const target = path.join(root, rel);
    if (process.argv.includes('--check')) {
      const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : '';
      if (current !== text) {
        console.error(`${rel} is stale. Run \`npm run docs\` and commit the result.`);
        stale = true;
      } else console.log(`${rel}: up to date`);
    } else {
      fs.writeFileSync(target, text);
      console.log(`wrote ${rel}`);
    }
  }
  if (stale) process.exit(1);
}
