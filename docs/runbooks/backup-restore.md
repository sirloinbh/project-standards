# 백업·복구 ({{project.title}})

## 백업 종류

| 종류 | 시각(서울) | 위치 | 보관 |
|---|---|---|---|
| Lightsail 자동 스냅샷 | 매일 03:00 | AWS (서버 전체) | 최근 7개 |
| DB 덤프 | 매일 03:30 | 서버 `/var/backups/{{project.db.name}}/{{project.db.name}}-<날짜>.sql.gz` | 14일 |
| 배포 전 DB 덤프 | 배포마다 | 같은 폴더 | 14일 |
| 로컬 DB 백업 | 필요할 때 | PC `backups/` (git 제외) | 사용자 관리 |

- 덤프 실행 로그: 서버 `/var/log/{{project.db.name}}-backup.log`
- 수동 덤프: 서버에서 `/usr/local/bin/{{project.db.name}}-backup`
- 로컬 DB 백업: `./scripts/backup.ps1` (로컬 DB `127.0.0.1:{{project.ports.db}}`)

## PC로 가져오기

```powershell
scp -i ~/.ssh/{{project.name}}-lightsail ubuntu@<static_ip>:/var/backups/{{project.db.name}}/<파일> ./backups/
```

## 복원 확인 (별도 DB에)

운영 DB를 건드리지 않고 덤프가 쓸 만한지 확인합니다. 정기적으로, 그리고 큰 마이그레이션 전에 합니다.

```bash
cd /opt/{{project.name}}
docker compose exec -T db createdb -U {{project.db.name}} {{project.db.name}}_restore
gunzip -c /var/backups/{{project.db.name}}/<파일> | docker compose exec -T db psql -q -U {{project.db.name}} -d {{project.db.name}}_restore -v ON_ERROR_STOP=1
docker compose exec -T db psql -U {{project.db.name}} -d {{project.db.name}}_restore -c 'select count(*) from schema_migrations'
docker compose exec -T db dropdb -U {{project.db.name}} {{project.db.name}}_restore
```

## 운영 DB를 덤프로 교체 [사용자]

되돌릴 수 없는 작업입니다. 먼저 현재 상태의 덤프를 만듭니다.

1. `/usr/local/bin/{{project.db.name}}-backup`
2. `docker compose stop api web`
3. `{{project.db.name}}` DB를 지우고 다시 만든 뒤, 위 복원 명령에서 `-d {{project.db.name}}`으로 복원합니다.
4. `docker compose start api web` 후 `curl -fsS http://127.0.0.1/api/health`

## 서버 전체 복구 [사용자]

Lightsail 콘솔에서 스냅샷으로 새 인스턴스를 만들고 고정 IP를 옮깁니다. Terraform state와 달라지므로, 복구 뒤 `terraform plan`으로 차이를 확인하고 `terraform import` 여부를 정합니다.
