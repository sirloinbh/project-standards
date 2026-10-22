# #60 하위 리포 검사 스크립트(standards-check)

## 변경

| 파일 | 내용 |
|---|---|
| `scripts/standards-check.mjs` | 하위 리포가 중앙 표준과 다른 곳을 찾는다. 관리 파일(전체·구간·필드), 공유 패키지(버전·설치 스크립트·의존성), 레지스트리 값(포트·DB 이름) 세 가지를 본다 |
| `templates/index.json` (`vendor`) | 검사 스크립트와 라이브러리 3개(`manifest`, `hash`, `render`)를 하위 리포의 `.standards/`에 그대로 복사한다. 템플릿 변수 치환은 하지 않는다 |
| `templates/index.json` (`fields`) | 루트 `package.json`에 `standards:check` 스크립트가 있어야 한다 |
| `scripts/lib/manifest.mjs` | manifest 항목에 중앙 원본 경로(`source`)를 기록한다. 실패 메시지가 어디를 고쳐야 하는지 알려 주기 위해서다 |
| `scripts/lib/templates.mjs` | vendor 복사 처리 |
| `scripts/test/standards-check.test.mjs` | 임시 리포를 만들어 정상·위반별로 검사하는 테스트 11개 |

## 검사 내용

- **관리 파일:** 아래 경우에 실패한다.
  - 파일이 없음
  - 내용이 다름 (CRLF는 같은 것으로 본다)
  - `# --- project ---` 위의 중앙 구간이 바뀜, 또는 그 표시 줄이 없어짐
  - `package.json`의 관리 필드가 다름
- **공유 패키지:** 설치되지 않음, 버전이 다름, 설치 스크립트(`preinstall`·`install`·`postinstall`·`prepare`)가 있음, `dependencies`가 비어 있지 않음.
- **레지스트리 값:** 다음 파일의 포트와 DB 이름을 레지스트리 값과 비교한다.
  - `compose.yaml`: 웹·DB·API 포트. `${WEB_PORT:-8101}:80` 형식도 읽는다
  - `frontend/vite.config.ts`: Vite 포트, API 프록시 포트
  - `frontend/nginx.conf`, `backend/Dockerfile`(`EXPOSE`), `backend/src/server.ts`: API 포트
  - `.env.example`: API 포트, DB 포트, DB 이름
  - `playwright.config.ts`: e2e 포트 두 개
  - 파일이 없으면 건너뛴다. 파일은 있는데 패턴을 찾지 못하면 경고만 낸다.
- **경고(실패 아님):** Vite에 `strictPort: true`가 없음.

## 출력과 종료 코드

- 종료 코드는 세 가지다: 0 통과, 1 위반, 2 manifest 없음.
- 위반하면 다음을 한국어로 출력한다.
  - 위반한 파일과 이유, 중앙 원본 경로
  - 중앙 리포에 이슈와 PR을 여는 명령 예시
  - `allowedDifferences` 등록 방법
  - 열린 동기화 PR이 있으면 그것을 먼저 병합하라는 안내

## 검증

- `npm run check`: 테스트 65개 통과, `registry-check: ok`, `docs/projects.md: up to date`
- 복사본 단독 실행: 임시 리포의 `.standards/check.mjs`를 직접 실행해 종료 코드 0·1·2와 메시지를 확인했다.
- 복사되는 4개 파일이 Node 내장 모듈과 서로만 import하는 것을 확인했다.
- 처음 실행에서 테스트 1개가 실패했다. "파일 없음" 메시지에도 중앙 원본 경로가 붙는 것이 맞는데, 테스트의 기대값이 그것을 빠뜨렸기 때문이다. 기대값을 고쳤다.
