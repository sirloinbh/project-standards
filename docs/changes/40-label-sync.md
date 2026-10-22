# #40 이슈 라벨을 하위 리포에 동기화

## 변경

| 파일 | 내용 |
|---|---|
| `templates/common/labels.json` | std-backlog 라벨 20개(`priority/*` 5, `type/*` 5, `area/*` 8, `needs-user`, `origin/added`)의 이름·색·설명. 2026-10-22 중앙 리포 라벨을 `label list --json`으로 내보내 만들었다 |
| `templates/index.json`, `scripts/lib/templates.mjs` | `data` 목록. 여기 적힌 파일(`common/labels.json`)은 대상 리포에 파일로 복사하지 않는다 |
| `scripts/lib/labels.mjs` | 라벨 목록 검사, 대상 리포 라벨과 비교(생성·갱신·그대로·관리 밖), 생성·갱신 API 호출 |
| `scripts/sync.mjs` | `--apply`가 동기화 PR 다음에 라벨을 맞춘다. `--dry-run --labels-from <리포>=<파일>`로 라벨 변경을 미리 본다 |
| `scripts/test/labels.test.mjs`, `fake-github.mjs` | 가짜 GitHub에 라벨 API를 추가하고 테스트 8개 |
| `docs/adr/0002-github-app-for-sync.md`, `docs/github-app.md`, `docs/user-steps.md` | App 권한에 Issues 쓰기 추가. 사용자 단계 6 |

## 결정

- **포함한 라벨:** std-backlog 스킬이 정한 라벨만 넣었다. GitHub 기본 라벨(`bug`, `enhancement` 등 9개 리포에 이미 있는 것)은 넣지 않았다. `area/*`는 중앙 리포 기준 이름이지만 스킬이 모든 리포에 같은 목록을 쓰라고 하므로 그대로 넣었다.
- **지우지 않는다:** `labels.json`에 없는 라벨은 "관리 밖"으로 보고만 하고 지우지 않는다. 지우면 그 라벨이 달린 이슈에서 라벨이 사라지기 때문이다.
- **이름 대소문자:** GitHub 라벨 이름은 대소문자를 구분하지 않는다. `Priority/P1`이 있으면 새로 만들지 않고 이름을 `priority/P1`로 고친다. 색은 대소문자 차이를 변경으로 보지 않는다.
- **실패 처리:** 라벨 실패(예: Issues 권한 없음 403)는 동기화 PR 결과와 따로 `labelsError`로 남긴다. PR은 그대로 열리고, 워크플로는 실패로 끝나 알 수 있게 한다.
- **실행 범위:** 파일 동기화와 같은 `maxRollout` 대상에만 적용한다. `maxRollout`이 0인 지금은 어느 리포의 라벨도 바뀌지 않는다.
- **미리보기:** 기존 dry-run은 네트워크를 쓰지 않으므로, 대상 리포 라벨은 사용자가 내보낸 파일로 받는다(`docs/github-app.md` 5단계).

## 검증

- `node --test scripts/test/labels.test.mjs`: 8개 통과
  - 스킬에 적힌 라벨이 모두 있고 그 밖의 라벨이 없음
  - 9개 대상 계획에 `labels.json`이 파일로 들어가지 않음
  - 잘못된 색·긴 설명·중복 이름 거부
  - 생성·갱신·그대로·관리 밖 구분(이름 대소문자, 색 대소문자, 설명 없음)
  - dry run은 쓰기 호출 없음, 실제 실행 후 다시 실행하면 쓰기 없음, DELETE 호출 없음, 관리 밖 라벨 유지
  - 라벨 150개 이상일 때 두 번째 페이지까지 읽음
  - `apply`가 대상 리포 라벨을 만들고, 403이면 PR 결과는 유지한 채 `labelsError` 기록
  - dry-run CLI `--labels-from`(BOM 있는 파일)이 `plan.json`과 콘솔에 계획을 씀
- `npm run check`: 통과(테스트 174개 중 173개 통과·1개 건너뜀·실패 0, `check-workflows: ok (8 files)`)
- 실제 리포에는 실행하지 않았다. App에 Issues 권한이 추가되고 `maxRollout`이 올라간 뒤 `sync` 실행 로그로 확인한다.
