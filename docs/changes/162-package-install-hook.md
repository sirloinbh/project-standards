# #162 명령을 해석해 npm 설치를 막는 훅

## 조사 (공식 문서 https://code.claude.com/docs/en/hooks.md)

- **입력:** PreToolUse 훅은 stdin으로 JSON을 받는다. `tool_name`이 `Bash` 또는 `PowerShell`이고, 실행할 명령은 두 도구 모두 `tool_input.command`다. 문서는 셸 명령을 검사하는 훅에 `"matcher": "Bash|PowerShell"`을 권한다.
- **막는 방법:** 종료 코드 2는 도구 실행을 막고 stderr를 이유로 Claude에게 보여 준다(JSON `permissionDecision: "deny"`와 같다). 그 밖의 0이 아닌 종료 코드는 막지 않는다.
- **실패 시 동작:** 기본은 실패해도 실행된다(스크립트 없음, 시작 실패, 시간 초과, 잘못된 출력). `"onFailure": "block"`(v2.1.295 이상)을 넣으면 실패를 종료 코드 2처럼 처리한다. 기본 timeout은 600초다.
- **Windows:** 셸 형식 훅은 Git Bash, 없으면 PowerShell로 실행된다. `args`를 쓰는 exec 형식은 셸 없이 실행하고 `${CLAUDE_PROJECT_DIR}`를 바꿔 넣는다.
- 훅이 deny를 내도 `permissions.deny`는 따로 평가되므로 두 장치는 함께 동작한다.

## 변경

| 파일 | 내용 |
|---|---|
| `templates/common/.claude/hooks/block-package-installs.mjs` | 훅 스크립트(Node 내장 모듈만). 명령을 단순 명령으로 나누고, npm 인자를 npm 11 명령·별칭 목록대로 해석하고, `sh -c`·`pwsh -Command`·`cmd /c`·`eval` 등 안의 명령을 다시 해석한다. 설치 계열이면 종료 코드 2 |
| `templates/common/.claude/settings.json.tmpl` | `hooks.PreToolUse`: `Bash|PowerShell`에 exec 형식(`node` + `${CLAUDE_PROJECT_DIR}/.claude/hooks/…`), `timeout: 10`, `onFailure: "block"` |
| `.claude/settings.json`, `.claude/hooks/` (중앙) | 템플릿과 같은 파일 |
| `templates/app/.prettierignore.tmpl` | `.claude/hooks/` (#154 규칙: 중앙 관리 파일은 앱에서 포맷하지 않음) |
| `scripts/test/package-install-hook.test.mjs` | 막을 명령 45개, 허용할 명령 20개, 훅 프로세스의 종료 코드, 설정 모양, 중앙 사본 일치 |
| `scripts/test/fixtures/sync-snapshot.json` | 9개 리포에 `full .claude/hooks/block-package-installs.mjs` 추가 |
| `docs/agent-guardrails.md` | 훅 절, 확인 결과, 한계, 바꾸는 법, 출처 |

정한 것:

- **9개 리포 동기화:** 한다. 거부 목록(#16)과 같은 `templates/common/` 전체 관리 파일이라 standards-check가 해시로 확인한다.
- **npx·pnpm·yarn·bun 등:** 인자를 해석하지 않고 모두 막는다. 거부 목록과 같은 기준이고, 이 리포들은 npm만 쓴다.
- **실패하면 막기(fail-closed):** `node`가 없거나 스크립트가 없으면 Bash·PowerShell 도구가 모두 막힌다. 모든 리포가 Node 프로젝트라 이 쪽을 택했다.
- **오탐 방지:** 커밋 메시지·here-document·here-string·주석·다른 명령의 인자에 들어간 `npm install` 글자는 막지 않는다.

## 사용자 결정 (2026-10-22)

- `onFailure: "block"`을 유지한다. 이 필드는 Claude Code v2.1.295 이상이 필요하다(`docs/agent-guardrails.md`에 적음).
- 현재 범위로 병합한다.
- Codex 규칙과 거부 목록에 빠진 npm 별칭(`u`, `ic`, `sit`, `rb`, `ddp`, `unlink`, `innit`)과 Codex가 못 막는 우회 형태는 후속 이슈 #178에서 다룬다.

## 검증

- `claude -p`(Claude Code 2.1.308, Windows, 이 브랜치)로 실제 확인: Bash `npm --silent install --help`, `sh -c "npm i --help"`, `"/c/Program Files/Volta/npm.exe" install --help`, PowerShell `npm --silent install --help`, `& "C:\Program Files\Volta\npm.cmd" ci --help`가 훅으로 거부됐다. Bash·PowerShell `npm ls --depth=0`, Bash `npm run`은 실행됐다. 설치가 일어나지 않게 `--help`를 붙였다.
- `npm run check` 통과(origin/main 재기준 후 테스트 186개 중 185개 통과, Codex CLI 실제 판정 1개는 CLI가 없어 건너뜀).
