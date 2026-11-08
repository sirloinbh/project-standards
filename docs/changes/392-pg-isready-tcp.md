# #392 `pg_isready`가 첫 실행 임시 서버를 준비된 것으로 오인하지 않게 하기

`sirloinbh/plan-routine` PR #81 리뷰에서 찾았다. 공식 postgres 이미지는 빈 볼륨 첫 실행 때 TCP를 끈 임시 서버(`listen_addresses=''`)로 DB를 만들고 초기화 스크립트를 돌린다. `pg_isready`는 기본으로 unix 소켓을 확인하므로 이 구간에도 준비됨으로 답한다.

## 변경

| 파일 | 내용 |
|---|---|
| `scaffold/app/compose.yaml` | DB 헬스 체크를 `pg_isready -h 127.0.0.1 ...`로 바꿨다. 앱 컨테이너가 임시 서버 구간에 `db:5432`로 붙다가 거부당하지 않는다 |
| `templates/app/deploy/backup.sh.tmpl` | 복원 확인(`verify`)의 대기 루프도 `-h 127.0.0.1`로 확인한다. 임시 서버 구간에 복원을 시작해 거짓 실패하지 않는다 |
| `scripts/test/scaffold.test.mjs`, `scripts/test/deploy-templates.test.mjs` | 두 명령에 `-h 127.0.0.1`이 있는지 확인한다 |

## 동기화

- `backup.sh`는 중앙 관리 파일이라 동기화 PR로 앱에 들어간다.
- `compose.yaml`은 스캐폴드 파일이라 동기화되지 않는다. 이미 만든 앱은 각자 고친다. plan-routine은 PR #81에서 고쳤다.

## 남긴 것

- `.github/workflows/reusable-app-ci.yml`의 CI 서비스 컨테이너 3곳도 `--health-cmd pg_isready`로 같은 구조다. 이슈 범위 밖이라 고치지 않았다. 초기화 스크립트가 없어 임시 서버 구간이 짧지만, 필요하면 별도 이슈로 다룬다.

## 검증

- 실제 확인(Docker 29.9.2, `postgres:17-alpine`): 빈 볼륨에 6초 걸리는 초기화 스크립트를 넣고 0.2초마다 두 명령을 실행했다.
  - 소켓(`-h` 없음): 임시 서버가 뜬 직후 준비됨으로 답했다.
  - TCP(`-h 127.0.0.1`): 약 7초 뒤, 로그의 `PostgreSQL init process complete` 다음 본 서버가 `0.0.0.0:5432`를 연 뒤에야 준비됨으로 답했다.
- `node --test scripts/test/scaffold.test.mjs scripts/test/deploy-templates.test.mjs`: 통과.
- `npm run check`: 통과(테스트 523개 중 518 통과, 0 실패, 5 건너뜀 — 환경에 따라 건너뛰는 테스트).
