# #178 Codex 규칙과 거부 목록에 빠진 npm 별칭 더하기

## 조사

- **npm 별칭:** Node 24.21.0에 포함된 npm 11.19.0의 `lib/utils/cmd-list.js`에서 설치 계열 11개 명령(`install`, `ci`, `install-test`, `install-ci-test`, `update`, `uninstall`, `exec`, `init`, `rebuild`, `dedupe`, `link`)으로 풀리는 이름은 45개다. 그중 `u`, `ic`, `install-clean`, `isntall-clean`, `clean-install-test`, `sit`, `rb`, `ddp`, `unlink`, `innit` 10개가 거부 목록과 Codex 규칙에 없었다.
- **줄임과 camelCase:** npm은 다른 이름과 겹치지 않는 앞부분(`upd`)과 camelCase(`installTest` → `install-test`)도 받아들인다. 모든 명령·별칭의 앞부분과 그 camelCase 형태를 npm의 `deref`로 풀어 보니 설치 명령이 되는 형태가 102개 더 있다. 훅의 `npmCommand`도 이 모든 후보에서 npm과 같은 결과를 냈다.
- **Codex 규칙(https://learn.chatgpt.com/docs/agent-configuration/rules):** `pattern`은 글자 그대로의 단어나 단어 묶음만 받는다. `bash -lc`·`sh -c`·`zsh -c`는 단어와 `&&` `||` `;` `|`로만 된 스크립트면 나눠서 규칙을 적용하고, 리다이렉션·치환·환경변수·와일드카드·제어문이 있으면 나누지 않는다. 전체 경로를 프로그램 이름으로 줄인다는 설명은 없다.
- **Codex 훅(https://learn.chatgpt.com/docs/hooks.md):** `PreToolUse` 훅이 기본으로 켜져 있고, 셸 명령은 `Bash`로 매칭되며 `tool_input.command`와 종료 코드 2를 쓴다. 사용자가 훅 정의를 검토·신뢰해야 실행되고, 훅이 실패하면 도구 호출을 막지 않는다. 문서는 훅을 완전한 강제 경계가 아니라고 적는다.

## 변경

| 파일 | 내용 |
|---|---|
| `templates/common/.claude/settings.json.tmpl` | 빠진 별칭 10개를 Bash·PowerShell 거부 목록에 추가(규칙 86개 → 106개) |
| `templates/common/.codex/rules/package-installs.rules` | 첫 규칙에 같은 별칭 10개 추가. 줄임·camelCase 102개를 나열한 두 번째 `forbidden` 규칙 추가(`match`·`not_match` 예 포함) |
| `.claude/settings.json`, `.codex/rules/` (중앙) | 템플릿과 같은 파일 |
| `scripts/test/agent-guardrails.test.mjs` | 필수 목록에 새 별칭 10개. Codex 목록의 모든 단어가 훅의 `npmCommand`로 설치 명령이 되는지, 목록 단어의 줄임·camelCase 형태가 빠지지 않았는지 확인. Codex CLI 판정 예에 새 별칭과 `npm test` 추가 |
| `docs/agent-guardrails.md` | 막는 명령, 확인 결과, Codex가 못 막는 형태와 근거, Codex 훅 검토, 바꾸는 법, 출처 |

정한 것:

- **줄임·camelCase는 Codex 규칙에만 넣었다.** Claude Code는 훅이 해석해서 막고, 훅이 실패하면 명령을 막는다(`onFailure: "block"`). 거부 목록에는 npm이 이름으로 정한 별칭 45개만 둔다.
- **옵션 순서, 전체 경로, 나누지 않는 `sh -c`는 Codex 규칙으로 막을 수 없다.** 근거를 `docs/agent-guardrails.md` "한계"에 적었다. Codex 훅으로 막을 수 있지만 이 PC에 Codex CLI가 없어 확인하지 못했으므로 넣지 않았다.

## 검증

- `node --test scripts/test/agent-guardrails.test.mjs scripts/test/package-install-hook.test.mjs`: 11개 중 10개 통과, Codex CLI 실제 판정 1개는 CLI가 없어 건너뜀.
- `UPDATE_SNAPSHOT=1 npm test`: 동기화 스냅샷 변경 없음(파일 목록이 그대로다).
- `npm run check` 통과(테스트 194개 중 193개 통과, Codex CLI 실제 판정 1개는 CLI가 없어 건너뜀).
- 실제 Claude Code 세션 확인은 하지 않았다. 새 별칭은 #162 훅이 이미 막고 있고(`npm u`, `npm ic`, `npm sit` 등은 훅 테스트에 있다), 거부 목록에 들어간 것은 테스트가 확인한다.
- `codex execpolicy check`는 Codex CLI가 없어 실행하지 못했다. CLI가 있는 PC에서 `agent-guardrails.test.mjs`가 새 별칭 7개와 `upd`, `installTest`의 `forbidden`, `npm run check`·`npm ls`·`npm audit`·`npm test`가 걸리지 않는 것을 확인한다.
