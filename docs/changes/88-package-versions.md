# #88 공유 패키지 1.0.0을 versions.json에 기록

## 변경

| 파일 | 내용 |
|---|---|
| `versions.json` | `packages`의 4개(`@sirloinbh/eslint-config`, `prettier-config`, `tsconfig`, `design-tokens`)를 `null`에서 `"1.0.0"`으로 바꿨다 |
| `scripts/test/fake-github.mjs` | 패키지가 배포된 중앙 리포를 흉내 내는 `fakePublishedCentral()` 추가. 태그별 Release와 성공한 publish.yml 실행을 돌려준다 |
| `scripts/test/sync-pr.test.mjs`, `scripts/test/labels.test.mjs` | 동기화 실행 테스트가 중앙 리포로 `fakePublishedCentral()`을 쓰게 했다 |
| `scripts/test/scaffold.test.mjs` | 스캐폴드 결과를 검사하기 전에 `node_modules/@sirloinbh/*/package.json`을 만들어 `npm ci` 설치를 대신했다 |

## 정한 것

- 2026-10-24 사용자가 태그 4개를 push해 publish.yml 4회가 성공했고 Release 4개가 생겼다. 사용자가 각 패키지의 Actions 접근 권한에 앱 리포 8개를 Read로 추가했다.
- 패키지 버전이 `null`일 때는 동기화의 패키지 출처 확인(`verifyPackages`)과 standards-check의 설치 확인이 건너뛰어졌다. 버전을 넣자 이 두 단계가 실제로 실행되어, 실제 `versions.json`을 읽는 테스트 3개가 실패했다. 구현은 의도대로 동작하므로 테스트 픽스처를 "배포·설치된 상태"로 맞췄다.
- 하위 리포에는 첫 동기화(#97)부터 패키지 버전이 적용된다. `maxRollout`이 0이라 지금은 어느 리포에도 PR이 열리지 않는다.

## 검증

- `npm run check` 통과(테스트 400개 중 398 통과·2 건너뜀, registry-check, docs check, tokens check, package-guard, check-workflows)
