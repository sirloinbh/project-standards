# 에이전트의 패키지 설치 차단

npm 공급망 공격(Shai-Hulud 계열) 때문에 에이전트는 패키지를 설치·삭제·실행하지 않는다([의존성 정책](dependency-policy.md)). 이 규칙을 문장(AGENTS.md)만이 아니라 도구 설정으로도 막는다(#16, #162, #178). 아래 파일은 9개 리포에 중앙 관리 파일로 동기화되고, 중앙 리포에도 같은 파일이 있다.

| 도구 | 파일 | 동작 |
|---|---|---|
| Claude Code | `.claude/settings.json`의 `permissions.deny` | 일치하는 명령을 실행하지 않고 거부한다. Bash와 PowerShell 도구 모두 |
| Claude Code | `.claude/settings.json`의 `hooks.PreToolUse` → `.claude/hooks/block-package-installs.mjs` | 명령을 해석해서 설치 계열이면 막는다(종료 코드 2). 거부 목록이 놓치는 형태를 보강한다 |
| Codex | `.codex/rules/package-installs.rules` | `decision = "forbidden"`으로 묻지 않고 막는다. 글자 비교라서 npm이 받아들이는 줄임·camelCase 형태를 모두 나열한다 |

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

## 확인한 결과 (2026-10-22)

- Claude Code(중앙 리포): `npm install --dry-run`이 Bash와 PowerShell 모두에서 거부됐다. `FOO=1 npx --version`(환경변수를 앞에 붙임)도 거부됐다. `npm run`, `npm ls`는 실행됐다.
- Claude Code 2.1.308 훅(중앙 리포, Windows): `claude -p` 세션에서 Bash의 `npm --silent install --help`, `sh -c "npm i --help"`, `"/c/Program Files/Volta/npm.exe" install --help`와 PowerShell의 `npm --silent install --help`, `& "C:\Program Files\Volta\npm.cmd" ci --help`가 훅 메시지로 거부됐다. Bash·PowerShell의 `npm ls --depth=0`, `npm run`은 실행됐다. 설치가 실제로 일어나지 않도록 `--help`를 붙여 확인했다.
- 훅 판정은 `scripts/test/package-install-hook.test.mjs`가 막을 명령 45개, 허용할 명령 20개로 확인한다.
- #178: 이 PC에 Codex CLI가 없어 새 별칭의 `codex execpolicy check` 판정은 실행하지 못했다. 규칙 파일의 `match` 예(`npm u`, `npm sit`, `npm unlink x`, `npm upd`, `npm installTest`)는 Codex가 규칙을 읽을 때 검증한다. Codex CLI가 있는 PC에서는 `scripts/test/agent-guardrails.test.mjs`가 `npm u`, `ic`, `sit`, `rb`, `ddp`, `unlink`, `innit`, `upd`, `installTest`가 `forbidden`이고 `npm test`가 규칙에 걸리지 않는지 확인한다.
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
- **Codex에서 이 형태를 막는 방법:** Codex도 `PreToolUse` 훅을 지원한다(공식 문서, 기본 켜짐). 셸 명령은 `Bash`로 매칭되고, 입력 `tool_input.command`와 종료 코드 2(stderr가 이유)가 Claude Code와 같아서 `.claude/hooks/block-package-installs.mjs`를 그대로 쓸 수 있다. 설정 위치는 `<repo>/.codex/hooks.json` 또는 `.codex/config.toml`의 `[hooks]`다. 다만 문서는 훅을 "완전한 강제 경계가 아니라 유용한 보호 장치"로 다루고, 사용자가 훅 정의를 검토·신뢰해야 실행되며, 훅이 오류나 시간 초과로 실패하면 도구 호출을 막지 않는다(Claude Code의 `onFailure: "block"` 같은 설정이 문서에 없다). 중앙 리포 PC에 Codex CLI가 없어 실제 동작을 확인하지 못했으므로 #178에서는 넣지 않았다. 넣을지는 사용자가 정한다.
- AGENTS.md의 금지 문장은 두 도구 모두 안내로만 읽는다. 차단은 위 설정 파일이 한다.

## 바꾸는 법

- 원본은 `templates/common/.claude/settings.json.tmpl`, `templates/common/.claude/hooks/block-package-installs.mjs`, `templates/common/.codex/rules/package-installs.rules`다. 거부 목록과 Codex 규칙은 같은 명령을 막아야 한다(테스트가 비교한다). 중앙 리포의 `.claude/settings.json`, `.claude/hooks/`, `.codex/rules/`도 같이 고친다.
- npm이 명령이나 별칭을 바꾸면 훅의 `NPM_COMMANDS`·`NPM_ALIASES`, 거부 목록, Codex 규칙의 두 목록(별칭, 줄임·camelCase)을 함께 고친다. 빠진 줄임·camelCase 형태는 `scripts/test/agent-guardrails.test.mjs`가 알려 준다.
- 훅이 막을 명령이나 허용할 명령을 바꾸면 `scripts/test/package-install-hook.test.mjs`의 목록에 예를 추가한다.
- 리포에만 필요한 Claude Code 설정은 `.claude/settings.local.json`(커밋하지 않음)에 둔다. `.claude/settings.json`과 `.claude/hooks/`는 중앙 관리 파일이라 고치면 standards-check가 실패한다.
- 사용자가 승인한 설치는 사용자가 직접 터미널에서 `npm install --ignore-scripts <패키지>@<버전>`으로 실행한다.

## 출처

- Claude Code 훅(PreToolUse 입력 `tool_input.command`, 종료 코드 2, `matcher`, exec 형식, `onFailure`, 기본 timeout 600초): https://code.claude.com/docs/en/hooks.md
- Claude Code 권한 규칙: https://code.claude.com/docs/en/permissions.md, 설정: https://code.claude.com/docs/en/settings.md
- npm 명령·별칭 목록: npm 11 `lib/utils/cmd-list.js`(Node 24.21.0에 포함된 npm)
- Codex 규칙(`pattern`은 글자 그대로의 단어, `bash -lc` 나누기 조건): https://learn.chatgpt.com/docs/agent-configuration/rules, Codex 훅(PreToolUse, `hooks.json`, 신뢰, 종료 코드 2, 실패 시 계속 실행): https://learn.chatgpt.com/docs/hooks.md, 승인·샌드박스: https://learn.chatgpt.com/docs/agent-approvals-security.md, AGENTS.md: https://learn.chatgpt.com/docs/agent-configuration/agents-md
