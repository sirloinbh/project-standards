# #71 CI 워크플로 (중앙 CI, 앱·인프라 공통 CI)

## 변경

| 파일 | 내용 |
|---|---|
| `.github/workflows/ci.yml` | 중앙 리포 검증: `npm run check`(테스트, 레지스트리, 생성 파일, 패키지 규칙, 워크플로 검사)와 `ioc-scan`. 외부 의존성이 없어 `npm ci`가 필요 없다 |
| `.github/workflows/reusable-app-ci.yml` | 앱 공통 CI. 다음 순서로 실행한다: 공급망 점검 → `npm ci --ignore-scripts` → 중앙 표준 검사 → 설치 후 공급망 점검 → DB 마이그레이션 → `npm run check`. e2e(선택)와 Docker 빌드(BuildKit secret으로 패키지 인증)도 있다 |
| `.github/workflows/reusable-infra-ci.yml` | 인프라 공통 CI: 중앙 표준 검사, 공급망 점검, `terraform fmt -check`·`init -backend=false`·`validate`, 셸 스크립트 `bash -n`. apply는 하지 않는다 |
| `templates/app/.github/workflows/ci.yml.tmpl`, `templates/infra/...` | 하위 리포 호출부. 중앙 워크플로를 동기화한 중앙 커밋 SHA로 고정하고, 레지스트리·versions 값을 넘긴다 |
| `scripts/lib/vars.mjs`, `sync-plan.mjs` | 템플릿 변수에 `central.sha` 추가 |
| `versions.json` | Terraform CLI `1.16.5`. 2026-10-02 릴리스로, 14일 기준을 넘긴 가장 새 버전이다. 1.16.6과 1.17.0은 14일이 안 됐다 |
| `scripts/check-workflows.mjs` | `run:` 스크립트 안의 `${{ }}` 금지 규칙 추가(아래 보안 수정) |
| `scripts/test/` | 호출부 렌더링, 스크립트 주입 검사 테스트, 스냅샷 갱신(대상마다 `ci.yml` 1개 추가) |

## 보안 수정: publish.yml 스크립트 주입

- **문제:** 이전 PR(#70)로 병합된 `publish.yml`에 자동 보안 검토가 스크립트 주입 위험을 찾았다. `${{ github.ref_name }}`(태그 이름)을 `run:` 셸에 직접 넣고 있었다. Git 태그 이름에는 `'`, `$`, `;` 같은 문자를 쓸 수 있어서, 태그 이름으로 명령을 실행할 수 있었다.
- **수정:**
  - 태그 값은 `env: TAG`로만 넘긴다.
  - 첫 단계에서 `^[a-z][a-z0-9-]*/v\d+\.\d+\.\d+$` 형식인지 검사한다. 이 검사는 checkout보다 먼저 한다.
  - 패키지 이름·버전·실행 URL도 환경변수로 넘긴다.
  - 공통 CI의 `inputs.npm-version`도 같은 방식으로 바꿨다.
- **재발 방지:** `check-workflows`가 `run:` 스크립트 안의 `${{ }}`를 모두 실패로 처리한다.

## 검증

- `npm run check`: 테스트 99개 통과, `check-workflows: ok (6 files)`. 6개는 중앙 워크플로 4개와 템플릿 2개다.
- 하위 리포의 실제 CI 실행은 첫 동기화(#97)에서 확인한다. 하위 리포가 이 워크플로를 호출하려면 사용자 단계(#86의 Actions 접근 허용)가 먼저 필요하다.
- actionlint는 설치되어 있지 않다.
