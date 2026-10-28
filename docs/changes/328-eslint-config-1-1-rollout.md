# #328 앱에 공유 ESLint 설정 1.1.0 반영 (관례 규칙만)

## 변경

| 파일 | 내용 |
|---|---|
| `versions.json` | `packages.@sirloinbh/eslint-config` 1.0.0 → 1.1.0 |
| `docs/versions.md` | 다시 생성 |
| `scripts/test/templates.test.mjs` | 기대 버전을 `versions.json`에서 읽음 |

## 정한 것

- 1.1.0은 2026-10-28 사용자가 태그 `eslint-config/v1.1.0`을 push해 배포했다(`publish` 성공, Release 생성).
- 앱 템플릿 `eslint.config.mjs`는 바꾸지 않았다. `tsconfigRootDir`와 플러그인을 넘기지 않으므로 앱에서 새로 켜지는 규칙은 `type`만 쓰기와 default export 금지뿐이다. 앱 8개의 위반은 0개다(#308).

## 동기화 PR에서 사용자가 할 일

동기화 PR은 앱 루트 `package.json`의 `@sirloinbh/eslint-config`만 1.1.0으로 바꾸고 lockfile은 그대로 둔다. 그래서 그 PR의 CI는 `npm ci`에서 실패한다. 앱마다 그 PR 브랜치에서 다음을 실행해 lockfile을 맞춘다.

```
npm install --ignore-scripts
npm run lockfiles:sync
```

`@sirloinbh/*`는 자체 패키지라 14일 규칙 대신 출처 확인으로 검증한다(ADR-0004). 새로 들어오는 외부 패키지는 없다(1.1.0도 의존성 0개).

## 검증

- `npm run check`: 테스트 491개 중 490개 통과, 1개 건너뜀, 실패 0
- `npm run sync:preview`: 앱 manifest의 `@sirloinbh/eslint-config`가 1.1.0
