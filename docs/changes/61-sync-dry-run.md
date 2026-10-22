# #61 동기화 스크립트: 렌더링과 미리보기(dry-run)

## 변경

| 파일 | 내용 |
|---|---|
| `scripts/lib/sync-plan.mjs` | 대상 하나의 동기화 계획을 계산한다: 프로필 템플릿 렌더링, 허용된 차이(`allowedDifferences`) 건너뛰기, 보호 경로(`neverTouch`) 위반 시 실패, `package.json` 필드 병합, `.standards/manifest.json` 생성 |
| `scripts/sync.mjs` | `--dry-run --out <폴더>`로 대상별 결과 파일과 `plan.json`을 쓴다. `--local <리포>=<경로>`를 주면 로컬 클론을 읽어 실제 파일과 병합한 결과를 보여 준다 |
| `scripts/lib/render.mjs` | 처음 동기화하는 구간 관리 파일의 프로젝트 고유 줄 보존(아래) |
| `scripts/test/sync.test.mjs`, `fixtures/sync-snapshot.json` | glob, 필드 병합, 계획, CLI 테스트와 9개 대상의 파일 목록 스냅샷 |
| `package.json` | `npm run sync:preview` (결과는 무시되는 `.local/sync-preview/`) |

## 미리보기에서 발견한 문제와 수정

로컬 workout-memo 클론으로 미리보기를 돌려 보니, `.gitignore`와 `.prettierignore`에 있던 프로젝트 고유 줄(`test-results/`, `playwright-report/`, `docs/openapi.json`)이 첫 동기화에서 사라지는 문제가 있었다. 아직 `# --- project ---` 표시 줄이 없는 파일이었기 때문이다.

그래서 표시 줄이 없는 파일을 처음 동기화할 때는, 중앙 구간에 없는 기존 줄을 프로젝트 구간으로 옮기도록 바꿨다. 수정 후 다시 미리보기를 돌려 세 줄이 표시 줄 아래에 남는 것을 확인했다.

## 스냅샷

`scripts/test/fixtures/sync-snapshot.json`은 9개 대상이 받는 파일과 관리 방식(전체·구간·필드)의 목록이다. 앱 리포는 31개, 인프라 리포는 15개다. 템플릿을 일부러 바꿨다면 `UPDATE_SNAPSHOT=1 npm test`로 갱신하고, 리뷰에서 하위 리포에 무엇이 바뀌는지 확인한다.

## 검증

- `npm run check`: 테스트 73개 통과, `registry-check: ok`, `docs/projects.md: up to date`
- 로컬 미리보기(`--local study-log=../study-log --local workout-memo=../workout-memo`):
  - 각각 파일 32개(manifest 포함)가 만들어졌다.
  - workout-memo `package.json`은 기존 스크립트 19개와 devDependencies 9개를 유지한 채 관리 필드만 바뀌었다.
  - study-log `.editorconfig`는 헤더 한 줄만 추가됐다.
