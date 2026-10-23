# project-standards

`sirloinbh` 개인 앱 포트폴리오(앱 8개 + `shared-aws-infrastructure`)의 공통 표준을 한곳에서 관리하는 중앙 리포지토리.

- 언어·프레임워크, 도구 버전, 코드·Git 컨벤션, 에이전트 지침·스킬, 디렉토리 구조를 통일한다.
- 중앙 main에 병합되면 하위 리포에 동기화 PR이 열린다.
- 하위 리포에서 중앙 관리 파일을 고치면 CI가 실패하고 이 리포로 PR을 열도록 안내한다.
- 포트·도메인처럼 프로젝트마다 달라야 하는 값은 레지스트리로 따로 모아 한눈에 확인한다.

설계는 [docs/design.md](docs/design.md), 결정 근거는 [docs/adr/](docs/adr/), 프로젝트별 값은 [docs/projects.md](docs/projects.md)에 있다. 직접 하실 일은 [docs/user-steps.md](docs/user-steps.md)에 모았다.

규칙 문서: [기술 스택](docs/stack.md) · [의존성 정책](docs/dependency-policy.md) · [Git 컨벤션](docs/git-conventions.md) · [디렉토리·라우팅](docs/directory-rules.md) · [디자인 시스템](docs/design-system.md) · [디자인 토큰](docs/design-tokens.md) · [환경변수](docs/env-conventions.md) · [DB 마이그레이션](docs/conventions/database.md) · [도메인 공통 규칙](docs/conventions/domain.md) · [UX·접근성 점검](docs/conventions/ux-audit.md) · [운영 문서 템플릿](docs/runbooks/README.md) · [웹 앱 설치(PWA)](docs/pwa.md) · [리포 설정](docs/repo-settings.md) · [테스트 설정](docs/test-config.md)

## 현재 상태

중앙 골격은 만들어졌고, 사용자 단계([docs/user-steps.md](docs/user-steps.md))가 끝나면 workout-memo부터 적용한다. `sync.config.json`의 `maxRollout`이 `0`이라 아직 어느 하위 리포에도 동기화 PR이 열리지 않는다. 진행 순서는 GitHub 이슈의 우선순위 라벨과 [std-backlog](templates/common/skills/std-backlog/SKILL.md) 규칙을 따른다.

## 시작하기

1. 바탕화면의 `VSCode-계정B-project-standards.cmd`로 VS Code를 연다. 개인 계정(`sirloinbh`) 설정으로 열린다.
2. 터미널에서 `ghp auth status`로 `sirloinbh` 로그인을 확인한다.
3. 아래 명령은 외부 npm 패키지 없이 Node 내장 모듈만으로 동작한다. `npm install`은 필요 없다.

| 명령 | 하는 일 |
|---|---|
| `npm run check` | 테스트, 레지스트리 충돌 검사, 생성 문서 최신 여부를 한 번에 확인 |
| `npm test` | 테스트만 |
| `npm run registry:check` | 포트·DB 이름·리포 이름 충돌과 포트 공식 검사 |
| `npm run docs` | `docs/projects.md` 다시 생성 |
| `npm run sync:preview` | 9개 리포가 받을 파일을 `.local/sync-preview/`에 미리 만들기 |

로컬 클론과 합친 결과를 보려면 `node scripts/sync.mjs --dry-run --out .local/sync-preview --local study-log=../study-log`처럼 실행한다.

## 새 프로젝트 추가

1. 중앙 리포에 이슈를 연다.
2. `registry/projects.json`에 새 항목을 추가한다.
   - `slot`은 지금까지 쓴 가장 큰 슬롯 + 1이다. 은퇴한 슬롯도 다시 쓰지 않는다.
   - 포트는 "기준값 + 슬롯"이다(web 8100, api 3100, e2e api 3200, vite 5200, e2e web 5300, db 15400).
   - 도메인·AWS 접두어가 아직 없으면 `null`로 둔다.
