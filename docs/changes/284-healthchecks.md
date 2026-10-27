# #284 서버 timer로 앱 health·백업·자동 배포 결과를 healthchecks.io에 알리기

## 결정 (#257, 사용자 2026-10-27)

방화벽이 허용 IP에서만 열려 있어 바깥 감시가 서버에 들어올 수 없다. 서버가 healthchecks.io로 신호를 보내고, 신호가 끊기거나 실패 신호가 오면 메일이 온다. 서버가 멈춰도 신호가 끊기므로 알 수 있다.

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/deploy/notify.sh.tmpl` | `ping <check> ok\|fail [message]`(본문 10 KB까지, 재시도 3회, 실패해도 호출한 쪽은 그대로), `health`(`/api/health` 확인 후 신호). 체크 5종 health·deploy·backup·restore·report, 주소는 서버 `.env`의 `HEALTHCHECK_URL_*`. 주소는 출력하지 않음 |
| `templates/app/deploy/health.{service,timer}.tmpl` | 5분마다 `notify.sh health` |
| `templates/app/deploy/backup.sh.tmpl` | 종료 처리 하나로 복구 확인 컨테이너 정리와 신호를 함께. 매일 덤프 → backup, 복구 확인 → restore. 배포 전 덤프는 신호 없음 |
| `templates/app/deploy/autodeploy.sh.tmpl` | 판단하는 실행마다 deploy 신호: 최신·CI 대기·배포 성공은 ok, CI 실패·배포 실패·실패한 커밋 대기는 fail |
| `templates/app/deploy/install-backup.sh.tmpl` | health timer도 설치 |
| `scripts/test/deploy-templates.test.mjs`, 스냅샷 | 가짜 curl·notify로 신호 주소·본문·`/fail`·주소 비노출·체크 이름 검사, 백업·복구 신호, 자동 배포 신호 지점 |
| `docs/runbooks/deploy.md`, `docs/user-steps.md` | `.env` 키, 체크별 주기·유예 표, 사용자 단계 11 |

## 제약

- healthchecks.io 무료 플랜은 체크 20개다. 앱 8개 × 5개(40개)는 넘으므로 운영 중인 앱부터 만든다.
- 실제 신호는 사용자가 계정·체크를 만들고(#286) 서버에 반영된 뒤 확인한다.

## 검증

- `node --test scripts/test/deploy-templates.test.mjs`: 20개 중 19개 통과, 1개 건너뜀(python3 없음, 기존 테스트)
- `npm run check`: 테스트 460개 중 459개 통과, 1개 건너뜀, 실패 0
