# 에이전트의 패키지 설치 차단

npm 공급망 공격(Shai-Hulud 계열) 때문에 에이전트는 패키지를 설치·삭제·실행하지 않는다([의존성 정책](dependency-policy.md)). 이 규칙을 문장(AGENTS.md)만이 아니라 도구 설정으로도 막는다(#16, #162, #178, #180). 아래 파일은 9개 리포에 중앙 관리 파일로 동기화되고, 중앙 리포에도 같은 파일이 있다.

| 도구 | 파일 | 동작 |
|---|---|---|
| Claude Code | `.claude/settings.json`의 `permissions.deny` | 일치하는 명령을 실행하지 않고 거부한다. Bash와 PowerShell 도구 모두 |
| Claude Code | `.claude/settings.json`의 `hooks.PreToolUse` → `.claude/hooks/block-package-installs.mjs` | 명령을 해석해서 설치 계열이면 막는다(종료 코드 2). 거부 목록이 놓치는 형태를 보강한다 |
| Codex | `.codex/rules/package-installs.rules` | `decision = "forbidden"`으로 묻지 않고 막는다. 글자 비교라서 npm이 받아들이는 줄임·camelCase 형태를 모두 나열한다 |
| Codex | `.codex/hooks.json`의 `PreToolUse` → `.claude/hooks/block-package-installs.mjs` | Claude Code와 같은 훅 스크립트로 명령을 해석해서 막는다(종료 코드 2). 규칙이 놓치는 형태를 보강한다. 사용자가 `/hooks`에서 신뢰해야 실행되고, 훅이 실패하면 막지 않는다 |

## 막는 명령

- `npm` 하위 명령과 npm 11의 별칭(`lib/utils/cmd-list.js`) 45개: `install`(`i`, `add`, 줄임·오타 `in`, `ins`, `inst`, `insta`, `instal`, `isnt`, `isnta`, `isntal`, `isntall`), `ci`(`clean-install`, `ic`, `install-clean`, `isntall-clean`), `install-test`(`it`), `install-ci-test`(`cit`, `clean-install-test`, `sit`), `update`(`up`, `u`, `upgrade`, `udpate`), `uninstall`(`un`, `remove`, `rm`, `r`, `unlink`), `exec`(`x`), `init`(`create`, `innit`), `rebuild`(`rb`), `dedupe`(`ddp`), `link`(`ln`), 그리고 `audit fix`. 거부 목록과 Codex 규칙이 모두 막는다
- 위 명령의 줄임(`npm upd`, `npm uni`)과 camelCase(`npm installTest`) 102개: npm은 다른 명령과 겹치지 않는 앞부분과 camelCase 이름도 받아들인다. Codex 규칙은 이 형태를 모두 나열해서 막고(#178), Claude Code는 훅이 해석해서 막는다
- 명령 전체: `npx`, `pnpm`, `pnpx`, `yarn`, `bun`, `bunx`, `corepack`

`npm run`, `npm ls`, `npm view`, `npm outdated`, `npm audit`(보고만), `npm test`는 막지 않는다. `scripts/test/agent-guardrails.test.mjs`는 Codex 목록의 모든 단어가 훅의 해석으로 설치 명령이 되는지, 목록에 있는 단어의 줄임·camelCase 형태가 빠지지 않았는지 확인한다.

## 명령을 해석하는 훅 (#162)

거부 목록은 명령 앞부분을 글자 그대로 비교하므로 아래 "한계"의 형태를 놓친다. 훅 `.claude/hooks/block-package-installs.mjs`(Node 내장 모듈만 사용)가 Bash·PowerShell 도구를 실행하기 전에 명령을 받아 다시 확인한다.

- **해석하는 것:** 따옴표, `;` `&&` `||` `|` `&` 줄바꿈으로 이어진 명령, `$( )`·백틱·`{ }` 안의 명령, 앞에 붙은 환경변수. 전체 경로와 Windows 확장자(`C:\…\npm.cmd`, `/c/…/npm.exe`)는 프로그램 이름만 본다.
- **npm 인자:** 하위 명령 앞의 옵션(`--silent`, `--prefix dir`, `-w app`)을 건너뛰고, npm 11의 명령·별칭 목록(`lib/utils/cmd-list.js`)과 같은 방식으로 하위 명령을 정한다. 그래서 거부 목록에 없는 줄임(`npm upd`)과 camelCase(`npm installTest`)도 막는다.
- **다른 명령으로 감싼 경우:** `sh`·`bash -c`, `pwsh`·`powershell -Command`·`-EncodedCommand`, `cmd /c`, `eval`, `Invoke-Expression`(`iex`), `Start-Process`, `env`(`-S` 포함), `sudo`, `timeout`, `nohup`, `xargs`, `cross-env`, `volta run`, `node …/npm-cli.js` 안의 명령을 다시 해석한다.
- **npx·pnpm·pnpx·yarn·bun·bunx·corepack:** 인자와 관계없이 막는다. 이 리포들은 npm만 쓴다(`packageManager`).
- **막지 않는 것:** 커밋 메시지, here-document(`<<EOF`), PowerShell here-string(`@' '@`), 주석 안의 글자. `grep "npm install"`처럼 다른 명령의 인자로 들어간 글자.
- **실패하면 막는다:** 설정에 `"onFailure": "block"`을 넣었다. 스크립트가 없거나, `node`를 못 찾거나, 10초 안에 끝나지 않거나, 입력 JSON을 읽지 못하면 명령을 실행하지 않는다. 이 필드가 없으면 훅이 실패해도 명령이 그대로 실행된다(공식 문서). Claude Code v2.1.295 이상이 필요하다.
- **실행 방식:** exec 형식(`"command": "node"`, `"args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/…"]`)이라 셸을 거치지 않는다. Windows에서 Git Bash가 있든 없든 같은 방식으로 실행된다.

## Codex에서 같은 훅 쓰기 (#180)

결정: **넣는다.** Codex 규칙은 글자 비교라 아래 "한계"의 형태(옵션을 앞에 둔 `npm --silent install`, 전체 경로, 나누지 않는 `sh -c`)를 막지 못한다. Codex도 같은 입력 형식의 `PreToolUse` 훅을 지원하므로 Claude Code 훅 스크립트를 그대로 쓴다. 다만 Codex 훅은 실패하면 막지 않고(fail-open), 사용자가 신뢰해야 실행되므로 **규칙을 대신하지 않고 보강**한다. 규칙(`forbidden`)은 그대로 유지한다.

- **입력이 같다:** Codex는 셸 명령(`exec_command`)을 훅에 `tool_name: "Bash"`, `tool_input.command`(문자열)로 넘긴다. Windows에서 PowerShell 명령이어도 이름은 `Bash`다. 스크립트가 Bash·PowerShell 문법을 함께 해석하므로 입력 처리를 바꿀 필요가 없다. 종료 코드 2와 stderr의 이유로 막는 것도 같다.
- **설정:** `.codex/hooks.json`에 `"matcher": "Bash"`, `timeout: 10`. Codex 설정 읽기는 모르는 필드가 있으면 파일 전체를 거부하므로 문서에 있는 필드(`type`, `command`, `timeout`, `statusMessage`)만 쓴다.
- **명령 한 줄로 두 셸에서 실행:** Codex는 훅 명령을 macOS·Linux에서는 `$SHELL -lc`, Windows에서는 `%COMSPEC% /C`(cmd)로 실행하고, 작업 폴더는 세션 폴더다. 프로젝트 폴더를 넣어 주는 변수(`${CLAUDE_PROJECT_DIR}` 같은 것)가 없어서 문서는 `git rev-parse --show-toplevel`로 리포 루트를 찾으라고 권한다. 그런데 cmd의 `for /f`로 경로를 받으면 한글 폴더(`문서`)가 깨져서, 셸 문법 대신 `node -e`가 `git rev-parse`로 루트를 찾아 훅 스크립트의 `main()`을 부른다. 이 문자열에는 sh·cmd가 따옴표 안에서 바꾸는 글자(`"` `$` 백틱 `\` `%` `^`)가 없어서 `commandWindows` 없이 한 줄로 둘 다 동작한다(테스트가 확인한다).
- **신뢰:** 프로젝트 `.codex/` 폴더를 신뢰해야 읽고, 훅 정의마다 사용자가 `/hooks`에서 검토·신뢰해야 실행된다. 신뢰는 훅 정의의 해시로 기록되므로 `.codex/hooks.json`의 훅이 바뀌면 다시 신뢰해야 한다. 훅 스크립트(`.claude/hooks/…`) 내용이 바뀌는 것은 해시에 들어가지 않는다.
- **실패하면 막지 않는다:** Codex 소스(`codex-rs/hooks/src/events/pre_tool_use.rs`)는 종료 코드 2(이유 있음)와 deny JSON만 막고, 다른 종료 코드·시간 초과·실행 실패는 "실패"로 보고하고 도구를 그대로 실행한다. Claude Code의 `onFailure: "block"` 같은 설정이 없다. 그래서 `node`나 `git`이 없거나, git 리포가 아닌 곳에서 시작했거나, 사용자가 훅을 신뢰하지 않으면 이 훅은 아무것도 막지 않고 규칙만 남는다.

## 확인한 결과 (2026-10-22)

- Claude Code(중앙 리포): `npm install --dry-run`이 Bash와 PowerShell 모두에서 거부됐다. `FOO=1 npx --version`(환경변수를 앞에 붙임)도 거부됐다. `npm run`, `npm ls`는 실행됐다.
- Claude Code 2.1.308 훅(중앙 리포, Windows): `claude -p` 세션에서 Bash의 `npm --silent install --help`, `sh -c "npm i --help"`, `"/c/Program Files/Volta/npm.exe" install --help`와 PowerShell의 `npm --silent install --help`, `& "C:\Program Files\Volta\npm.cmd" ci --help`가 훅 메시지로 거부됐다. Bash·PowerShell의 `npm ls --depth=0`, `npm run`은 실행됐다. 설치가 실제로 일어나지 않도록 `--help`를 붙여 확인했다.
- 훅 판정은 `scripts/test/package-install-hook.test.mjs`가 막을 명령 45개, 허용할 명령 20개로 확인한다.
- #180 Codex 훅: 같은 테스트가 `.codex/hooks.json`의 명령을 Codex 실행 방식대로(Windows `cmd /C "<명령>"`, 그 밖 `$SHELL -lc`) 리포 루트와 하위 폴더에서 실행해 `npm --silent install`, `& "C:\…\npm.cmd" ci`는 종료 코드 2, `npm ls`는 0인 것을 확인한다. 중앙 PC(Windows, 한글 경로)에서 cmd와 Git Bash 모두 통과했다. Codex CLI가 없어 실제 Codex 세션에서의 차단과 신뢰 절차는 확인하지 못했다.
- #178·#180 Codex CLI 0.144.4 `codex execpolicy check`(2026-10-23, 중앙 PC): 새 별칭 `npm u react`, `ic`, `sit`, `install-clean`, `unlink x`, `rb`, `ddp`, `innit`과 줄임·camelCase `npm upd`, `npm uni x`, `npm installTest`는 `forbidden`, `npm run check`, `npm ls`, `npm audit`, `npm test`는 규칙에 걸리지 않았다. 옵션을 앞에 둔 `npm --silent install`은 규칙에 걸리지 않아(한계 절) 훅이 막는다. `scripts/test/agent-guardrails.test.mjs`의 Codex CLI 판정 테스트가 건너뛰지 않고 통과했다.
- Codex CLI 0.144.4 `codex execpolicy check`(#16): `npm install`, `npm i react`, `npm ci`, `npm audit fix`, `npx shadcn add button`, `yarn`, `corepack enable`은 `forbidden`, `npm run check`, `npm ls`, `npm audit`는 규칙에 걸리지 않았다. 이 검사는 Codex CLI가 있는 PC에서 `scripts/test/agent-guardrails.test.mjs`가 다시 실행한다.

## 한계

이 차단은 실수와 지시 위반을 막는 장치이고, 보안 경계는 아니다. 공식 문서에 적힌 한계와 훅의 한계는 다음과 같다.

- **Claude Code 거부 목록:** 명령 글자를 앞에서부터 비교한다. `npm --silent install`처럼 옵션을 하위 명령 앞에 두거나, `sh -c '…'`, 전체 경로(`C:\…\npm.cmd`)로 실행하면 걸리지 않는다(이 형태는 훅이 막는다). `&&`, `;`, `|`로 이어진 명령과 앞에 붙은 환경변수, `timeout`·`nohup` 같은 감싸는 명령은 걸린다. 프로젝트의 deny는 개인 설정의 allow보다 우선하고, `.claude/settings.local.json`으로 풀 수 없다.
- **Claude Code 훅:** 셸을 완전히 해석하지는 않는다. 변수에 담은 명령(`$c = 'npm'; & $c install`), 큰따옴표 안의 `$( )`, 별칭·함수, `find -exec`, `node -e`로 child_process를 부르는 경우, 스크립트 파일(`bash x.sh`, `pwsh -File x.ps1`) 안의 명령은 보지 못한다. Bash·PowerShell 도구만 검사한다. 훅 설정은 세션을 시작할 때 읽으므로 바꾼 뒤에는 세션을 다시 시작한다.
- **Codex:** 프로젝트의 `.codex/` 폴더를 사용자가 신뢰(trust)해야 규칙을 읽는다. 리포를 처음 Codex로 열 때 신뢰 여부를 묻는다. 기본 샌드박스(`workspace-write`)는 네트워크를 꺼 두므로 설치가 한 번 더 막힌다. 네트워크를 켜는 설정(`[sandbox_workspace_write] network_access = true`)은 쓰지 않는다.
- **Codex 규칙이 못 막는 형태(#178 조사):** 규칙의 `pattern`은 글자 그대로의 단어나 단어 묶음만 받고 정규식·와일드카드가 없다(공식 문서). 그래서 별칭·줄임·camelCase는 모두 나열해서 막았지만, 아래 형태는 규칙으로 막을 수 없다.
  - 하위 명령 앞의 옵션(`npm --silent install`, `npm -w app install`): 두 번째 단어가 옵션이라 `["npm", …]` 패턴에 걸리지 않는다. 옵션과 값의 조합은 끝이 없어 나열할 수 없다.
  - 전체 경로(`/usr/bin/npm install`, `C:\…\npm.cmd install`): 공식 문서는 명령을 `execvp`가 받는 인자 목록으로 비교한다고만 하고, 경로를 프로그램 이름으로 줄인다는 말이 없다. 경로는 PC마다 달라 나열할 수 없다.
  - `bash -lc`·`sh -c`·`zsh -c`: 스크립트가 단어와 `&&` `||` `;` `|`로만 이어져 있으면 Codex가 나눠서 규칙을 적용하므로 막힌다(공식 문서). 리다이렉션, `$( )`, 환경변수, 와일드카드, 제어문이 있으면 나누지 않고 `["bash", "-lc", "<스크립트 전체>"]` 하나로 비교하므로 걸리지 않는다. `pwsh -Command`, `cmd /c`는 문서에 나오지 않는다.
- **Codex 훅(#180):** 위 형태는 `.codex/hooks.json`의 훅이 막는다("Codex에서 같은 훅 쓰기"). 공식 문서는 훅을 "완전한 강제 경계가 아니라 유용한 보호 장치"로 다룬다. 훅이 실패하거나 신뢰되지 않으면 막지 않으므로 이 형태는 그때 다시 막히지 않는다. 훅이 보는 범위는 Claude Code 훅의 한계와 같다(변수에 담은 명령, 스크립트 파일 안의 명령 등). `write_stdin`으로 이미 실행 중인 셸에 넣는 입력은 `PreToolUse`를 다시 거치지 않는다(공식 문서).
- AGENTS.md의 금지 문장은 두 도구 모두 안내로만 읽는다. 차단은 위 설정 파일이 한다.

## 에이전트의 git 브랜치 명령 권한 (#361)

[std-git-writing](../templates/common/skills/std-git-writing/SKILL.md)의 "로컬 브랜치 관리 (git CLI)" 명령은 에이전트가 묻지 않고 실행한다. 규칙은 PC별 전역 설정이 아니라 중앙 관리 파일에 둔다. 그래서 동기화된 리포에서는 PC마다 따로 설정하지 않아도 같게 동작한다.

| 결정 | 명령 |
|---|---|
| 묻지 않고 실행 | `git switch`, `git pull --ff-only`, `git branch --delete`, `git fetch origin`, `git fetch --prune origin` |
| 승인 필요 | `git switch`의 `-f`·`-C`·`--force`·`--force-create`·`--discard-changes`, `git branch`의 `-D`·`-f`·`--force`, `git reset --hard`, `git clean`, `git stash`, `git rebase` |
| 막음 | 강제 push(`-f`, `--force`, `--force-with-lease`, `origin +브랜치`), main 직접 push |

- Claude Code는 `.claude/settings.json`의 `permissions.allow`·`ask`·`deny`에 Bash와 PowerShell 도구 규칙을 같이 둔다. 우선순위는 deny, ask, allow 순서다. `scripts/test/agent-guardrails.test.mjs`가 같은 순서로 샘플 명령을 판정한다.
- Codex는 `.codex/rules/git-branch.rules`를 쓴다. 명령 앞부분만 비교하므로 뒤에 붙인 옵션(`git switch main -f`)은 구별하지 못한다.
- PowerShell 도구의 규칙은 대소문자를 구별하지 않는다(2026-10-31 실제 실행으로 확인). `git branch -d`는 `-D`, `git switch -c`는 `-C` 승인 규칙에 걸리므로 스킬은 `--delete`, `--create`를 쓴다.
- 프로젝트의 `permissions.allow`는 사용자가 신뢰한 폴더에서만 적용된다. 새 PC나 새 클론은 Claude Code를 대화형으로 한 번 열어 신뢰를 수락해야 한다.
- 합친 짧은 옵션(`git switch -fc x`)은 어느 쪽 규칙도 구별하지 못한다. 규칙은 실수를 줄이는 장치이고 보안 경계가 아니다.
- 작업 브랜치 push, `git add`, `git commit`은 이 규칙에 넣지 않았다. 각 PC의 설정을 따른다.
- 전역 지침(`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`)에 Fork 규칙 절이 남아 있으면 Claude Code의 `SessionStart` 훅(`.claude/hooks/pc-setup-notice.mjs`)이 세션 시작 때 적용 방법을 알린다(#368). 읽기만 하고, 오류가 나도 세션을 막지 않는다. 리포의 훅을 받기 전의 클론과 Codex 세션에서는 나오지 않는다.

## 바꾸는 법

- 원본은 `templates/common/.claude/settings.json.tmpl`, `templates/common/.claude/hooks/block-package-installs.mjs`, `templates/common/.codex/rules/package-installs.rules`, `templates/common/.codex/rules/git-branch.rules`, `templates/common/.codex/hooks.json.tmpl`이다. Codex 훅 설정을 바꾸면 각 리포에서 사용자가 `/hooks`로 다시 신뢰해야 하므로 꼭 필요할 때만 바꾼다. 훅 스크립트는 Claude Code(`node <파일>`)와 Codex(`node -e`로 `main()` 호출)가 함께 쓰므로 `main` export를 유지한다. 거부 목록과 Codex 규칙은 같은 명령을 막아야 한다(테스트가 비교한다). 중앙 리포의 `.claude/settings.json`, `.claude/hooks/`, `.codex/rules/`도 같이 고친다.
- npm이 명령이나 별칭을 바꾸면 훅의 `NPM_COMMANDS`·`NPM_ALIASES`, 거부 목록, Codex 규칙의 두 목록(별칭, 줄임·camelCase)을 함께 고친다. 빠진 줄임·camelCase 형태는 `scripts/test/agent-guardrails.test.mjs`가 알려 준다.
- 훅이 막을 명령이나 허용할 명령을 바꾸면 `scripts/test/package-install-hook.test.mjs`의 목록에 예를 추가한다.
- 리포에만 필요한 Claude Code 설정은 `.claude/settings.local.json`(커밋하지 않음)에 둔다. `.claude/settings.json`과 `.claude/hooks/`는 중앙 관리 파일이라 고치면 standards-check가 실패한다.
- 사용자가 승인한 설치는 사용자가 직접 터미널에서 `npm install --ignore-scripts <패키지>@<버전>`으로 실행한다.

## 출처

- Claude Code 훅(PreToolUse 입력 `tool_input.command`, 종료 코드 2, `matcher`, exec 형식, `onFailure`, 기본 timeout 600초): https://code.claude.com/docs/en/hooks.md
- Claude Code 권한 규칙: https://code.claude.com/docs/en/permissions.md, 설정: https://code.claude.com/docs/en/settings.md
- npm 명령·별칭 목록: npm 11 `lib/utils/cmd-list.js`(Node 24.21.0에 포함된 npm)
- Codex 규칙(`pattern`은 글자 그대로의 단어, `bash -lc` 나누기 조건): https://learn.chatgpt.com/docs/agent-configuration/rules, Codex 훅(PreToolUse, `hooks.json`, 신뢰, 종료 코드 2, 실패 시 계속 실행): https://learn.chatgpt.com/docs/hooks.md, 승인·샌드박스: https://learn.chatgpt.com/docs/agent-approvals-security.md, AGENTS.md: https://learn.chatgpt.com/docs/agent-configuration/agents-md
- Codex 훅 구현(#180, openai/codex `main`, 2026-10-22 확인): 셸 명령의 훅 이름 `Bash`와 입력 `{"command": cmd}`는 `codex-rs/core/src/tools/hook_names.rs`, `codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs`, 훅 설정 필드(`commandWindows`, `timeout`, `statusMessage`, 모르는 필드 거부)는 `codex-rs/config/src/hook_config.rs`, 실행 셸(`$SHELL -lc`, `%COMSPEC% /C`)은 `codex-rs/hooks/src/engine/command_runner.rs`, 실패 시 막지 않음과 종료 코드 처리는 `codex-rs/hooks/src/events/pre_tool_use.rs`, 신뢰 해시와 기본 timeout 600초는 `codex-rs/hooks/src/engine/discovery.rs`
