# #52 앱·공통 설정 파일 템플릿

## 변경

| 파일 | 내용 |
|---|---|
| `templates/common/.editorconfig.tmpl`, `.gitattributes.tmpl`, `.gitignore.tmpl` | 8개 앱에서 같은 파일. study-log 현재 파일 그대로. `.gitignore`는 끝에 `# --- project ---` 줄을 붙여 구간 관리로 바꿨다 |
| `templates/app/.prettierignore.tmpl` | study-log 그대로 + 프로젝트 구간 표시 줄 |
| `templates/app/.nvmrc.tmpl`, `.node-version.tmpl` | `{{versions.node}}` |
| `templates/app/.npmrc.tmpl`, `frontend/.npmrc.tmpl`, `backend/.npmrc.tmpl` | `engine-strict`, `save-exact`에 `ignore-scripts=true` 추가. frontend·backend는 Docker 빌드가 각 폴더에서 `npm ci`를 하므로 같은 설정을 둔다 |
| `templates/app/.github/dependabot.yml` | npm 3곳과 GitHub Actions의 버전 업 PR을 끄고(`open-pull-requests-limit: 0`), 보안 업데이트만 쓴다 |
| `templates/index.json` | 구간 관리 파일 목록과 `package.json` 3곳의 관리 필드(`packageManager`, `engines.node`, `engines.npm`) |
| `scripts/lib/templates.mjs` | 프로필 폴더의 템플릿 수집(`.tmpl` 제거, 폴더 간 경로 충돌 검사)과 대상별 렌더링 |
| `scripts/test/templates.test.mjs`, `scripts/test/fixtures/study-log/` | study-log 현재 파일과 비교하는 테스트 9개 |

## 정한 규칙

- **`.tmpl` 접미사:** Git·npm·편집기가 자동으로 읽는 설정 파일은 템플릿 이름 끝에 `.tmpl`을 붙여 저장하고, 렌더링할 때 뗀다. 예를 들어 `templates/common/.gitignore`라는 파일이 있으면 중앙 리포의 Git이 그 폴더에 실제로 무시 규칙을 적용하기 때문이다. 같은 이유로 테스트 기준 파일도 `.txt`로 저장했다.
- **범위 조정 (#65로 이동):**
  - ESLint·Prettier·tsconfig 진입 파일은 #65에서 만들 패키지를 불러오는 파일이라, 패키지 형식이 정해진 뒤에 만든다.
  - `.npmrc`의 패키지 레지스트리 줄(`${NODE_AUTH_TOKEN}`)은 그 환경변수가 없으면 모든 npm 명령을 실패시킨다. 그래서 패키지를 실제로 쓰기 시작하는 동기화(#97) 때 적용한다.
- **study-log와 일부러 다르게 둔 부분:** `.npmrc`의 `ignore-scripts=true`와 구간 표시 줄 두 가지다. 테스트가 이 두 가지 외에는 study-log 현재 파일과 같음을 확인한다.
- **Dependabot 보안 업데이트:** 리포 설정에서 따로 켜야 한다. 리포 설정 기준은 #22에서 다룬다.

## 검증

- `npm run check`: 테스트 49개 통과, `registry-check: ok`, `docs/projects.md: up to date`
- 처음 실행에서 테스트 1개가 실패했다. `frontend/.npmrc`의 헤더가 자기 폴더(`templates/app/frontend/`)를 가리키는 것이 맞는데, 테스트가 루트 `.npmrc`와 헤더까지 같다고 잘못 기대했기 때문이다. 헤더를 뺀 내용끼리 비교하도록 테스트를 고쳤다.
