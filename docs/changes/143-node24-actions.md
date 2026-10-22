# #143 외부 Action을 Node 24 기반 최신 버전으로 올리기

## 변경

| 파일 | 내용 |
|---|---|
| `versions.json` | Action 4개를 Node 24(`runs.using: node24`) 버전의 커밋 SHA로 갱신. 러너 고정값 `runner: "ubuntu-24.04"` 추가 |
| `versions.schema.json` | `runner`(필수, `ubuntu-<버전>` 형식) 추가 |
| `.github/workflows/*.yml` 6개 | 새 SHA와 버전 주석, `runs-on: ubuntu-24.04`. 앱 CI를 뺀 setup-node 단계에 `package-manager-cache: false` |
| `scripts/check-workflows.mjs` | 모든 `runs-on:`이 `versions.json`의 `runner`와 같은지 검사 |
| `scripts/test/workflows.test.mjs` | 버전 문자열을 `versions.json`에서 읽도록 수정. `runs-on` 검사 테스트 추가 |

| Action | 이전 | 이후 | 배포일 | 커밋 SHA |
|---|---|---|---|---|
| `actions/checkout` | v4.4.0 | v7.0.1 | 2026-07-20 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node` | v4.4.0 | v7.1.0 | 2026-10-08 | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| `actions/upload-artifact` | v4.6.2 | v7.0.2 | 2026-10-07 | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` |
| `hashicorp/setup-terraform` | v3.1.2 | v4.0.1 | 2026-05-12 | `dfe3c3f87815947d99a8997f908cb6525fc44e9e` |

- 버전은 2026-10-08 이전(14일 경과)에 배포된 것 중 최신이다. SHA는 `git/ref/tags/<태그>` API로 확인했다(4개 모두 경량 태그). 각 SHA의 `action.yml`이 `node24`인 것도 확인했다.
- 앱 리포의 `ci.yml`은 중앙 공통 CI를 커밋 SHA로 부르므로, 병합 뒤 동기화 PR이 새 커밋을 가리키면서 함께 바뀐다. 템플릿 파일 자체는 고칠 것이 없다.

## 메이저 변경 확인 (공식 릴리스 노트)

| Action | 메이저 | 영향 |
|---|---|---|
| checkout | v5: Node 24, 러너 v2.327.1 이상 | GitHub 호스팅 러너라 영향 없음 |
| checkout | v6: 인증 정보를 `.git/config` 대신 별도 파일에 저장 | 중앙 스크립트는 `git push`를 쓰지 않고 API로 커밋한다. 영향 없음 |
| checkout | v7: `pull_request_target`·`workflow_run`에서 포크 PR checkout 차단, ESM 전환 | 두 트리거를 쓰지 않는다. 영향 없음 |
| setup-node | v5: `packageManager`가 있으면 자동 캐시. v6: 자동 캐시를 npm으로 한정, `always-auth` 삭제 | 중앙 리포는 `packageManager`가 있지만 lockfile이 없어 자동 캐시가 실패한다. 그래서 `package-manager-cache: false`를 넣었다. 인프라 CI도 `npm ci`를 하지 않으므로 끈다. 앱 CI는 `cache: npm`을 명시하므로 그대로 둔다. `always-auth`는 쓰지 않는다 |
| setup-node | v7: `registry-url`을 줄 때 넣던 가짜 `NODE_AUTH_TOKEN` 제거 | `publish.yml`은 배포 단계에서 `NODE_AUTH_TOKEN`을 직접 넘기고, 앱 CI는 워크플로 전체 `env`에 둔다. 영향 없음 |
| upload-artifact | v5·v6: Node 24. v7: `archive: false` 직접 업로드 추가, ESM | 입력(`name`, `path`, `retention-days`) 변화 없음 |
| setup-terraform | v4: Node 24 | 입력(`terraform_version`) 변화 없음 |

출처: 각 리포의 GitHub Releases(`actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, `hashicorp/setup-terraform`)와 `actions/setup-node` v7.1.0 README의 Breaking changes 절.

## 결정

- 러너는 `ubuntu-latest` 대신 `ubuntu-24.04`로 고정한다. `ubuntu-latest`가 2026-10-19부터 Ubuntu 26으로 바뀌어, 이미지 변경이 Action 갱신과 섞이지 않게 한다. 24.04는 지금까지 CI가 통과하던 이미지다. 다음 이미지로 옮길 때는 `versions.json`의 `runner`만 바꾸면 `check-workflows`가 빠진 곳을 알려 준다.
- setup-node는 v7.1.0을 골랐다. 배포일(2026-10-08 02:52 UTC)이 14일 기준일과 같다. 이슈 작성 시점에는 14일 미경과로 적혀 있었으므로 PR에서 사용자 확인을 받는다. v7.0.0(`820762786026740c76f36085b0efc47a31fe5020`)으로 바꿔도 다른 변경은 필요 없다.

## 검증

- `npm run check` 통과(테스트 167개 중 166개 통과, 실패 0, 1개 건너뜀. `check-workflows: ok (8 files)`).
- `npm run docs` 실행: 생성 문서 변경 없음.
- 실행하지 못함: 실제 GitHub Actions 실행. 중앙 CI는 이 PR에서 돌고, 앱·인프라 공통 CI는 병합 뒤 동기화 PR에서 처음 돈다.
