# #277 앱 리포 라벨을 중앙 표준 라벨로 통일

## 결정 (사용자, 2026-10-27)

- 대응표대로 표준 라벨을 더하고, **대응표에 있는 기존 라벨은 지운다.**
- 우선순위 라벨이 없는 이슈는 std-backlog 규칙대로 P3를 준다. workout-memo는 예외로, 열린 이슈 27개를 #122의 확정 작업 순서로 나눠 매긴다.
  - P1: #98 #99 #100 #104 #123 (UI 기반, 먼저 처리할 버그)
  - P2: #101 #102 #103 #105 #124 #125 (화면 교체, 모바일 입력)
  - P3: #108 #114–#117 #122 (앱 패키징 결정, 유산소, 추적 카드)
  - P4: #106 #107 #109–#111 #118–#121 #139 (나중에 하기로 한 도메인에 매인 앱화, 기록 가져오기, 문서)

## 변경

| 파일 | 내용 |
|---|---|
| `tools/labels.mjs` | `plan`(읽기 전용 대응표), `apply`(확인 뒤 표준 라벨 추가), `--overrides`, `--keep-unlabeled`, `--remove-old`(닫힌 이슈에 먼저 더한 뒤 지움, 실패한 리포는 지우지 않음) |
| `scripts/test/labels.test.mjs` | 가짜 gh로 5개 |
| `docs/tools.md` | 사용법 |

## 실행 결과

| 리포 | 열린 이슈 | 표준 우선순위가 정확히 하나 |
|---|---|---|
| file-control | 38 | 38 |
| plan-routine | 11 | 11 |
| study-log | 23 | 23 |
| workout-memo | 29 | 29 |
| shared-aws-infrastructure | 2 | 2 (원래 표준) |

- 닫힌 이슈 64개에도 기존 라벨에 대응하는 표준 라벨을 더했다.
- 지운 기존 라벨:
  - file-control: `P0 긴급`, `P1 높음`, `P2 보통`, `P3 낮음`, `enhancement`
  - plan-routine: `P0 선행 필수`, `P1 높음`, `P2 보통`, `P3 매우 후순위`, `documentation`, `enhancement`
  - study-log: `우선순위: P0`~`P3`, `documentation`, `enhancement`
  - workout-memo: `priority:P0`~`P3`
- 첫 실행에서 workout-memo#110 하나가 GitHub 502로 실패해, workout-memo의 기존 라벨은 지우지 않고 멈췄다. 다시 실행해서 끝냈다.
- `특성: 안전`, `기능: 루틴`, `작업: UI`, `epic`, `추적`처럼 대응표에 없는 라벨은 그대로 남겼다.
- 앱 리포의 std-backlog 스킬은 중앙 원본과 같아서 고칠 것이 없다. `plan-routine/docs/next-steps/README.md`에 예전 라벨 이름이 남아 있다.

## 검증

- `node --test scripts/test/labels.test.mjs`: 5개 통과
