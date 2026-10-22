# #6 Docker 빌드 파일 템플릿 (Dockerfile 2종, nginx, compose 검사)

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/frontend/Dockerfile.tmpl` | 8개 앱의 현재 파일 기준 |
| `templates/app/backend/Dockerfile.tmpl` | 같음. `EXPOSE`는 레지스트리 API 포트 |
| `templates/app/frontend/nginx.conf.tmpl` | 8개 앱의 현재 파일과 같음. `proxy_pass`만 레지스트리 API 포트 |
| `scripts/standards-check.mjs` | Dockerfile을 중앙에서 관리하는 리포는 `compose.yaml`도 검사한다. 모든 `build`가 `secrets: [npm_token]`을 넘기는지, 최상위 `secrets.npm_token.environment: NODE_AUTH_TOKEN`이 있는지 본다 |
| `docs/design.md` 5.1 | 분류표에서 Dockerfile 2종과 nginx.conf를 프로젝트 고유에서 B안 전체 관리로 옮기고, 주입 변수표를 추가했다 |
| `scripts/test/docker.test.mjs`, `standards-check.test.mjs`, 스냅샷 | 렌더링 결과, 토큰 전달 방식, compose 검사. 하위 리포 파일 목록에 앱마다 3개 추가 |

## 현재 파일과 다른 점 (의도한 변경)

- **토큰 전달:** `npm ci`는 BuildKit secret(`npm_token`)으로만 토큰을 받는다. ARG·ENV로 넘기지 않으므로 이미지 레이어에 토큰이 남지 않는다. 테스트가 ARG·ENV 줄이 없음을 확인한다.
- **설치 옵션:** `npm install --global npm@…`, `npm ci`, `npm prune`에 모두 `--ignore-scripts`를 붙였다.
- **`.npmrc` 복사:** `COPY package*.json .npmrc ./`로 `.npmrc`를 함께 복사한다. 패키지 레지스트리 설정이 `npm ci` 전에 있어야 하기 때문이다.
- **secret이 없을 때:** 로컬 `docker compose build`처럼 secret이 없으면 토큰은 빈 값이 된다. 공유 패키지가 아직 없는 동안은 그래도 빌드된다.
- `# syntax=` 지시어는 쓰지 않았다. Docker Hub에서 빌더 이미지를 따로 내려받기 때문이다. `RUN --mount`는 기본 BuildKit에서 동작한다.

## 검증

- `npm run check`: 테스트 123개 통과, `check-workflows: ok (8 files)`
- 하위 리포의 실제 Docker 빌드는 첫 동기화(#97)의 CI `docker-build` 작업에서 확인한다(`--secret id=npm_token,env=NODE_AUTH_TOKEN`).
