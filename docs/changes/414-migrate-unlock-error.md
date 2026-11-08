# #414 마이그레이션 실행기: 연결이 끊기면 잠금 해제 오류가 원래 오류를 가림

health-log PR #94(#53) 2차 리뷰에서 코드를 읽고 찾았다.

## 문제

`scaffold/app/backend/src/migrations.ts`의 `migrate()`는 `finally`에서 `pg_advisory_unlock`을 실행했다. 파일 적용 중 DB 연결이 끊기면 잠금 해제도 같은 이유로 실패하고, 그 오류가 `"<파일> 적용 실패: <원인>"`을 덮어썼다. 종료 코드는 1로 같지만 로그에 어느 파일이 실패했는지 남지 않았다.

## 변경

| 파일 | 내용 |
|---|---|
| `scaffold/app/backend/src/migrations.ts` | 적용이 실패하면 잠금 해제 실패는 무시하고 원래 오류를 던진다. 성공했을 때의 잠금 해제 실패는 지금처럼 오류로 남긴다. 적용 부분은 `applyPending()`으로 뺐다 |
| `scaffold/app/backend/test/migrations.test.ts` | 가짜 연결로 "적용 중 연결 끊김"과 "성공 후 잠금 해제 / 해제 실패"를 확인 |

연결이 끊기면 PostgreSQL이 세션의 advisory lock을 풀기 때문에, 해제 실패를 무시해도 잠금이 남지 않는다.

## 검증

- 스캐폴드 테스트는 생성된 앱에서 `tsx`로 돈다. 이 리포에는 의존성을 설치하지 않으므로, 실행기와 테스트를 임시 폴더에 복사하고 Node 내장 TypeScript 실행(`node --test`, import 확장자만 `.ts`로 바꿈)으로 돌렸다.
  - 바뀐 실행기: 7개 모두 통과
  - 바뀌기 전 실행기(`origin/main`): 새 테스트 "connection is lost"가 `Connection terminated unexpectedly`로 실패해 문제가 재현됐다
- `npm run check`: 결과는 PR 본문에 적는다.

## 앱 반영

`scaffold/`는 새 앱의 첫 커밋에만 쓰이고 동기화되지 않는다. 2026-11-08 기준으로 아래 앱 리포가 같은 코드(`finally`에서 잠금 해제)를 갖고 있어 각 리포에서 따로 고쳐야 한다.

- workout-memo, study-log, health-log, life-journal, plan-routine: `backend/src/migrations.ts`
- money-ledger, cert-manager, dev-career-portfolio: 파일 없음
