# {{project.displayName}}

{{project.summary}}

## 개발 기준

Node.js **{{versions.node}}**, npm **{{versions.npm}}**. 공통 규칙은 중앙 리포 [sirloinbh/project-standards](https://github.com/sirloinbh/project-standards)가 원본이고, 이 리포의 중앙 관리 파일은 동기화 PR로만 바뀝니다.

| 명령 | 하는 일 |
|---|---|
| `npm ci` | 의존성 설치 (`.npmrc`가 설치 스크립트를 막음) |
| `npm run check` | 포맷, 린트, 계약 복제본, 스킬 복제본, 타입, 테스트, 빌드 |
| `npm run standards:check` | 중앙 관리 파일과 레지스트리 값 확인 |
| `npm run test:e2e` | Playwright 브라우저 검사 (테스트 DB 필요) |
| `npm run db:migrate` | DB 마이그레이션 적용 |
| `npm run openapi` | API를 바꾼 뒤 `docs/openapi.json` 다시 만들기 |

## 실행

```powershell
Copy-Item .env.example .env   # 비밀번호를 바꾼 뒤 실행
docker compose up --build -d
```

접속: http://localhost:{{project.ports.web}} . 데이터는 `{{project.db.name}}-data` 볼륨에 저장됩니다. `docker compose down -v`는 데이터를 지웁니다.

## 포트 (중앙 레지스트리 슬롯 {{project.slot}})

| 용도 | 포트 |
|---|---|
| 웹 (Docker) | {{project.ports.web}} |
| API | {{project.ports.api}} |
| Vite 개발 서버 | {{project.ports.vite}} |
| DB (호스트) | {{project.ports.db}} |
| e2e API / 웹 | {{project.ports.e2eApi}} / {{project.ports.e2eWeb}} |

## 리포 구성

우산 리포 `{{project.repos.umbrella}}`가 원본이고, `frontend/`·`backend/`·`database/`는 subtree로 `{{project.repos.frontend}}`, `{{project.repos.backend}}`, `{{project.repos.db}}`에 나갑니다(`scripts/push-repositories.ps1`).

## 문서

- [에이전트 지침](AGENTS.md), [프로젝트 고유 지침](AGENTS.project.md)
- [배포·운영](docs/deployment.md), [백업·복구](docs/backup-restore.md)
- [일일 기록](docs/daily/README.md), [다음 작업](docs/next-steps/README.md)
- [DB 마이그레이션](database/README.md)
