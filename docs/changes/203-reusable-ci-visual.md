# #203 공통 앱 CI에 화면 비교와 배포 스크립트 검사 추가

## 변경

| 파일 | 내용 |
|---|---|
| `.github/workflows/reusable-app-ci.yml` | 입력 `e2e-visual`, `playwright-image`를 추가했다. `e2e-visual`이면 e2e를 고정 Playwright 컨테이너에서 `E2E_VISUAL=1`로 실행하는 `e2e-visual` job이 대신 돈다. 실패하면 `playwright-report`(+`test-results`)와 기준 이미지 후보 `visual-baselines` artifact를 올린다. verify job에 `deploy/*.sh` 문법 검사(`bash -n`)를 추가했다 |
| `templates/app/.github/workflows/ci.yml.tmpl` | 새 입력을 레지스트리·`versions.json`에서 넘긴다 |
| `versions.json`, `versions.schema.json` | `images.playwright`(digest 고정, 새 형식 `pinnedImage`)를 추가했다 |
| `registry/projects.json`, `registry/projects.schema.json` | `features.e2eVisual`을 추가했다. workout-memo만 `true`다 |
| `docs/test-config.md`, `docs/design.md` | 화면 비교 플래그와 CI job 설명 |
| `scripts/test/scaffold.test.mjs` | 새 필수 플래그를 fixture에 넣었다 |

## 정한 것

- workout-memo의 기존 CI(#113)와 같은 이미지(`v1.63.0-noble`, 같은 digest)를 쓴다. 기준 이미지를 그대로 쓸 수 있다.
- 기준 이미지 후보 생성은 특정 spec 대신 전체 e2e에 `--update-snapshots=changed`를 실행한다. 바뀐 화면만 다시 만들기 때문에 결과는 같고, 앱마다 파일 이름을 몰라도 된다.
- Playwright 이미지에는 `psql`이 없다. `e2e-visual` job은 `npm run db:migrate`만 실행하고, 다시 실행해도 안전한지는 verify job이 계속 확인한다.
- 배포 스크립트가 없는 앱(infra 등)은 `nullglob`으로 검사를 건너뛴다.

## 검증

- `npm run check` 통과(테스트 403개 중 401 통과·2 건너뜀, registry-check, docs check, tokens check, package-guard, check-workflows)
- 실제 컨테이너 실행은 workout-memo 첫 동기화 PR(#97)의 CI에서 확인한다
