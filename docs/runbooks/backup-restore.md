# 백업·복구 ({{project.title}})

## 백업 종류

| 종류 | 시각(서울) | 위치 | 보관 |
|---|---|---|---|
| Lightsail 자동 스냅샷 | 매일 03:00 | AWS (서버 전체) | 최근 7개 |
| DB 덤프 | 매일 03:30 (`{{project.db.name}}-backup.timer`) | 서버 `/var/backups/{{project.db.name}}/{{project.db.name}}-<날짜>.sql.gz`와 행 수 파일 `.counts` | 14일 |
| 배포 전 DB 덤프 | 배포마다 | 같은 폴더, 이름 끝 `-predeploy` | 14일 |
| 서버 밖 사본 | 덤프마다 | S3 `s3://<버킷>/{{project.name}}/` (서버 `.env`에 버킷이 있을 때) | 30일 (버킷 수명 주기) |
| 복구 확인 | 매주 일요일 04:30 (`{{project.db.name}}-restore-check.timer`) | 최신 덤프를 임시 DB에 복구하고 행 수 비교 | 로그만 |
| 로컬 DB 백업 | 필요할 때 | PC `backups/` (git 제외) | 사용자 관리 |

- 처음 한 번: `sudo bash /opt/{{project.name}}/deploy/install-backup.sh` (timer 2개 설치. 예전 cron 덤프가 있으면 timer로 바꿉니다)
- 실행 기록: `journalctl -u {{project.db.name}}-backup`, `journalctl -u {{project.db.name}}-restore-check`
- 수동 덤프: 서버에서 `bash /opt/{{project.name}}/deploy/backup.sh dump`
- 수동 복구 확인: `bash /opt/{{project.name}}/deploy/backup.sh verify`
- 설치 전에는 덤프가 앱 폴더 `backups/`에 생깁니다(git 제외).
- 로컬 DB 백업: `./scripts/backup.ps1` (로컬 DB `127.0.0.1:{{project.ports.db}}`)

## S3 사본 [사용자]

S3 버킷과 업로드 전용 키는 shared-aws-infrastructure가 만듭니다. 키는 버킷에 파일을 **올리기만** 할 수 있어서, 유출되어도 백업을 읽거나 지울 수 없습니다. 같은 이름으로 덮어써도 버킷의 버전 관리가 예전 파일을 남깁니다.

서버 `.env`에 아래 키를 넣으면 다음 덤프부터 올라갑니다. 값은 서버에서만 입력하고 채팅·문서에 남기지 않습니다.

| 키 | 값 |
|---|---|
| `BACKUP_S3_BUCKET` | 버킷 이름 (shared-aws-infrastructure 출력값) |
| `BACKUP_S3_REGION` | 비우면 `ap-northeast-2` |
| `BACKUP_AWS_ACCESS_KEY_ID`, `BACKUP_AWS_SECRET_ACCESS_KEY` | 업로드 전용 키 (비밀값) |

업로드는 서버에 있는 `curl --aws-sigv4`로 하고, 키는 명령줄이 아니라 표준 입력으로 넘깁니다. 키가 빠졌거나 업로드에 실패하면 로컬 덤프는 남기고 timer만 실패로 표시합니다. 배포는 멈추지 않습니다.

S3에서 내려받기(PC, 개인 AWS 프로필):

```powershell
aws s3 ls s3://<버킷>/{{project.name}}/ --profile {{project.db.name}}-personal
aws s3 cp s3://<버킷>/{{project.name}}/<파일> ./backups/ --profile {{project.db.name}}-personal
```

## PC로 가져오기

```powershell
scp -i ~/.ssh/{{project.name}}-lightsail ubuntu@<static_ip>:/var/backups/{{project.db.name}}/<파일> ./backups/
```

## 복원 확인 (별도 DB에)

매주 `{{project.db.name}}-restore-check.timer`가 자동으로 합니다(임시 postgres 컨테이너에 최신 덤프를 복구하고, 덤프할 때 저장한 테이블별 행 수와 비교). 큰 마이그레이션 전에는 아래처럼 직접 확인합니다.

```bash
cd /opt/{{project.name}}
docker compose exec -T db createdb -U {{project.db.name}} {{project.db.name}}_restore
gunzip -c /var/backups/{{project.db.name}}/<파일> | docker compose exec -T db psql -q -U {{project.db.name}} -d {{project.db.name}}_restore -v ON_ERROR_STOP=1
docker compose exec -T db psql -U {{project.db.name}} -d {{project.db.name}}_restore -c 'select count(*) from schema_migrations'
docker compose exec -T db dropdb -U {{project.db.name}} {{project.db.name}}_restore
```

## 운영 DB를 덤프로 교체 [사용자]

되돌릴 수 없는 작업입니다. 먼저 현재 상태의 덤프를 만듭니다.

1. `bash /opt/{{project.name}}/deploy/backup.sh dump`
2. `docker compose stop api web`
3. `{{project.db.name}}` DB를 지우고 다시 만든 뒤, 위 복원 명령에서 `-d {{project.db.name}}`으로 복원합니다.
4. `docker compose start api web` 후 `curl -fsS http://127.0.0.1/api/health`

## 서버 전체 복구 [사용자]

Lightsail 콘솔에서 스냅샷으로 새 인스턴스를 만들고 고정 IP를 옮깁니다. Terraform state와 달라지므로, 복구 뒤 `terraform plan`으로 차이를 확인하고 `terraform import` 여부를 정합니다.
