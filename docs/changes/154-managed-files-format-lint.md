# #154 동기화 관리 파일이 앱의 포맷·린트 검사에 걸리는 문제

## 발견

#85 스캐폴드 결과물을 workout-memo에 설치된 Prettier 3.9.10·ESLint 10.12.0으로 검사했다(설치 없이 `node_modules`를 연결).

- `prettier --check .`: 관리 파일 24개가 걸렸다. 중앙 스크립트(`.standards/*`)는 중앙의 줄 길이로 쓰였고, 문서 표는 정렬되지 않았다.
- `npm run format`은 관리 파일을 고쳐 써서 해시 검사가 실패하게 만든다.
- `eslint .`: `.standards/lib/hash.mjs`, `render.mjs`의 정규식에 BOM 문자가 그대로 있어 `no-irregular-whitespace`에 걸렸다.

첫 동기화(#97) 직후 8개 앱의 `npm run check`가 모두 실패했을 문제다.

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/.prettierignore` | 중앙 구간에 전체 관리 파일 중 Prettier가 다루는 것을 모두 추가 |
| `templates/app/eslint.config.mjs` | `.standards/**` 제외. 중앙 스크립트는 중앙 리포가 검사한다 |
| `scripts/lib/hash.mjs`, `render.mjs` | BOM 문자를 `\uFEFF` 이스케이프로 |
| `scripts/test/templates.test.mjs` | Prettier가 다루는 확장자의 전체 관리 파일이 모두 `.prettierignore`에 걸리는지, ESLint 제외가 있는지 검사 |

## 검증

- `npm run check` 통과(테스트 143개).
- 스캐폴드 결과물에서 관리 파일이 `prettier --check`, `eslint .`에 더 이상 나오지 않는다.
