# 배포·운영 ({{project.title}})

개인 계정의 Lightsail 서버 한 대에서 Docker Compose(웹·API·PostgreSQL)로 운영합니다. 같은 서버에 앱 8개가 각자의 compose로 함께 돌아갑니다([ADR-0009](https://github.com/sirloinbh/project-standards/blob/main/docs/adr/0009-multi-app-single-lightsail.md)). 허용한 IP에서만 접속할 수 있습니다.

## 값 요약

| 항목 | 값 |
|---|---|
| 서버 앱 폴더 | `/opt/{{project.name}}` |
| 로컬 웹 / DB 포트 | `127.0.0.1:{{project.ports.web}}` / `127.0.0.1:{{project.ports.db}}` |
| 서버 웹 | `0.0.0.0:{{project.ports.web}}` (서버 `.env`의 `WEB_BIND`·`WEB_PORT`. 배포 스크립트도 이 `WEB_PORT`로 health를 확인) |
| DB 이름 | `{{project.db.name}}` |
| 자동 배포 timer | `{{project.db.name}}-autodeploy.timer` (부팅 후 `3min {{project.slot}}0s`에 시작, 이후 2분마다) |
| 배포 잠금 | `/run/lock/apps-deploy.lock` (서버의 모든 앱이 함께 씀. 한 번에 한 앱만 빌드·배포) |
| AWS CLI 프로필 | `{{project.db.name}}-personal` (개인 계정, 회사 프로필과 분리) |
| SSH 키 | `~/.ssh/{{project.name}}-lightsail` (PC에만 보관) |

## 서버 `.env` 키

값은 서버에서만 만들고 저장소·채팅·로그에 남기지 않습니다. 키를 추가하면 `.env.example`, 쓰는 코드, 이 표를 같은 PR에서 고칩니다([환경변수 규칙](https://github.com/sirloinbh/project-standards/blob/main/docs/env-conventions.md)).

| 키 | 만드는 곳 | 설명 |
|---|---|---|
| `POSTGRES_DB` | user-data (첫 부팅) | `{{project.db.name}}` |
| `POSTGRES_USER` | user-data | `{{project.db.name}}` |
| `POSTGRES_PASSWORD` | user-data (서버에서 무작위 생성) | 비밀값. 서버 밖으로 꺼내지 않는다 |
| `WEB_BIND` | user-data | `0.0.0.0` |
| `WEB_PORT` | user-data | `{{project.ports.web}}`. 방화벽에 이 포트가 열려 있어야 합니다(shared-aws-infrastructure) |
| `NODE_AUTH_TOKEN` | [사용자] 직접 입력 | GitHub Packages 읽기용 classic PAT(`read:packages`만). 비밀값 |
| `BACKUP_S3_BUCKET`, `BACKUP_S3_REGION` | [사용자] 직접 입력 | DB 덤프 S3 사본 버킷과 리전. 없으면 서버에만 보관([백업·복구](backup-restore.md)) |
| `BACKUP_AWS_ACCESS_KEY_ID`, `BACKUP_AWS_SECRET_ACCESS_KEY` | [사용자] 직접 입력 | 버킷에 올리기만 되는 키. 비밀값 |
| `SECRETS_AWS_ACCESS_KEY_ID`, `SECRETS_AWS_SECRET_ACCESS_KEY` | [사용자] 직접 입력 (Claude API를 쓰는 앱만) | SSM의 `/sirloinbh/anthropic-api-key` 하나만 읽을 수 있는 키. 비밀값. 있으면 배포 스크립트가 배포할 때마다 SSM에서 `ANTHROPIC_API_KEY`를 읽어 앱에 넘깁니다([ADR-0010](https://github.com/sirloinbh/project-standards/blob/main/docs/adr/0010-claude-api-key-ssm.md)). 이 키가 있으면 서버 `.env`의 `ANTHROPIC_API_KEY`는 지워도 됩니다 |
| `HEALTHCHECK_URL_HEALTH`, `HEALTHCHECK_URL_DEPLOY`, `HEALTHCHECK_URL_BACKUP`, `HEALTHCHECK_URL_RESTORE`, `HEALTHCHECK_URL_REPORT` | [사용자] 직접 입력 | healthchecks.io 체크별 신호 주소. 주소에 비밀 UUID가 들어 있어 비밀값으로 다룹니다. 없는 키의 신호는 보내지 않습니다(아래 "알림") |

`IMAGE_TAG`는 배포 스크립트가 커밋으로 정하므로 `.env`에 두지 않습니다.

## 1. 처음 한 번 준비 [사용자]

1. **AWS CLI 프로필**
   ```powershell
   aws configure --profile {{project.db.name}}-personal
   aws sts get-caller-identity --profile {{project.db.name}}-personal   # 개인 계정 ID인지 확인
   ```
2. **SSH 키**
   ```powershell
   ssh-keygen -t ed25519 -f $HOME/.ssh/{{project.name}}-lightsail -C {{project.name}}
   ```
3. **변수 파일:** `infrastructure/terraform.tfvars.example`을 `infrastructure/terraform.tfvars`로 복사하고 `aws_profile`, `expected_account_id`, `allowed_cidrs`, `budget_emails`를 채웁니다. 이 파일과 `terraform.tfstate`는 git에서 제외됩니다.

## 2. 인프라 적용 [사용자]

```powershell
cd infrastructure
terraform init
terraform plan -out=deploy.tfplan     # 생성 목록과 계정 확인
terraform apply deploy.tfplan
terraform output                      # static_ip, url, ssh
```

- 첫 부팅 때 user-data가 swap, Docker, 저장소 clone, 서버 `.env`, 백업 cron, 자동 배포 timer를 설정합니다.
- state를 잃으면 리소스를 Terraform으로 관리할 수 없으므로 PC 밖의 안전한 곳에 따로 백업합니다.

## 3. 앱 배포·롤백

```powershell
./scripts/deploy.ps1 -Server <static_ip> -Ref origin/main   # 배포
./scripts/deploy.ps1 -Server <static_ip> -Rollback          # 직전 배포로 되돌림
```

배포 순서(`deploy/remote-deploy.sh`):

1. 서버 초기화가 끝날 때까지 기다린다(`cloud-init status --wait`).
2. ref를 fetch·checkout하고 커밋 태그(12자리)로 이미지를 빌드한다.
3. 이전 배포가 있으면 DB 덤프를 먼저 만든다.
4. 마이그레이션을 적용한다(`schema_migrations` 기록).
5. 전체를 시작하고 `http://127.0.0.1:<WEB_PORT>/api/health`를 최대 60초 확인한다.
6. health가 실패하면 이전 이미지로 다시 시작하고 실패로 끝난다.
7. 성공하면 `.deployed`·`.previous`를 기록하고 현재·직전 이미지만 남긴다.

- 롤백은 다시 빌드하지 않습니다. 마이그레이션은 되돌리지 않으므로, 데이터를 되돌려야 하면 배포 직전 덤프로 복원합니다([백업·복구](backup-restore.md)).

## 4. main 자동 배포

main에 병합되면 서버가 2분마다 `origin/main`을 확인해서, 그 커밋의 GitHub Actions 결과가 모두 성공이면 3번 순서로 배포합니다. GitHub에는 AWS·SSH 키를 두지 않습니다. 다른 앱이 배포 중이면(공용 잠금) 다음 회차에 다시 확인합니다.

배포 스크립트(`deploy/`)는 중앙 템플릿이고, 이 리포의 `compose.yaml`이 다음 조건을 지켜야 동작합니다.

- 이미지 이름: `{{project.db.name}}-backend:${IMAGE_TAG:-local}`, `{{project.db.name}}-frontend:${IMAGE_TAG:-local}`
- 웹 포트: `'${WEB_BIND:-127.0.0.1}:${WEB_PORT:-{{project.ports.web}}}:80'`
- DB 서비스 이름 `db`, API 서비스 이름 `api`, API 이미지 안의 `node dist/migrate.js`

timer 설치(서버에서 한 번):

```bash
sudo bash /opt/{{project.name}}/deploy/install-autodeploy.sh
```

```bash
systemctl list-timers {{project.db.name}}-autodeploy.timer        # 다음 실행 시각
journalctl -u {{project.db.name}}-autodeploy -n 50 --no-pager     # 최근 기록
cat /opt/{{project.name}}/.deployed                                # 배포 중인 커밋
sudo systemctl stop {{project.db.name}}-autodeploy.timer           # 일시 중지
sudo systemctl start {{project.db.name}}-autodeploy.timer          # 재개
rm /opt/{{project.name}}/.autodeploy-failed                        # 건너뛴 커밋 다시 시도
```

## 4-1. 알림 (healthchecks.io)

방화벽이 허용 IP에서만 열려 있어 바깥 감시 서비스가 서버에 들어올 수 없습니다. 그래서 서버가 바깥으로 신호를 보내고, 신호가 끊기거나 실패 신호가 오면 healthchecks.io가 메일을 보냅니다(#284). 서버가 통째로 멈춰도 신호가 끊기므로 알 수 있습니다.

| 체크 | 서버 `.env` 키 | 신호를 보내는 곳 | healthchecks.io 주기 / 유예 |
|---|---|---|---|
| health | `HEALTHCHECK_URL_HEALTH` | `{{project.db.name}}-health.timer` 5분마다 `/api/health` | 5분 / 10분 |
| deploy | `HEALTHCHECK_URL_DEPLOY` | 자동 배포 2분마다 (최신, CI 대기, 배포 성공은 ok, CI·배포 실패는 fail) | 2분 / 10분 |
| backup | `HEALTHCHECK_URL_BACKUP` | 매일 덤프 (S3 사본 실패도 fail) | 1일 / 2시간 |
| restore | `HEALTHCHECK_URL_RESTORE` | 매주 복구 확인 | 7일 / 1일 |
| report | `HEALTHCHECK_URL_REPORT` | 매일 서버 상태 보고 (#285) | 1일 / 2시간 |

- 설치: `sudo bash /opt/{{project.name}}/deploy/install-backup.sh` (백업·복구 확인·health timer). `.env`에 주소를 나중에 넣어도 다시 실행할 필요가 없습니다.
- 수동 확인: `bash /opt/{{project.name}}/deploy/notify.sh health` (주소는 출력하지 않습니다)
- 매일 보고(#285, 04:00): `memory=..% disk=..% deployed=<커밋> containers: <컨테이너> <메모리>` 한 줄이 report 체크 기록에 남습니다. 서버 메모리 사용률이 `REPORT_MEMORY_PERCENT`(기본 85) 또는 디스크가 `REPORT_DISK_PERCENT`(기본 90)를 넘으면 실패 신호로 보내 메일이 옵니다. 지금 값만 보려면 `bash /opt/{{project.name}}/deploy/report.sh line`.
- 신호 본문(덤프 이름, 실패 이유)은 healthchecks.io의 체크 기록에 남습니다. 비밀값은 넣지 않습니다.

## 5. 접속

- **브라우저:** `http://<static_ip>:<WEB_PORT>` (허용 IP에서만)
- **SSH:** `ssh -i ~/.ssh/{{project.name}}-lightsail ubuntu@<static_ip>`
- **SSH 터널(전송 암호화):** `ssh -i ~/.ssh/{{project.name}}-lightsail -L {{project.ports.web}}:127.0.0.1:<WEB_PORT> ubuntu@<static_ip>` 후 `http://localhost:{{project.ports.web}}`
- **로그:** 서버에서 `cd /opt/{{project.name}} && docker compose logs --tail 100 api`

## 6. 허용 IP 바꾸기

`terraform.tfvars`의 `allowed_cidrs`를 고친 뒤 `terraform apply`를 실행합니다. 전체 공개(`/0`)는 변수 검증에서 거부됩니다.

## 7. 철거 [사용자]

필요한 백업을 PC로 가져온 뒤 `terraform destroy`를 실행합니다. 자동 스냅샷은 인스턴스 삭제 후에도 남아 비용이 나올 수 있으므로 Lightsail 콘솔에서 확인합니다.
