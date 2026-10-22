# #16 에이전트의 npm 설치 차단

## 변경

| 파일 | 내용 |
|---|---|
| `templates/common/.claude/settings.json` | Claude Code `permissions.deny` 66개: 설치 계열 npm 하위 명령 26개와 npx·pnpm·pnpx·yarn·bun·bunx·corepack을 Bash·PowerShell 도구 모두에서 거부 |
| `templates/common/.codex/rules/package-installs.rules` | Codex `prefix_rule` 3개(`forbidden`): 같은 명령 목록 |
| `.claude/settings.json`, `.codex/rules/` (중앙) | 템플릿과 같은 파일. 중앙 리포에 먼저 적용 |
| `templates/app/.prettierignore` | `.claude/settings.json` (#154 규칙) |
| `scripts/test/agent-guardrails.test.mjs` | 중앙 사본 일치, Bash·PowerShell 목록 일치, Codex 목록 일치, Codex CLI가 있으면 실제 판정 |
| `docs/agent-guardrails.md` | 막는 명령, 확인 결과, 한계, 바꾸는 법, 출처 |
| `docs/dependency-policy.md` | 승인된 설치는 사용자가 직접 실행한다는 문장과 링크 |

하위 리포 검사: 두 파일은 전체 관리 파일이라 standards-check가 해시로 확인한다. 별도 검사는 만들지 않았다.

## 검증

- 중앙 리포에서 `npm install --dry-run`(Bash, PowerShell)과 `FOO=1 npx --version`이 거부됐다. `npm run`, `npm ls`는 실행됐다.
- `codex execpolicy check`(Codex CLI 0.144.4)로 설치 계열 7개 `forbidden`, `npm run check`·`npm ls`·`npm audit`는 규칙에 걸리지 않음을 확인했다.
- `npm run check` 통과(161개). 동기화 스냅샷: 9개 리포에 파일 2개씩 추가.
