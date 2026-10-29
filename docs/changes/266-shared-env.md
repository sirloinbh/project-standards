# #266 공용 키를 project-standards 한 곳에 두기

- 이슈: #266 (ADR-0010 변경)
- 브랜치: `docs/266-shared-claude-workspace`

## 목적

공용 Claude API 키와 서버 AWS 키를 특정 앱(study-log, workout-memo)에 묶지 않고, 서버와 PC 모두 `project-standards` 한 곳에 둔다(사용자 결정, 2026-10-29).

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/deploy/ssm-get.sh.tmpl` | `SECRETS_AWS_*`를 서버 공용 파일 `/opt/project-standards/.env`에서 먼저 읽고, 없으면 앱 `.env`에서 읽음 |
| `templates/app/deploy/backup.sh.tmpl` | `BACKUP_S3_*`, `BACKUP_AWS_*`도 같은 순서로 읽음 |
| `templates/app/deploy/remote-deploy.sh.tmpl` | 두 파일 중 하나에 `SECRETS_AWS_ACCESS_KEY_ID`가 있으면 SSM에서 Claude 키를 읽음 |
| `tools/app-secrets.mjs` | `pull`은 앱 `.env` 대신 `project-standards/.env` 한 곳에 씀. `check`는 그 파일과 키를 읽는 앱 목록을 보여 줌. `--app`·`--base` 옵션 삭제 |
| `docs/adr/0010-claude-api-key-ssm.md`, `docs/user-steps.md`, `docs/tools.md`, `docs/runbooks/` | 위치·이름 변경, Max 크레딧 사용, 앱 공용 workspace |

- 스크립트는 `STANDARDS_ENV_FILE`로 공용 파일 경로를 바꿀 수 있다(테스트용).
- 앱 `.env`에 남은 키는 대체용으로만 쓴다. 공용 파일에 같은 키가 있으면 공용 파일이 이긴다.

## 남은 일

- shared-aws-infrastructure: IAM 사용자 이름 `workout-memo-*` → `sirloinbh-apps-*` (별도 PR, 사용자가 apply)
- study-log: 백엔드 `dev` 스크립트가 `../../project-standards/.env`를 읽도록 (별도 PR)
- 앱 8개: 다음 동기화 PR로 배포 스크립트 반영
