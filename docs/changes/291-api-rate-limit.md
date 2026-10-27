# #291 앱 백엔드 API에 요청 횟수 제한

## 방식

| 후보 | 판단 |
|---|---|
| `express-rate-limit` 패키지 | 앱마다 설치 승인과 백엔드 코드 수정이 필요하다 |
| 스캐폴드에 직접 만든 미들웨어 | 설치는 없지만 앱 8개의 백엔드 코드를 따로 고쳐야 한다 (스캐폴드는 동기화 대상이 아님) |
| **nginx `limit_req` (채택)** | `frontend/nginx.conf`가 이미 중앙 관리 파일이라 동기화 한 번으로 앱 8개에 들어간다. 설치·앱 코드 수정 없음. 모든 `/api/` 요청이 이 nginx를 지난다 |

한도: 클라이언트 IP마다 초당 평균 10개, 한 번에 40개까지(burst, nodelay), 넘으면 429. 1인 사용 앱에서 화면 하나가 API 몇 개를 동시에 부르는 정도는 걸리지 않는다. 정적 파일에는 제한을 두지 않는다.

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/frontend/nginx.conf.tmpl` | `limit_req_zone`(server 블록 밖, http 블록 안에서 읽힘), `/api/`에 `limit_req`와 `limit_req_status 429` |
| `scripts/test/docker.test.mjs` | 구역 위치, `/api/`에만 제한, 429 |
| `docs/runbooks/deploy.md` | 4-2 API 요청 횟수 제한, 리버스 프록시 도입 때 `real_ip` 주의 |

## 검증

- 실제 nginx(`nginx:1.27-alpine`)로 확인: `nginx -t` 통과. 가짜 API 앞에서 60번 연속 요청 → 200이 42번, 429가 18번.
- `node --test scripts/test/docker.test.mjs`: 4개 통과

## CodeQL 알림

CodeQL `js/missing-rate-limiting`은 Express 코드 안의 제한만 인식하므로, nginx 제한으로는 알림이 닫히지 않는다. 중앙 스캐폴드 알림은 이유를 적어 닫는다. 앱 리포 알림 71개를 닫는 일은 사용자 확인 뒤에 한다.
- `npm run check`: 테스트 464개 중 463개 통과, 1개 건너뜀, 실패 0
