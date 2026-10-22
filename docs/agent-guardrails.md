# 에이전트의 패키지 설치 차단

npm 공급망 공격(Shai-Hulud 계열) 때문에 에이전트는 패키지를 설치·삭제·실행하지 않는다([의존성 정책](dependency-policy.md)). 이 규칙을 문장(AGENTS.md)만이 아니라 도구 설정으로도 막는다(#16). 두 파일은 9개 리포에 중앙 관리 파일로 동기화되고, 중앙 리포에도 같은 파일이 있다.

| 도구 | 파일 | 동작 |
|---|---|---|
| Claude Code | `.claude/settings.json`의 `permissions.deny` | 일치하는 명령을 실행하지 않고 거부한다. Bash와 PowerShell 도구 모두 |
| Codex | `.codex/rules/package-installs.rules` | `decision = "forbidden"`으로 묻지 않고 막는다 |

## 막는 명령

- `npm` 하위 명령: `install`(`i`, `in`, `isntall`), `add`, `ci`(`clean-install`), `install-test`(`it`), `install-ci-test`(`cit`), `update`(`up`, `upgrade`), `uninstall`(`un`, `remove`, `rm`, `r`), `exec`(`x`), `create`, `init`, `rebuild`, `dedupe`, `audit fix`
- 명령 전체: `npx`, `pnpm`, `pnpx`, `yarn`, `bun`, `bunx`, `corepack`

`npm run`, `npm ls`, `npm view`, `npm outdated`, `npm audit`(보고만)은 막지 않는다.

## 확인한 결과 (2026-10-22)

- Claude Code(중앙 리포): `npm install --dry-run`이 Bash와 PowerShell 모두에서 거부됐다. `FOO=1 npx --version`(환경변수를 앞에 붙임)도 거부됐다. `npm run`, `npm ls`는 실행됐다.
- Codex CLI 0.144.4 `codex execpolicy check`: `npm install`, `npm i react`, `npm ci`, `npm audit fix`, `npx shadcn add button`, `yarn`, `corepack enable`은 `forbidden`, `npm run check`, `npm ls`, `npm audit`는 규칙에 걸리지 않았다. 이 검사는 Codex CLI가 있는 PC에서 `scripts/test/agent-guardrails.test.mjs`가 다시 실행한다.

## 한계

이 차단은 실수와 지시 위반을 막는 장치이고, 보안 경계는 아니다. 공식 문서에 적힌 한계는 다음과 같다.

- **Claude Code:** 명령 글자를 앞에서부터 비교한다. `npm --silent install`처럼 옵션을 하위 명령 앞에 두거나, `sh -c '…'`, 전체 경로(`C:\…\npm.cmd`)로 실행하면 걸리지 않는다. `&&`, `;`, `|`로 이어진 명령과 앞에 붙은 환경변수, `timeout`·`nohup` 같은 감싸는 명령은 걸린다. 프로젝트의 deny는 개인 설정의 allow보다 우선하고, `.claude/settings.local.json`으로 풀 수 없다.
- **Codex:** 프로젝트의 `.codex/` 폴더를 사용자가 신뢰(trust)해야 규칙을 읽는다. 리포를 처음 Codex로 열 때 신뢰 여부를 묻는다. 기본 샌드박스(`workspace-write`)는 네트워크를 꺼 두므로 설치가 한 번 더 막힌다. 네트워크를 켜는 설정(`[sandbox_workspace_write] network_access = true`)은 쓰지 않는다.
- AGENTS.md의 금지 문장은 두 도구 모두 안내로만 읽는다. 차단은 위 설정 파일이 한다.

## 바꾸는 법

- 원본은 `templates/common/.claude/settings.json`과 `templates/common/.codex/rules/package-installs.rules`다. 두 목록은 같은 명령을 막아야 한다(테스트가 비교한다). 중앙 리포의 `.claude/settings.json`, `.codex/rules/`도 같이 고친다.
- 리포에만 필요한 Claude Code 설정은 `.claude/settings.local.json`(커밋하지 않음)에 둔다. `.claude/settings.json`은 중앙 관리 파일이라 고치면 standards-check가 실패한다.
- 사용자가 승인한 설치는 사용자가 직접 터미널에서 `npm install --ignore-scripts <패키지>@<버전>`으로 실행한다.

## 출처

- Claude Code 권한 규칙: https://code.claude.com/docs/en/permissions.md, 설정: https://code.claude.com/docs/en/settings.md
- Codex 규칙: https://learn.chatgpt.com/docs/agent-configuration/rules, 승인·샌드박스: https://learn.chatgpt.com/docs/agent-approvals-security.md, AGENTS.md: https://learn.chatgpt.com/docs/agent-configuration/agents-md
