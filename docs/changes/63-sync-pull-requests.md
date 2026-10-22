# #63 동기화 PR 자동 생성 (App 토큰, PR 생성·갱신, sync.yml)

## 변경

| 파일 | 내용 |
|---|---|
| `scripts/lib/github-app.mjs` | `node:crypto`로 App JWT(RS256)를 서명한다. 설치 토큰은 대상 리포 **하나**로 범위를 좁혀 발급한다. API 오류 메시지에 토큰이 들어가지 않는다 |
| `scripts/lib/sync-pr.mjs` | 대상 리포 하나의 동기화 PR을 열거나 갱신한다. 자세한 흐름은 아래 |
| `scripts/lib/pin-ranges.mjs` | `^`·`~` 범위를 lockfile에 설치된 버전으로 고정하고, 루트·subtree lockfile의 선언도 맞춘다. 설치되는 버전은 바뀌지 않는다 |
| `scripts/sync.mjs` | `--apply` 모드. `maxRollout`이 0이면 토큰 발급만 확인한다. 대상별로 실패를 모아 보고한다 |
| `.github/workflows/sync.yml` | main push와 수동 실행. App이 만들어지기 전(`vars.SYNC_APP_ID` 없음)에는 건너뛴다. 중앙 검사가 통과해야 동기화하고, 실행은 하나씩 순서대로 한다 |
| `templates/*/.github/workflows/ci.yml.tmpl`, `scripts/lib/vars.mjs` | CI 호출부를 `central.workflowSha`로 고정(아래 수정) |
| `scripts/test/sync-pr.test.mjs`, `fake-github.mjs` | 가짜 GitHub(메모리)로 하는 테스트 11개 |

## syncTarget 흐름

1. 대상 리포의 main 트리를 읽는다.
2. 로컬에서 계산한 git blob id와 비교해 바뀐 파일만 찾는다. 내용을 내려받는 파일은 병합에 필요한 것뿐이다(프로젝트 구간, `package.json`, lockfile, 이전 manifest).
3. 이전 manifest에 있었지만 중앙에서 빠진 파일은, 내용이 그대로일 때만 삭제한다. 수정된 파일은 남기고 PR 본문에 적는다.
4. 바뀐 것이 manifest뿐이면 PR을 만들지 않는다.
5. 커밋 하나를 Git Data API로 만든다. 대상 리포를 clone하지 않으므로 대상 리포의 훅이나 스크립트가 실행되지 않는다.
6. 열린 동기화 PR이 있으면 그 브랜치를 force 갱신하고 제목·본문을 최신 SHA로 바꾼다. 없으면 `chore/standards-sync-<SHA 7자리>`로 새 PR을 연다. main에는 push하지 않는다.
7. PR 본문은 std-git-writing의 PR 템플릿을 따른다. "병합 전에 확인해 주세요"에 운영 배포, lockfile 재생성, `NODE_AUTH_TOKEN`, subtree push, `AGENTS.project.md` 이동이 해당할 때만 들어간다. 인프라 리포는 "apply를 일으키지 않는다" 문구가 들어간다.
8. 공유 패키지 버전이 있으면 출처를 확인한다(ADR-0004): 태그의 Release가 있는지, Release 본문의 실행이 성공한 `publish.yml`인지. 확인 결과는 PR 본문에 적는다.

## 테스트로 발견해 고친 문제

동기화를 두 번 연속 돌려 보니, 바뀐 것이 없어도 매번 새 PR이 열렸다. CI 호출부가 동기화 중인 중앙 커밋 SHA로 고정돼 있어서, 중앙 커밋이 생길 때마다 9개 리포의 `ci.yml`이 바뀌었기 때문이다.

공통 CI를 마지막으로 바꾼 중앙 커밋(`central.workflowSha`, `git log`로 계산)에 고정하도록 바꿨다. 이 계산을 위해 `sync.yml`은 전체 이력(`fetch-depth: 0`)을 받는다. 수정 후 두 경우를 테스트로 확인했다.

- 관련 없는 중앙 커밋은 PR을 만들지 않는다.
- 공통 CI가 바뀌면 `ci.yml`만 바뀐 PR이 열린다.

## 검증

- `npm run check`: 테스트 110개 통과, `check-workflows: ok (7 files)`
- **가짜 GitHub 시나리오:**
  - 첫 동기화 PR 생성
  - 같은 PR 갱신
  - 병합 후 재실행 시 변경 없음
  - 손대지 않은 파일만 삭제
  - 인프라 PR 문구
  - 패키지 출처 확인
  - `maxRollout` 0일 때 토큰만 확인
  - JWT 서명 검증
  - 토큰 범위와 오류 메시지의 토큰 비노출
- **로컬 미리보기:** CI 호출부가 `f7b2518`(#71 커밋)에 고정되는 것을 확인했다.
- 실제 GitHub에서 실행하는 것은 App이 만들어진 뒤(#86) 수동 실행으로 확인한다.