3. `sync.config.json`의 `targets`에 새 리포를 추가한다.
4. `npm run docs`로 `docs/projects.md`를 다시 만들고 `npm run check`가 통과하는지 확인한 뒤 PR을 연다.
5. **[사용자]** 우산 리포와 subtree 리포 3개(`<이름>-frontend`, `-backend`, `-db`)를 만든다.
6. **[사용자]** GitHub App 설치 범위에 새 리포를 추가한다([docs/github-app.md](docs/github-app.md) 3단계).
7. 스캐폴드로 첫 커밋을 만든다. 표준 트리, 운영 문서, 중앙 관리 파일, manifest가 한 번에 만들어지므로 첫 커밋부터 `standards-check`를 통과한다.
   ```powershell
   node scripts/scaffold.mjs <이름> --out ..\<이름>     # 새 폴더 또는 빈 폴더만 허용
   cd ..\<이름>; git init -b main
   ```
8. **[사용자]** 의존성 설치를 승인한다. 버전은 [의존성 정책](docs/dependency-policy.md) 표와 같은 고정 버전이고, `.npmrc`가 설치 스크립트를 막는다. 승인 뒤 `npm install --ignore-scripts`로 lockfile을 만든다.
9. `npm run format`(문서 표 정렬)과 `npm run check`를 통과시킨 뒤 첫 커밋을 만들고, 우산 리포에 push한다. 이후 규칙 변경은 동기화 PR로 들어온다.

## 규칙 바꾸기

1. 중앙 리포에 이슈를 연다. 왜 바꾸는지와, 어느 리포에 영향이 있는지를 적는다.
2. 원본을 고친다.

   | 바꿀 것 | 고칠 곳 |
   |---|---|
   | 하위 리포에 복사되는 파일 | `templates/common/` 또는 `templates/app/` (`.tmpl`은 렌더링할 때 떼어 냄) |
   | 도구 버전, 외부 Action | `versions.json` |
   | 포트·DB 이름 등 프로젝트 값 | `registry/projects.json` |
   | 동기화 대상·적용 단계 | `sync.config.json` |

3. 하위 리포가 받을 파일 목록이 바뀌면 `UPDATE_SNAPSHOT=1 npm test`로 스냅샷을 갱신하고, PR에서 그 변화를 함께 리뷰한다.
4. 큰 결정이면 `docs/adr/`에 ADR을 추가한다.
5. 병합되면 하위 리포마다 동기화 PR이 열린다. 앱 리포의 PR은 사용자가 병합한다(병합이 곧 운영 배포).

## 하위 리포에서 standards-check가 실패했을 때

하위 리포 CI의 `standards-check`(`.standards/check.mjs`)는 실패한 파일과 그 파일의 중앙 원본 경로를 출력한다.

| 상황 | 할 일 |
|---|---|
| 하위 리포에서 중앙 관리 파일을 실수로 고쳤다 | 하위 리포의 변경을 되돌린다 |
| 그 변경이 모든 리포에 필요하다 | 이 리포에 이슈와 PR을 열어 출력에 나온 "중앙 원본"을 고친다. 병합되면 동기화 PR로 모든 리포에 반영된다 |
| 그 프로젝트만 달라야 한다 | `registry/projects.json`의 해당 프로젝트 `allowedDifferences`에 `path`, `reason`, `until`(기한, 없으면 `null`)을 추가하는 PR을 연다 |
| 포트·DB 이름이 다르다고 나온다 | 레지스트리 값이 맞으면 하위 리포 파일을 고친다. 레지스트리를 바꿔야 하면 위 "규칙 바꾸기"를 따른다 |
| 하위 리포에 열린 동기화 PR(`chore/standards-sync-*`)이 있다 | 그 PR을 먼저 병합하면 맞춰지는 경우가 많다 |

하위 리포에서 중앙으로 자동으로 PR을 보내거나 파일을 자동으로 되돌리는 기능은 없다([ADR-0003](docs/adr/0003-detect-and-guide-only.md)).
