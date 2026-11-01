# #375 에이전트의 npm ci 허용

- 이슈: [#375](https://github.com/sirloinbh/project-standards/issues/375)
- 브랜치: `feat/375-allow-npm-ci`

## 목적

작업 폴더에 `node_modules`가 없으면 에이전트가 `npm run check`를 돌릴 수 없었다. 앱에서는 거부 목록과 훅을 풀 수 없어, 사용자가 중앙에서 허용하기로 정했다(2026-11-01).

## 변경 — 2026-11-01

- 거부 목록, 훅, Codex 규칙에서 `npm ci`와 그 별칭을 뺐다. `npm install` 등 다른 설치 명령은 그대로 막는다.
- 별칭은 동작이 같아 함께 풀었다. 별칭만 막으면 "목록의 단어는 훅도 막는다"는 검사와 어긋난다.
- 훅은 설치 스크립트를 켜는 옵션(줄임 포함)이나 환경변수가 같은 명령에 있는 `npm ci`를 막는다. `.npmrc`의 `ignore-scripts=true`를 한 명령에서 되돌리기 때문이다.
- `tools/repos.mjs run`은 `npm ci`를 계속 거부한다. 이번 허용은 한 작업 폴더에서 검사를 돌리기 위한 것이고, 공급망 공격이 진행 중일 때 영향이 모든 리포로 넓어지면 안 되기 때문이다. 훅에 `findAnyInstall`을 추가했다.
- 앱 `AGENTS.md` 템플릿, Dev Container compose 템플릿, `docs/agent-guardrails.md`, `docs/dependency-policy.md`, `docs/tools.md`, `docs/test-config.md`, `docs/bootstrap-prompt.md`를 고쳤다.

## 제한

- 거부 목록과 Codex 규칙은 단어만 비교해 옵션을 보지 못한다. 스크립트를 켜는 옵션과 환경변수는 훅만 막는다. Codex 훅은 신뢰해야 실행되고 실패하면 막지 않는다.
- 훅은 명령 한 번만 본다. 앞선 명령에서 설정해 둔 환경변수와 `.npmrc` 수정은 막지 못한다.
- 잠금 파일이 바뀐 브랜치에서 `npm ci`를 돌리면 아직 검토하지 않은 버전이 설치될 수 있다. 이번 허용에 따르는 위험으로 받아들였다.
- 훅 설정은 세션을 시작할 때 읽는다. 앱에 동기화된 뒤 새 세션부터 적용된다.

## 검증

- `npm run check`: 통과(503개 통과, 18개 건너뜀, 실패 0).
- Codex CLI가 없어 Codex 규칙의 실제 판정 테스트는 건너뛰었다.
