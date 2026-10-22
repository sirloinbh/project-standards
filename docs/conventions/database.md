# DB 마이그레이션 규칙

모든 앱은 PostgreSQL 스키마를 `database/migrations/NNN_<설명>.sql` 파일로만 바꾸고, 같은 실행기(`npm run db:migrate`)로 적용한다. 실행기는 workout-memo `backend/src/migrations.ts`를 기준으로 만들었고, 새 프로젝트는 스캐폴드(`scaffold/app/backend/src/migrations.ts`, `migrate.ts`)로 받는다(#27).

## 1. 파일 번호 규칙

- 위치: 우산 리포의 `database/migrations/`. 하위 리포 `<project>-db`로 나뉜다([디렉토리 규칙](../directory-rules.md)).
- 이름: `^(\d{3})_[a-z0-9_]+\.sql$`. 세 자리 번호, 밑줄, 영문 소문자·숫자·밑줄 설명. 예: `001_initial.sql`, `014_biceps_triceps.sql`.
- 번호는 001부터 빈칸 없이 하나씩 늘린다. 같은 번호를 두 파일에 쓰지 않는다.
- 이미 적용된 파일보다 앞선 번호의 새 파일은 만들지 않는다. 두 브랜치가 같은 번호를 쓰면, 나중에 병합하는 쪽이 다음 번호로 바꾼다.
- `.sql`이 아닌 파일(예: `README.md`)은 실행기가 무시한다. `.sql`인데 이름 형식이 틀리면 실패한다.

## 2. 파일 작성 규칙

- **다시 실행해도 안전하게 쓴다.** `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `INSERT … ON CONFLICT`를 쓴다. 빈 볼륨에서는 Docker 초기화(`/docker-entrypoint-initdb.d`)가 기록 없이 모든 파일을 먼저 실행하고, 뒤이어 실행기가 같은 파일을 다시 적용하며 기록하기 때문이다.
- **한 파일은 한 트랜잭션이다.** 실행기가 파일마다 `BEGIN`·`COMMIT`으로 감싼다. 트랜잭션 안에서 쓸 수 없는 문장(`CREATE INDEX CONCURRENTLY`, `VACUUM` 등)은 쓰지 않는다. 파일 안에 `BEGIN`·`COMMIT`을 직접 쓰지 않는다.
- **psql 전용 명령을 쓰지 않는다.** 실행기는 `pg` 드라이버로 SQL을 보낸다. `\i`, `\set`, `:'변수'` 같은 psql 메타 명령은 동작하지 않는다.
- **UTF-8로 저장한다.** 줄바꿈(CRLF·LF)과 UTF-8 BOM은 체크섬에 영향을 주지 않는다.
- **적용한 파일은 고치지 않는다.** 바꿀 내용은 새 번호의 파일로 추가한다. 주석 한 글자만 바꿔도 체크섬이 달라져 실행기가 멈춘다.
- **기존 데이터의 의미를 보존한다.** 열을 추가할 때는 기존 행의 값을 정하는 `DEFAULT`나 `UPDATE`를 같은 파일에 쓴다.

## 3. 적용 기록 테이블

실행기가 처음 실행될 때 만든다. 앱 코드는 이 테이블을 읽거나 쓰지 않는다.

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,                 -- 파일 이름 (예: 001_initial.sql)
  checksum text NOT NULL,                -- 줄바꿈·BOM을 정규화한 내용의 SHA-256 (16진수)
  applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
)
```

- 파일 하나를 적용하는 것과 그 기록 행을 넣는 것은 한 트랜잭션으로 커밋된다. 실패하면 그 파일만 되돌리고 멈춘다. 앞서 적용한 파일은 기록된 채로 남는다.
- 실행기는 advisory lock(고정 키 `581_003`, workout-memo와 같음)을 잡는다. CI와 로컬 명령이 동시에 실행돼도 한 번에 하나씩 적용한다.
- 다음 경우에는 아무것도 적용하지 않고 실패한다.
  - 기록된 파일이 없어졌다.
  - 기록된 파일의 체크섬이 다르다(내용이 바뀌었다).
  - 기록된 마지막 파일보다 앞선 번호의 새 파일이 있다.
  - 이름 형식이 틀렸거나 번호가 중복된다.
- 기록 테이블이 없는 DB(이전에 psql로 적용한 DB)에서 처음 실행하면 001부터 모두 다시 적용하고 기록한다. 그래서 2절의 "다시 실행해도 안전" 규칙이 필요하다.

## 4. 실행 방법

| 상황 | 명령 | 비고 |
|---|---|---|
| 로컬 | `npm run db:migrate` | 우산 리포 루트에서. `.env`의 `DATABASE_URL`을 쓴다 |
| 로컬 확인 | `npm run db:migrate -- --status` | 적용됨·대기 목록과 오류만 출력. DB를 바꾸지 않는다 |
| 빈 볼륨 첫 실행 | Docker 초기화 → `npm run db:migrate` | compose가 `database/migrations`를 `/docker-entrypoint-initdb.d`로 마운트한다 |
| 공통 CI | 아래 5절 | `reusable-app-ci.yml`의 verify·e2e job |
| 운영 배포 | 배포 스크립트가 덤프 뒤 적용 | [배포 런북](../runbooks/deploy.md) 3절 4단계 |

- PowerShell 파이프(`Get-Content … | psql`)로 SQL을 넘기지 않는다. Windows PowerShell 5.1이 한글을 깨뜨린다. 실행기는 Node가 파일을 UTF-8로 직접 읽는다.

## 5. 공통 CI의 마이그레이션 단계

`.github/workflows/reusable-app-ci.yml`의 verify job과 e2e job은 같은 스크립트로 테스트 DB를 준비한다.

1. `psql -v ON_ERROR_STOP=1`로 `database/migrations/*.sql`을 파일 이름 순서대로 한 번 적용한다. 빈 볼륨의 Docker 초기화와 같은 동작이다.
2. 루트 `package.json`에 `db:migrate` 스크립트가 있으면 실행기를 실행한다. 1번에서 이미 적용된 파일을 다시 적용하며 기록하므로, 다시 실행해도 안전한지 함께 확인된다.
3. `db:migrate`가 없으면 psql로 한 번 더 적용하고 경고(`::warning`)를 남긴다. 아직 실행기를 들이지 않은 앱의 CI가 깨지지 않게 하기 위해서다(이전 동작과 호환).

실행기가 있는지는 스크립트 이름으로 판단한다. 앱마다 CI 입력값을 따로 두지 않는다. 8개 앱이 모두 실행기를 들이면 3번 분기를 지운다.

## 6. 되돌리기 정책

- **되돌리기(down) 파일을 쓰지 않는다.** 앞으로만 간다. 잘못 적용한 변경은 그것을 바로잡는 새 번호의 파일로 고친다.
- **데이터를 되돌려야 하면 백업으로 복원한다.** 운영 배포는 마이그레이션 전에 DB 덤프를 만든다. 복원은 [백업·복구 런북](../runbooks/backup-restore.md)을 따른다.
- **앱 롤백은 스키마를 되돌리지 않는다.** 배포 롤백은 이전 이미지로 다시 시작할 뿐이다. 그래서 새 파일은 이전 버전 앱도 계속 동작하도록 쓴다(열 추가는 `DEFAULT` 포함, 열·테이블 삭제는 그 열을 쓰지 않는 앱이 배포된 뒤 별도 파일로).
- **실패한 적용:** 오류 메시지의 파일 이름과 원인을 확인한다. 실패한 파일은 기록되지 않았으므로 원인을 고친 뒤 다시 실행하면 그 파일부터 이어서 적용한다. 데이터 문제라면 먼저 백업을 만든다.
- **체크섬 불일치:** 파일을 git의 원래 내용으로 되돌리면 해결된다. 바꾸려던 내용은 새 파일로 옮긴다. 기록 테이블의 체크섬을 손으로 고치지 않는다.

## 7. workout-memo 방식과의 차이

규칙과 기록 테이블은 workout-memo와 같다. 그래서 workout-memo DB는 표준 실행기로 바꿔도 다시 적용할 파일이 없다.

| 항목 | workout-memo (`backend/src/migrations.ts`, `migrate.ts`) | 표준 (스캐폴드) |
|---|---|---|
| 파일 이름·번호 검사 | `^(\d{3})_[a-z0-9_]+\.sql$`, 번호 중복 실패 | 같음 |
| 기록 테이블 | `schema_migrations(name, checksum, applied_at)` | 같음 |
| 체크섬 | 줄바꿈·BOM 정규화 후 SHA-256 | 같음 |
| 순서 검사 | 기록된 마지막 파일보다 앞선 새 파일은 실패 | 같음 |
| 잠금 | advisory lock 고정 키 `581_003` | 같음 |
| 트랜잭션 | 파일마다 `BEGIN`·`COMMIT`, 실패 시 그 파일만 `ROLLBACK` | 같음 |
| DB 연결 | `pg`의 `Pool`을 만들고 연결 하나를 빌린다 | `pg`의 `Client` 하나. 연결 하나만 쓰므로 풀이 필요 없다 |
| 연결 타입 | `PoolClient` | `ClientBase`(`Client`와 `PoolClient`의 공통 타입). workout-memo 코드에도 그대로 넘길 수 있다 |
| 단위 테스트 | `backend/test/migrations.test.ts`. 리포 파일이 9개 이상이고 001의 한글 시드가 읽히는지 확인 | 같은 규칙 테스트. 리포 파일은 001로 시작하는지만 확인한다(새 프로젝트는 파일이 하나다) |
| CI | `npm run db:migrate` 한 번. e2e는 Playwright 컨테이너 안에서 같은 명령 | psql로 한 번 적용한 뒤 `db:migrate`(5절). 다시 실행해도 안전한지 함께 확인한다 |
| 문서 | `database/README.md`에 파일별 적용 안내가 쌓여 있다(실행기 도입 전 psql 절차 포함) | `database/README.md`는 일반 규칙만. 파일별 설명은 SQL 파일 맨 위 주석에 쓴다 |

나머지 7개 앱은 실행기가 없고, 각 리포 CI에서 `psql` 반복문으로 모든 파일을 적용한다. 기록 테이블이 없다. study-log는 같은 반복문을 두 번 돌려 다시 실행해도 안전한지 확인한다. 2026-10-22에 각 앱의 로컬 사본으로 확인한 결과, 7개 앱의 마이그레이션은 모두 `IF NOT EXISTS`로 쓰여 있어 실행기를 처음 실행할 때 001부터 다시 적용해도 안전하다.

## 8. 기존 앱에 실행기 들이기

각 앱 리포의 이슈·PR로 진행한다. 중앙에서 앱 리포에 직접 push하지 않는다.

1. 스캐폴드의 `backend/src/migrations.ts`, `backend/src/migrate.ts`, `backend/test/migrations.test.ts`를 복사한다.
2. `backend/package.json`에 `"db:migrate": "tsx --env-file-if-exists=../.env src/migrate.ts"`, 루트 `package.json`에 `"db:migrate": "npm run db:migrate -w backend --"`를 추가한다. `pg`, `tsx`는 이미 의존성에 있어 새 패키지가 필요 없다.
3. 로컬 DB에서 `npm run db:migrate -- --status`로 대기 목록을 보고, `npm run db:migrate`로 기준선을 기록한다.
4. 운영 DB는 배포 스크립트가 덤프를 만든 뒤 같은 명령으로 기록한다.
5. 공통 CI는 `db:migrate`가 생기면 자동으로 실행기를 쓴다(5절). CI 설정을 따로 바꿀 필요가 없다.
