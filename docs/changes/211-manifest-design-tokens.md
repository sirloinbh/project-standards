# 앱 동기화 매니페스트에서 design-tokens 빼기 (#211)

## 변경

| 파일 | 내용 |
|---|---|
| `sync.config.json` | app 프로필 `packages`에서 `@sirloinbh/design-tokens` 제거 |
| `scripts/test/sync.test.mjs` | 매니페스트 `packages` 기대값을 3개로 |

## 이유

- workout-memo 동기화 PR(sirloinbh/workout-memo#143)의 `verify`가 중앙 표준 검사에서 `@sirloinbh/design-tokens — 설치되어 있지 않습니다(기대 버전 1.0.0)`로 실패했다.
- #202(#97)에서 `design-tokens`는 앱 `package.json`에 넣지 않고 #126으로 넘겼다. 그런데 프로필 `packages`에 남아 있어서 매니페스트가 설치를 요구했다. `standards-check`는 매니페스트의 모든 패키지가 `node_modules`에 있어야 통과한다.
- 프로필 `packages`는 "앱이 설치하는 패키지"로 맞춘다. `design-tokens`는 #126에서 `frontend/package.json` 필드와 함께 다시 넣는다. 패키지 배포(`versions.json`)는 그대로다.

## 확인

- `npm run check`: 아래 PR에 결과를 적는다.
