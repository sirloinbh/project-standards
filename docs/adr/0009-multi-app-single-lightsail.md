# 0009. 앱 8개를 Lightsail 한 대에 앱별 compose로 배포

- 상태: 채택 (이슈 #36)
- 날짜: 2026-10-23

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
