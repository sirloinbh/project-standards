# #82 준수 현황 리포트 (compliance.md, env-matrix.md)

## 변경

| 파일 | 내용 |
|---|---|
| `scripts/lib/compliance.mjs` | 리포별 상태 수집(manifest 관리 파일 비교, 공유 패키지 버전, 열린 동기화 PR과 경과 일수), `.env.example` 파싱(`@desc @required @secret @used`), 레지스트리 교차 검사, 두 보고서 렌더링 |
| `scripts/lib/remote-repo.mjs` | API로 기본 브랜치 파일을 읽는다(clone 없음) |
| `scripts/compliance.mjs` | `--local <리포>=<경로>`는 로컬 클론으로 미리보기. `--apply`는 App으로 9개 리포를 읽고, 보고서가 바뀌었을 때만 중앙에 `chore/compliance-report` PR을 열거나 갱신한다 |
| `.github/workflows/compliance.yml` | 매일 00:00 KST와 수동 실행. App이 없으면 건너뛴다 |
| `docs/compliance.md`, `docs/env-matrix.md` | 로컬 클론 8개로 만든 첫 보고서 |
| `scripts/test/compliance.test.mjs` | 테스트 7개 |

## 비밀값 보호

- `@secret` 키는 값 대신 `(비밀)`로 표시한다.
- 태그가 없는 기존 `.env.example`은 키 이름으로 판단한다. `PASSWORD`, `SECRET`, `TOKEN`, `KEY`, `DATABASE_URL`이 들어간 키는 비밀로 본다.
- 테스트가 비밀번호 값이 두 보고서 어디에도 나오지 않음을 확인한다. 첫 보고서에서도 기존 비밀번호 예시 값(`change-this…`)이 나오지 않는 것을 확인했다.

## 첫 보고서 결과 (로컬 클론 기준)

- 8개 앱 모두 아직 동기화 전이다(manifest 없음).
- 8개 앱 모두 `.env.example`의 `PORT`와 `DATABASE_URL` 포트가 새 포트 체계와 다르다. 포트 재배정(#95, #99)에서 고친다.
- shared-aws-infrastructure는 로컬 클론이 없어 "확인 못 함"으로 표시된다.

## 범위에서 뺀 것

- `npm audit` 결과 수집은 넣지 않았다. 레지스트리에 네트워크로 조회해야 하는 명령이라, 따로 판단해야 한다.
- 보고서 PR은 App이 만들어서 중앙 CI가 실행된다. 병합은 일반 PR처럼 한다.

## 검증

- `npm run check`: 테스트 117개 통과, `check-workflows: ok (8 files)`
- 처음 실행에서 테스트가 실제 버그를 하나 찾았다. "확인 못 함" 리포는 문제 목록이 없어서 보고서의 "다른 곳" 절을 만들다 실패했다. 고쳤다.
