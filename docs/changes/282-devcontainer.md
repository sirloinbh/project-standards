# #282 새 PC용 Dev Container 설정 템플릿

## 변경

| 파일 | 내용 |
|---|---|
| `templates/devcontainer/.devcontainer/devcontainer.json.tmpl` | 앱 `compose.yaml` + `.devcontainer/compose.yaml`, `db`·`dev`만 실행, 작업 폴더, vite·api 포트 전달, 권장 확장. 자동 설치 명령 없음 |
| `templates/devcontainer/.devcontainer/compose.yaml.tmpl` | `dev` 서비스: 고정 Node 이미지, 리포 마운트, `DATABASE_URL`을 `db:5432`로, db health 대기 |
| `versions.json`, `versions.schema.json` | `images.devcontainerNode` = `node:24.21.0-bookworm@sha256:3d27e5c1…` (다중 아키텍처 index digest) |
| `sync.config.json`, `registry/projects.schema.json`, `registry/projects.json` | 기능 템플릿 `devcontainer`, `features.devcontainer` (workout-memo만 `true`) |
| `scripts/test/devcontainer.test.mjs`, `scripts/test/scaffold.test.mjs` | 받는 앱, 설정 값, 이미지 고정, 자동 설치 없음, `docker compose config` 병합 (5개) |
| `templates/app/.prettierignore.tmpl` | `.devcontainer/`를 관리 파일 구간에 추가 (앱 포맷 검사에서 제외) |
| `docs/tools.md` | 쓰는 법과 제약 |

## 확인

- `node --test scripts/test/devcontainer.test.mjs`: 5개 통과. 이 PC의 Docker 28.3.2로 앱 compose와 병합한 `docker compose config`를 확인했다.
- `docker run --rm <고정 이미지>`: Node v24.21.0, npm 11.19.0, git 2.39.5, 사용자 `node`(uid 1000). npm이 이미 `versions.json` 버전이라 전역 npm 설치 단계는 넣지 않았다.
- 실제로 VS Code에서 "Reopen in Container"로 workout-memo를 열어 `npm run check`를 돌리는 일은 동기화 PR 반영 뒤 사용자 PC에서 확인한다(이슈 완료 기준).
- `npm run check`: 테스트 456개 중 455개 통과, 1개 건너뜀, 실패 0
