# 서버 배포에서 .env의 패키지 토큰을 빌드에 넘기기 (#217)

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/deploy/remote-deploy.sh.tmpl` | 환경변수 `NODE_AUTH_TOKEN`이 없으면 서버 `.env`에서 읽어 export한다. 따옴표와 CR은 지운다. 값은 출력하지 않는다 |
| `scripts/test/deploy-templates.test.mjs` | `.env` 형식 4가지(일반, 따옴표·CRLF, 토큰 없음, 환경변수 우선)에서 자식 프로세스가 받는 값을 검사 |

## 이유

- workout-memo#143 병합 뒤 서버 자동 배포가 `npm ci`에서 `401 Unauthorized ... authentication token not provided`로 실패했다. 이미지 빌드 단계에서 멈춰 운영은 이전 버전(`c4f9897421cf`)으로 계속 동작했다.
- compose의 빌드 secret(`secrets.npm_token.environment: NODE_AUTH_TOKEN`)은 셸 환경변수에서만 값을 읽는다. 서버 `.env`의 값은 compose 파일 변수 치환에만 쓰이고 secret에는 들어가지 않는다.
- `WEB_PORT`를 이미 같은 방식(`sed`)으로 `.env`에서 읽고 있어서 같은 방식을 따랐다.

## 확인

- `npm run check`: 통과(테스트 412개 중 408개 통과, 4개 건너뜀, 실패 0). 새 테스트는 Windows의 node가 bash를 찾지 못해 건너뛰었고, CI(ubuntu)에서 실행된다.
- Git Bash에서 같은 블록을 4가지 `.env`로 직접 실행해 기대값을 확인했다.
- 실제 서버 배포는 병합 뒤 workout-memo 동기화 PR을 병합해 확인한다.
