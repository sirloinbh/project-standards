# {{project.title}} PostgreSQL

PostgreSQL {{versions.postgres}}. 스키마의 원본은 `migrations/NNN_<설명>.sql`이며 파일 이름 순서로 적용합니다.

## 마이그레이션 적용

우산 리포 루트에서 실행합니다. `.env`의 `DATABASE_URL`(호스트 포트 {{project.ports.db}})을 씁니다.

```powershell
npm run db:migrate              # 적용하지 않은 파일만 순서대로 적용
npm run db:migrate -- --status  # 적용됨·대기 목록만 확인 (DB 변경 없음)
```

- 적용 이력은 `schema_migrations`(파일 이름, 체크섬, 적용 시각)에 남습니다. 파일 하나와 그 기록은 한 트랜잭션으로 커밋됩니다.
- 적용한 파일을 고치거나 지우면 아무것도 적용하지 않고 실패합니다. 고칠 내용은 새 번호의 파일로 추가합니다.
- 모든 파일은 다시 실행해도 안전하게 씁니다(`IF NOT EXISTS`, `ON CONFLICT` 등). 빈 볼륨에서는 Docker 초기화가 먼저 실행하기 때문입니다.
- PowerShell 파이프(`Get-Content … | psql`)로 SQL을 넘기지 않습니다. Windows PowerShell 5.1이 한글을 깨뜨립니다.
