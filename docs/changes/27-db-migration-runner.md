# #27 DB 마이그레이션 규칙과 공통 실행기

## 변경

| 파일 | 내용 |
|---|---|
| `docs/conventions/database.md` | 파일 번호 규칙, 작성 규칙(다시 실행해도 안전, 한 파일 한 트랜잭션), `schema_migrations` 적용 기록 테이블, 실행 방법, 공통 CI 단계, 되돌리기 정책, workout-memo 방식과의 차이표, 기존 앱 도입 절차 |
| `scaffold/app/backend/src/migrations.ts`, `migrate.ts` | workout-memo 실행기를 기준으로 한 공통 실행기. 규칙(`migrations.ts`)과 명령(`migrate.ts`)을 나눴다 |
| `scaffold/app/backend/test/migrations.test.ts` | DB 없이 확인하는 규칙 테스트 5개(체크섬 정규화, 이름·번호 검사, 대기 목록, 변경·삭제·순서 오류) |
| `scaffold/app/database/README.md` | 실행기 위치, 실패 조건, 되돌리기 정책 |
| `.github/workflows/reusable-app-ci.yml` | verify·e2e job의 마이그레이션 단계를 같은 스크립트로 통일: psql로 한 번 적용 → `db:migrate`가 있으면 실행기, 없으면 psql로 한 번 더 적용하고 경고 |
| `scripts/test/workflows.test.mjs`, `scaffold.test.mjs` | 두 job의 스크립트가 같고 psql 단계가 실행기보다 먼저인지, 실행기와 문서의 기록 테이블·잠금 키·이름 규칙이 같은지 확인 |
| `docs/directory-rules.md`, `README.md` | 실행기 파일 이름과 규칙 문서 링크(`docs/conventions/`의 세 문서) |

## 결정

- **기록 테이블은 workout-memo와 같게 했다.** #85 스캐폴드의 시작용 실행기는 열 이름이 `filename`이었고 잠금 키가 `hashtext('schema_migrations')`였다. 이것을 workout-memo의 `name`과 고정 키 `581_003`으로 바꿨다. 아직 스캐폴드로 만든 앱이 없어 바꿔도 영향이 없고, workout-memo DB는 표준 실행기로 바꿔도 다시 적용할 파일이 없다.
- **CI는 실행기가 있는지를 `db:migrate` 스크립트 이름으로 판단한다.** 실행기가 없는 7개 앱의 CI가 깨지지 않도록 psql 적용을 남기고 경고만 표시한다. 앱마다 CI 입력값을 두지 않았다. 8개 앱이 모두 실행기를 들이면 이 분기를 지운다.
- **CI는 psql로 먼저 한 번 적용한다.** 빈 볼륨의 Docker 초기화 순서(기록 없이 적용 → 실행기가 다시 적용하며 기록)를 그대로 재현해서, 다시 실행해도 안전하다는 규칙을 CI가 확인하게 했다. 실행기가 없는 앱은 psql 두 번이 되며 study-log CI와 같은 확인이다.
- **이전에는 e2e job이 `npm run db:migrate`를 조건 없이 실행했다.** 실행기가 없는 앱에서 e2e를 켜면 실패했으므로 verify job과 같은 스크립트로 바꿨다.
- **되돌리기(down) 파일은 쓰지 않는다.** 배포 롤백이 스키마를 되돌리지 않는 기존 런북(`docs/runbooks/deploy.md`)과 맞췄다. 데이터 복구는 배포 직전 덤프로 한다.

## 사용자 결정 (2026-10-22)

- CI는 psql로 한 번 적용한 뒤 실행기를 쓰고, 실행기가 없으면 psql로 한 번 더 적용하며 경고를 남긴다. 실행기가 있는 workout-memo도 이 순서를 따른다.
- 실행기가 있는지는 루트 `package.json`의 `db:migrate` 스크립트 이름으로 판단한다. 앱별 CI 입력값은 두지 않는다.
- 문서는 `docs/conventions/database.md`에 둔다. 같은 폴더의 `domain.md`, `ux-audit.md`(#169)와 함께 README 규칙 문서 목록에 링크했다.

## 후속 작업

- 나머지 7개 앱에 실행기를 들이는 작업은 각 앱 리포의 이슈·PR로 따로 한다(문서 8절 절차).

## 근거

- workout-memo `backend/src/migrations.ts`, `migrate.ts`, `database/README.md`, `.github/workflows/ci.yml`
- study-log·money-ledger `.github/workflows/ci.yml`의 psql 반복문(study-log는 두 번 반복)
- 7개 앱의 `database/migrations/*.sql`(로컬 사본)은 모두 `IF NOT EXISTS`로 쓰여 있어 실행기 첫 실행 때 다시 적용해도 안전하다. 7개 앱 모두 `pg`와 `tsx`를 이미 의존성으로 쓴다.

## 검증

- `npm run check` 통과: main(#171~#173 포함)에 rebase한 뒤 테스트 182개 중 181개 통과·1개 건너뜀(Codex CLI 미설치, 기존), `registry-check: ok`, 생성 문서·토큰 최신, `package-guard: ok`, `check-workflows: ok (8 files)`.
- 스캐폴드 실행기를 임시 폴더에 복사하고 workout-memo의 설치된 `node_modules`를 연결해 실행했다(설치 없음).
  - `tsc --noEmit`(공유 `node-api.json` 설정) 통과
  - `tsx --test backend/test/migrations.test.ts` 5개 통과
  - `prettier --check`(공유 설정) 통과
- 실행하지 못함: 실제 PostgreSQL에서 `db:migrate`와 CI 단계. 앱 리포의 첫 동기화 CI에서 확인한다.
