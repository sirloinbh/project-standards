# #113 maxRollout을 2로 올리기

사용자가 2026-10-26에 승인했다. 선행 이슈 #98(workout-memo lockfile 승인·동기화 PR 병합)과 #99(나머지 앱 7개 사전 정리)가 닫혔다.

## 변경

| 파일 | 내용 |
|---|---|
| `sync.config.json` | `maxRollout` 1 → 2. 이 PR이 main에 병합되면 `sync.yml`이 앱 7개(study-log, health-log, life-journal, money-ledger, english-study, plan-routine, dev-career-portfolio)에 동기화 PR을 연다 |
| `scripts/test/sync.test.mjs` | study-log가 계획에 들어가는 것으로 기대값을 바꾸고, 인프라 리포(rollout 3)는 빠지는지 함께 검사 |
| `AGENTS.md`, `README.md` | 현재 단계 설명을 `maxRollout` 2 기준으로 고침 |

## 정한 것

- 앱 7개 동기화 PR은 사용자가 병합한다(앱 main 병합이 곧 운영 배포). 에이전트는 PR을 검토해 #113에 결과를 적는다.
- 동기화 PR은 `package-lock.json`을 바꾸지 않는다. 공유 패키지 devDependencies가 추가되므로 lockfile 갱신(#114, 사용자 승인) 전에는 `npm ci`를 쓰는 CI가 실패할 수 있다. workout-memo(#97)와 같은 순서다.

## 검증

- `npm run check`: 통과(테스트 413개 중 412개 통과, 1개 건너뜀, 실패 0)
