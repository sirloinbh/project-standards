# #262 DB 백업 서버 밖 보관과 정기 복구 확인

## 확인한 현재 상태 (읽기 전용)

- 매일 DB 덤프는 workout-memo에만 있었다(shared-aws-infrastructure `user-data.sh`의 cron). 나머지 7개 앱은 배포할 때만 덤프했는데, 백업 런북 템플릿은 앱마다 "매일 03:30"이라고 적고 있었다.
- 서버 밖 사본은 Lightsail 자동 스냅샷(매일, 7개)뿐이었다.
- 복구 확인 주기가 없었다.

## 결정

사용자가 서버 밖 보관 위치로 **S3**를 골랐다(2026-10-27, 비교는 #262 댓글).

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/deploy/backup.sh.tmpl` | `dump [label]`: `pg_dump --no-owner`, 행 수 파일, 14일 정리, S3 업로드(`curl --aws-sigv4`, 키는 표준 입력). `verify`: 임시 postgres에 최신 덤프 복구 후 행 수 비교 |
| `templates/app/deploy/backup.{service,timer}.tmpl` | 매일 03:30(서울) 덤프 |
| `templates/app/deploy/restore-check.{service,timer}.tmpl` | 매주 일요일 04:30(서울) 복구 확인 |
| `templates/app/deploy/install-backup.sh.tmpl` | 서버 폴더·timer 설치, 예전 cron 덤프(`/etc/cron.d/<DB>-backup`) 교체 |
| `templates/app/deploy/remote-deploy.sh.tmpl` | 배포 전 덤프도 `backup.sh dump predeploy`로. S3만 실패(종료 코드 3)하면 배포는 계속 |
| `scripts/test/deploy-templates.test.mjs` | 파일 목록, 가짜 docker·curl·flock으로 덤프·S3·복구 확인 동작, timer 시각 |
| `docs/runbooks/backup-restore.md`, `docs/runbooks/deploy.md` | 실제 동작과 S3 키(`BACKUP_*`) |
| `docs/adr/0009-multi-app-single-lightsail.md` | 보충: 앱마다 매일 덤프, S3, 매주 복구 확인 |

S3 버킷과 업로드 전용 IAM 사용자는 sirloinbh/shared-aws-infrastructure#7에서 만든다.

## 사용자 단계

1. shared-aws-infrastructure#7 PR 병합과 `terraform apply`, 업로드 전용 액세스 키 만들기
2. 서버 앱마다 `.env`에 `BACKUP_*` 키 넣기, `sudo bash /opt/<앱>/deploy/install-backup.sh` 실행
3. `bash /opt/<앱>/deploy/backup.sh dump`로 S3 업로드 확인 (실제 S3 업로드는 서버에서만 확인할 수 있다)

## 검증

- `node --test scripts/test/deploy-templates.test.mjs`: 13개 중 12개 통과, 1개 건너뜀(python3 없음, 기존 테스트)
- `npm run check`: PR 본문 참고
