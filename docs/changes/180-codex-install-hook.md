# #180 Codex에 npm 설치 차단 훅 넣기

## 결정

Codex에도 `PreToolUse` 훅을 넣고, Claude Code 훅 스크립트(`.claude/hooks/block-package-installs.mjs`)를 그대로 쓴다. Codex 규칙(`.codex/rules/package-installs.rules`)은 글자 비교라 `npm --silent install`, 전체 경로, 나누지 않는 `sh -c`를 막지 못하는데, 훅은 이 형태를 막는다. Codex 훅은 실패하면 막지 않고 사용자가 신뢰해야 실행되므로 규칙을 대신하지 않고 보강한다.

## 조사

공식 문서(https://learn.chatgpt.com/docs/hooks.md)와 openai/codex `main` 소스를 확인했다(2026-10-22).

- **입력:** 셸 명령(`exec_command`)은 훅에 `tool_name: "Bash"`, `tool_input: {"command": <문자열>}`로 들어온다(`codex-rs/core/src/tools/hook_names.rs`, `handlers/unified_exec/exec_command.rs`). Windows에서도 이름은 `Bash`다. 스크립트의 입력 처리를 바꿀 필요가 없다.
- **막는 방법:** 종료 코드 2와 stderr 이유, 또는 `permissionDecision: "deny"` JSON. Claude Code와 같다.
- **설정 형식:** `<repo>/.codex/hooks.json`의 `hooks.PreToolUse[].matcher`·`hooks[]`. 명령 훅 필드는 `type`, `command`, `commandWindows`, `timeout`(초, 기본 600), `async`, `statusMessage`, `additionalContextLimit`이다. 파일 최상위는 모르는 필드를 거부한다(`codex-rs/config/src/hook_config.rs`).
- **실행 방식:** macOS·Linux는 `$SHELL -lc <명령>`, Windows는 `%COMSPEC% /C "<명령>"`(raw)로 실행하고 작업 폴더는 세션 폴더다(`codex-rs/hooks/src/engine/command_runner.rs`). 프로젝트 폴더 변수가 없어 문서는 `git rev-parse --show-toplevel`을 권한다.
- **신뢰:** 프로젝트 `.codex/`를 신뢰해야 읽고, 관리되지 않는 훅은 `/hooks`에서 검토·신뢰해야 실행된다. 신뢰는 훅 정의의 해시로 기록되어 바뀌면 다시 신뢰해야 한다.
- **실패 시 동작:** 종료 코드 2(이유 있음)와 deny만 막는다. 다른 종료 코드, 시간 초과, 실행 실패는 실패로 보고하고 도구를 실행한다(`codex-rs/hooks/src/events/pre_tool_use.rs`, `should_block`은 막는 경로에서만 참). `onFailure: "block"` 같은 설정은 없다.

## 변경

| 파일 | 내용 |
|---|---|
| `templates/common/.codex/hooks.json.tmpl` | `PreToolUse` `Bash` 훅, `timeout: 10`, `statusMessage`. 명령은 `node -e`가 `git rev-parse --show-toplevel`로 루트를 찾아 훅의 `main()`을 부른다 |
| `templates/common/.claude/hooks/block-package-installs.mjs` | `main`을 export하고 주석에 Codex 사용을 적음. 판정과 Claude Code 동작은 그대로 |
| `.codex/hooks.json`, `.claude/hooks/` (중앙) | 템플릿과 같은 파일 |
| `templates/app/.prettierignore.tmpl` | `.codex/hooks.json` (중앙 관리 파일은 앱에서 포맷하지 않음) |
| `scripts/test/package-install-hook.test.mjs` | Codex 설정 모양과 중앙 사본 일치, 설정의 명령을 Codex 실행 방식대로 루트·하위 폴더에서 실행해 차단·허용 확인 |
| `scripts/test/fixtures/sync-snapshot.json` | 9개 리포에 `full .codex/hooks.json` 추가 |
| `docs/agent-guardrails.md` | "Codex에서 같은 훅 쓰기" 절, 한계, 바꾸는 법, 출처 |

정한 것:

- **명령 한 줄, `commandWindows` 없음:** 처음에는 cmd용으로 `for /f … in ('git rev-parse --show-toplevel') do node "%r/…"`를 시험했으나 한글 경로(`문서`)가 cmd에서 깨져 훅을 찾지 못했다. `node -e`가 루트를 찾으면 경로가 셸을 거치지 않는다. 이 문자열에는 sh·cmd가 큰따옴표 안에서 바꾸는 글자가 없어 두 셸에서 같은 문자열이 동작한다.
- **필드 최소화:** 문서에 있는 `description` 같은 최상위 필드는 넣지 않았다. 이 필드를 모르는 이전 Codex가 파일 전체를 거부할 수 있다.
- **스크립트 위치:** `.codex/hooks/`에 사본을 두지 않고 `.claude/hooks/`의 스크립트를 함께 쓴다. 두 도구의 판정이 어긋나지 않는다.

## 검증

- `node --test scripts/test/package-install-hook.test.mjs`: 8개 통과. 새 테스트는 Windows `cmd.exe /C "<명령>"`로 리포 루트와 `scripts/test`에서 `npm --silent install`·`& "C:\…\npm.cmd" ci`는 종료 코드 2, `npm ls`는 0을 확인했다.
- 같은 명령을 Git Bash `bash -lc`로도 수동 실행해 차단 2, 허용 0을 확인했다.
- `UPDATE_SNAPSHOT=1 npm test`: 스냅샷 변경은 9개 리포의 `full .codex/hooks.json` 추가뿐이다.
- `npm run check` 통과(테스트 386개 중 385개 통과, Codex CLI 실제 판정 1개는 CLI가 없어 건너뜀).
- **하지 못한 것:** 이 PC에 Codex CLI가 없어 실제 Codex 세션에서의 훅 신뢰(`/hooks`)와 차단, #178의 `codex execpolicy check` 판정을 확인하지 못했다. 사용자 PC에서 확인한다(PR "병합 전에 확인해 주세요").

## 추가 검증 (2026-10-23)

중앙 PC에 Codex CLI 0.144.4가 설치되어 PR에서 하지 못한 `codex execpolicy check` 판정을 실행했다.

- `node --test scripts/test/agent-guardrails.test.mjs scripts/test/package-install-hook.test.mjs`: 13개 모두 통과, 건너뜀 0개. Codex CLI 판정 테스트가 처음으로 실제 실행됐다.
- 수동 판정(`templates/common/.codex/rules/package-installs.rules`): `npm u react`, `npm ic`, `npm sit`, `npm install-clean`, `npm unlink x`, `npm rb`, `npm ddp`, `npm innit`, `npm upd`, `npm uni x`, `npm installTest`는 `forbidden`. `npm run check`, `npm ls`, `npm audit`는 규칙에 걸리지 않음. `npm --silent install`도 걸리지 않음(규칙의 한계, 훅이 보강).
- **남은 것:** 실제 Codex 세션에서 `/hooks`로 훅을 신뢰한 뒤 `npm --silent install --help`가 막히는지 확인하는 일은 대화형 세션이 필요해 사용자가 한다.
