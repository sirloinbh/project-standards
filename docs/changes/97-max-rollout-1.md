# #97 maxRollout을 1로 올리기

사용자가 2026-10-25에 승인했다. 선행 이슈(#21, #55, #71, #86, #88, #94, #95)가 모두 닫혔고, 공유 패키지 devDependencies 필드는 PR #202로 먼저 넣었다.

## 변경

| 파일 | 내용 |
|---|---|
| `sync.config.json` | `maxRollout` 0 → 1. 이 PR이 main에 병합되면 `sync.yml`이 workout-memo(rollout 1)에 동기화 PR을 연다 |
| `scripts/test/sync-pr.test.mjs` | "토큰만 확인" 경우를 `maxRollout` 0인 복사본으로 검사(설정 파일 값에 기대지 않음) |
| `scripts/test/sync.test.mjs` | study-log가 계획에서 빠지는 이유 문구를 rollout 2로 고침 |
| `AGENTS.md`, `README.md` | 현재 단계 설명을 `maxRollout` 1 기준으로 고침 |

## 정한 것

- workout-memo 동기화 PR은 사용자가 병합한다(앱 main 병합이 곧 운영 배포). 에이전트는 PR을 검토해 #97에 결과를 적는다.
- 동기화 PR은 `package-lock.json`을 바꾸지 않는다. devDependencies가 추가되므로 lockfile 갱신(#98, 사용자 승인) 전에는 `npm ci`를 쓰는 CI가 실패할 수 있다.

## 검증

- `npm run check`: 테스트 403개 중 401개 통과, 2개 건너뜀.
