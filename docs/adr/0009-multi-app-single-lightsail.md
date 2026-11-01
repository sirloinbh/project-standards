# 0009. 앱 8개를 Lightsail 한 대에 앱별 compose로 배포

- 상태: 채택 (이슈 #36)
- 날짜: 2026-10-23

> "접속" 결정은 [ADR-0012](0012-shared-domain-subdomains.md)가 대체한다(#248). 서브도메인 전환(#254)이 끝날 때까지는 이 문서의 앱별 웹 포트 접속을 그대로 쓴다.

## 맥락

- workout-memo만 배포되어 있다. Lightsail 1 GB 한 대에서 Docker Compose(web·api·postgres)를 돌리고, 서버가 이미지를 직접 빌드하며, `workout-autodeploy.timer`가 2분마다 CI를 통과한 `origin/main`을 배포한다. 방화벽은 허용 IP에서 22·80만 연다.
- 나머지 앱 7개도 같은 서버에 올리기로 했다([costs.md](../costs.md)). 배포 템플릿을 만들려면 DB·접속·빌드 방식을 먼저 정해야 한다.
- `registry/platform.json`의 `rootDomain`이 아직 없다.
- 비교한 선택지는 #36 댓글에 있다. 사용자가 권장안을 그대로 골랐다(2026-10-23).

## 결정

| 항목 | 결정 |
|---|---|
| 앱 배치 | 앱마다 `/opt/<앱 이름>`에 자기 리포를 두고 자기 `compose.yaml`로 실행한다 |
| DB | 앱마다 postgres 컨테이너를 둔다. 공유 postgres는 쓰지 않는다 |
| 접속 | 앱별 웹 포트(레지스트리 `ports.web`, 8101–8108)를 허용 IP에만 연다. 도메인이 생기면 호스트 리버스 프록시와 서브도메인으로 바꾸는 새 ADR을 쓴다 |
| 이미지 빌드 | 지금처럼 서버에서 빌드한다. 서버 전체 공용 잠금(`/run/lock/apps-deploy.lock`)으로 한 번에 한 앱만 빌드·배포한다 |
| 자동 배포 | 앱마다 `<앱 이름>-autodeploy.timer`. 시작 시각을 슬롯마다 조금씩 어긋나게 둔다 |
| 서버 사양 | 두 번째 앱을 올릴 때 2 GB(`small_3_0`)로 옮긴다 |

## 결과

- 마이그레이션·백업·롤백이 앱 단위로 나뉜다. 한 앱의 실패가 다른 앱의 DB에 닿지 않는다.
- postgres가 8개 떠서 공유 postgres보다 메모리를 더 쓴다. 2 GB에서 실제 사용량을 측정하고, 부족하면 4 GB로 올리거나 공유 postgres로 바꾸는 새 ADR을 쓴다.
- 앱 프런트엔드의 base 경로·API 경로를 바꿀 필요가 없다. 방화벽에 앱 포트를 추가하는 일은 shared-aws-infrastructure에서 한다.
- 서버가 계속 빌드하므로 공유 패키지를 받으려면 서버 `.env`에 `NODE_AUTH_TOKEN`(`read:packages`)이 필요하다(design.md 4.3). ECR 같은 이미지 레지스트리 비용은 없다.
- Lightsail은 사양을 제자리에서 바꿀 수 없다. 2 GB로 옮길 때는 스냅샷에서 새 인스턴스를 만들고 고정 IP를 다시 붙인다. 이 단계는 사용자가 한다.
- 배포 스크립트 템플릿(`templates/app/deploy/`)은 #94 이후에 이 결정대로 만든다.

## 보충 (2026-10-24, #36)

`templates/app/deploy/`를 만들면서 다음을 정했다.

- **timer 이름은 `<DB 이름>-autodeploy`다**(예: `workout-autodeploy`, `study-autodeploy`). 결정 표의 "`<앱 이름>-autodeploy`"와 다르다. 운영 중인 workout-memo 서버의 timer 이름을 바꾸지 않고 동기화하려고 이렇게 정했다. DB 이름도 레지스트리에서 앱마다 겹치지 않는다.
- **timer 시작 시각:** 부팅 후 `3min <슬롯>0s`에 시작하고, 이후 2분마다 확인한다. 공용 잠금이 이미 잡혀 있으면 그 회차는 건너뛴다.
- **health 확인 포트:** 서버 `.env`의 `WEB_PORT`를 따르고, 값이 없으면 레지스트리 `ports.web`을 쓴다. workout-memo 서버는 지금 `WEB_PORT=80`이라 동작이 바뀌지 않는다. 8101로 옮기는 것은 방화벽 변경과 함께 따로 한다.
- **배포 전 덤프:** 서버에 `/usr/local/bin/<DB 이름>-backup`이 있으면 그 명령을 쓴다(workout-memo). 없으면 앱 폴더의 `backups/`에 `pg_dump`로 저장하고 14일 지난 파일을 지운다.

## 보충 (2026-10-27, #262)

- **DB 덤프를 앱마다 매일 한다.** 위 "배포 전 덤프" 규칙은 바뀌었다. 이전에는 workout-memo만 인프라 user-data의 cron으로 매일 덤프했고, 나머지 앱은 배포할 때만 덤프했다. 이제 `deploy/backup.sh`가 매일 덤프(`<DB 이름>-backup.timer`, 03:30)와 배포 전 덤프를 같은 폴더 `/var/backups/<DB 이름>`에 만든다. 앱들은 `/run/lock/apps-backup.lock`을 차례로 잡는다.
- **서버 밖 사본은 S3다.** 사용자가 S3를 골랐다(#262). 서버에는 버킷에 올리기만 되는 키를 두고, 업로드는 `curl --aws-sigv4`로 해서 서버에 AWS CLI를 설치하지 않는다. 버킷과 키는 shared-aws-infrastructure가 만든다.
- **매주 복구를 확인한다.** `<DB 이름>-restore-check.timer`(일요일 04:30)가 최신 덤프를 임시 postgres 컨테이너에 복구하고, 덤프할 때 저장한 테이블별 행 수와 비교한다.
