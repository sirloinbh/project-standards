# #375 에이전트의 npm ci 허용

- 이슈: [#375](https://github.com/sirloinbh/project-standards/issues/375)
- 브랜치: `feat/375-allow-npm-ci`

## 목적

작업 폴더에 `node_modules`가 없으면 에이전트가 `npm run check`를 돌릴 수 없었다. 앱에서는 거부 목록과 훅을 풀 수 없어, 사용자가 중앙에서 허용하기로 정했다(2026-11-01).

## 변경 — 2026-11-01

- 거부 목록, 훅, Codex 규칙에서 `npm ci`와 그 별칭을 뺐다. `npm install` 등 다른 설치 명령은 그대로 막는다.
- 별칭은 동작이 같아 함께 풀었다. 별칭만 막으면 "목록의 단어는 훅도 막는다"는 검사와 어긋난다.
- 훅은 설치 스크립트를 켜는 옵션이 붙은 `npm ci`를 막는다. `.npmrc`의 `ignore-scripts=true`를 한 명령에서 되돌리는 옵션이기 때문이다.
- 앱 `AGENTS.md` 템플릿과 `docs/agent-guardrails.md`, `docs/dependency-policy.md`를 고쳤다.

## 제한

- 거부 목록과 Codex 규칙은 단어만 비교해 옵션을 보지 못한다. 스크립트를 켜는 옵션은 훅만 막는다. Codex 훅은 신뢰해야 실행되고 실패하면 막지 않는다.
- 훅 설정은 세션을 시작할 때 읽는다. 앱에 동기화된 뒤 새 세션부터 적용된다.

## 검증

- `npm run check`: 통과(503개 통과, 18개 건너뜀, 실패 0).
- Codex CLI가 없어 Codex 규칙의 실제 판정 테스트는 건너뛰었다.
