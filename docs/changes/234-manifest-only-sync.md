# #234 관리 파일 목록만 바뀌어도 manifest 갱신 PR 열기

## 문제

`scripts/lib/sync-pr.mjs`는 manifest만 바뀐 경우를 PR이 필요 없는 변경으로 보고 `unchanged`로 끝냈다. 중앙 커밋 번호만 바뀔 때 PR이 열리지 않게 하려는 의도였지만, 관리 파일 목록·패키지·레지스트리 값이 바뀐 경우까지 건너뛰었다.

workout-memo의 `features.ui`를 켰을 때(#233) 앱 PR(workout-memo#160)에 공통 파일이 이미 들어 있어서 동기화가 `unchanged`로 끝났고, workout-memo manifest에 공통 UI 파일 36개가 등록되지 않았다. 표준 검사가 그 파일들의 직접 수정을 잡지 못하는 상태였다.

## 변경

| 파일 | 내용 |
|---|---|
| `scripts/lib/sync-pr.mjs` | 이전 manifest와 새 manifest를 `centralSha`만 빼고 비교해, 다르면 파일이 모두 같아도 PR을 연다 |
| `scripts/test/sync-pr.test.mjs` | 공통 파일은 있고 manifest만 옛것인 리포에 PR이 열리고(바뀐 파일 0개, manifest만 커밋), 그 뒤 중앙 커밋만 바뀌면 `unchanged`인지 검사 |

## 검증

- 새 테스트는 고치기 전 `unchanged`로 실패하고 고친 뒤 통과
- `npm run check`: 통과(테스트 415개 중 414개 통과, 1개 건너뜀, 실패 0)
- 병합 전 영향 확인: 9개 리포 main의 manifest와 `sync.mjs --dry-run`의 manifest를 `centralSha` 빼고 비교. workout-memo만 다르고(공통 UI 파일 36개 추가) 나머지 8개는 같다. 병합 뒤 workout-memo에만 동기화 PR이 열린다.
