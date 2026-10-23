# #184 에이전트 자동 병합 기본값과 하위 리포 병합 확인 규칙 맞추기

## 결정 (2026-10-23 사용자)

`.agents.json`의 `autoMerge` 기본값 `true`를 유지하고, 자동 병합을 허용하지 않은 리포만 `false`로 끈다.

## 변경

| 파일 | 내용 |
|---|---|
| `AGENTS.md` | "하위 리포 PR은 사용자 확인"에 예외 추가: 워커가 여는 PR은 그 리포 `.agents.json`의 `autoMerge`를 따른다 |
| `docs/tools.md` | "리포별 자동 병합" 표(workout-memo `true`, 나머지 앱 7개 `false`, 중앙·인프라 리포는 해당 없음), 파일이 없으면 자동 병합된다는 주의, 동기화로 배포하지 않는 이유 |
| `templates/app/AGENTS.md.tmpl` | 앱 리포 병합 규칙에 워커 예외 한 문장 |

정한 것:

- **코드 기본값은 바꾸지 않는다.** `tools/agents/config.mjs`의 `autoMerge: true`와 테스트는 그대로다.
- **`.agents.json`은 동기화로 배포하지 않는다.** 리포마다 다른 값(`checkScript`, `database.tables`)을 담고, 동기화의 `fields` 방식은 없는 파일을 만들지 않는다(`scripts/lib/sync-plan.mjs`의 `fieldsPending`). 리포별 값은 `docs/tools.md` 표가 원본이고, `false`인 리포는 워커 도입 PR에 `.agents.json`을 함께 넣는다.
- **`false` 대상:** 앱 `AGENTS.md`가 "main 병합은 곧 운영 배포"라고 정하고 있고 자동 병합을 허용한 결정이 #128(workout-memo)뿐이라, 나머지 앱 7개를 `false`로 적었다.

## 검증

- `npm run check` 통과(테스트 392개 모두 통과, 건너뜀 0). 코드와 동기화 스냅샷은 바뀌지 않았다(앱 `AGENTS.md`는 내용이 아니라 경로만 스냅샷에 있다).
