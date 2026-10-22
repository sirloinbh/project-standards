# #35 배포·운영 문서 템플릿 (배포 runbook, 일일 기록, 백업·복구)

## 변경

| 파일 | 내용 |
|---|---|
| `docs/runbooks/deploy.md` | workout-memo `docs/deployment.md`를 일반화했다. 앱별 값은 `{{project.*}}`, 서버 `.env`는 키 이름과 만드는 곳만 표로 적는다(`NODE_AUTH_TOKEN` 추가) |
| `docs/runbooks/backup-restore.md` | 배포 문서에 섞여 있던 백업·복원 절차를 떼어 내고, 복원 확인 뒤 임시 DB 삭제와 서버 전체 복구 후 Terraform 확인을 더했다 |
| `docs/runbooks/daily.md`, `next-steps.md` | workout-memo의 일일 기록·다음 작업 규칙을 옮기고, 날짜 파일 형식과 "사용자가 할 일" 절을 정했다 |
| `docs/runbooks/README.md` | 쓰는 법, 동기화하지 않는 이유, workout-memo 문서와의 차이표 |
| `scripts/test/runbooks.test.mjs` | 모든 템플릿이 모든 레지스트리 프로젝트에서 빈칸 없이 렌더링되는지, 서버 `.env` 키에 값이 없는지 검사 |

## 결정

- **동기화하지 않는다.** 운영 문서에는 앱마다 비용표·운영 이력이 붙으므로 전체 관리(full)로 덮어쓰면 안 된다. 새 앱은 스캐폴드(#85)가 한 번 복사한다.
- 서버 이름 접두어(timer, 잠금, 백업 폴더, AWS 프로필)는 `project.db.name`으로 정했다. workout-memo의 `workout-`이 DB 이름과 같아 바꿀 필요가 없다.

## 검증

- `npm run check` 통과.
