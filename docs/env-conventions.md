# 환경변수 규칙 (.env.example)

각 리포의 `.env.example`이 환경변수의 원본이다. 중앙은 이 파일들을 모아 `docs/env-matrix.md`를 만든다(#82). 실제 값이 들어 있는 `.env`는 커밋하지 않는다.

## 구조

`.env.example`은 구간 관리 파일이다. `# --- project ---` 위는 중앙이 관리하는 공통 키이고, 아래는 프로젝트가 자유롭게 쓴다.

```dotenv
# @desc PostgreSQL DB 이름 (레지스트리 db.name) @required @used=compose
POSTGRES_DB=study
# @desc PostgreSQL 사용자 이름 @required @used=compose
POSTGRES_USER=study
# @desc PostgreSQL 비밀번호. 로컬에서 바꿔서 쓴다 @required @secret @used=compose,backend
POSTGRES_PASSWORD=
# @desc API가 접속하는 DB 주소. 포트는 레지스트리 db 포트 @required @secret @used=backend
DATABASE_URL=postgres://study:<password>@localhost:15402/study
# @desc API 포트 (레지스트리 api 포트) @required @used=backend,compose
PORT=3102
# @desc GitHub Packages 읽기 토큰(read:packages). 공유 패키지를 설치할 때만 필요 @secret @used=npm
NODE_AUTH_TOKEN=
# --- project ---
```

## 주석 규칙

키 바로 위 한 줄에 다음 태그를 쓴다.

| 태그 | 뜻 |
|---|---|
| `@desc <설명>` | 무엇에 쓰는 값인지 한국어로. 필수 |
| `@required` | 없으면 앱이 동작하지 않음 |
| `@secret` | 비밀값. 예시 값을 비우거나 `<password>`처럼 자리 표시만 둔다 |
| `@used=<위치>` | 쓰는 곳: `backend`, `frontend`, `compose`, `npm`, `ci` 중 쉼표로 |

## 지켜야 할 것

- `@secret` 키에 실제 값을 쓰지 않는다. `docs/env-matrix.md`에도 값은 나오지 않는다.
- 포트와 DB 이름은 레지스트리 값과 같아야 한다. `standards-check`가 `PORT`, `DATABASE_URL`의 포트와 DB 이름, `POSTGRES_DB`를 비교한다.
- 프런트엔드 빌드에 들어가는 값(`VITE_` 접두어)은 비밀이 아니어야 한다. 브라우저에 그대로 노출된다.
- 새 키를 추가하면 `.env.example`, 사용하는 코드, 배포 runbook(서버 `.env` 키 목록)을 같은 PR에서 고친다.

## 커밋된 비밀값 검사 (#259)

CI가 매번 `secret-scan`으로 커밋 대상 파일에 토큰·키가 있는지 검사한다. 리포가 모두 public이라 한 번 push된 값은 지워도 이미 공개된 것으로 본다.

- 실행: 중앙은 `npm run secrets:check`(`npm run check`에 포함), 하위 리포는 `node .standards/secret-scan.mjs`. CI에서는 의존성 설치 전에 실행한다.
- 막는 것: 모양으로 알아볼 수 있는 토큰·키(GitHub, Anthropic, OpenAI, AWS, npm, Slack, Google, Stripe 운영 키), 개인키 블록, 커밋된 `.env` 파일(`.env.example`·`.sample`·`.template`은 허용).
- 출력에는 파일과 줄 번호, 규칙 이름만 나오고 값은 나오지 않는다.
- 일부러 넣은 가짜 값(테스트)은 그 줄에 `secret-scan:allow` 주석을 붙인다. 테스트에서는 값을 문자열 조각으로 나눠 실행 중에 만드는 편이 낫다(`scripts/test/secret-scan.test.mjs`).
- 이력 검사: `node .standards/secret-scan.mjs --history`는 모든 브랜치의 커밋에서 추가된 줄을 검사한다. CI에서는 쓰지 않고, 처음 도입할 때와 유출이 의심될 때 실행한다.
- 외부 도구(gitleaks 등)를 쓰지 않고 Node 내장 모듈로 만들었다. 새 공급망 위험을 들이지 않고, 오탐이 적은 모양만 검사해서 발견하면 바로 실패시키기 위해서다. 더 넓은 공급자 목록은 GitHub secret scanning이 맡는다([repo-settings.md](repo-settings.md)).
- 발견하면: 진짜 값이면 먼저 그 키를 폐기·교체하고, 커밋에서 지운 뒤 사용자에게 알린다. 이력에서 지우는 일(강제 push)은 사용자가 정한다.

## 공통 키: Claude API (#264)

Claude API를 쓰는 앱은 아래 이름을 쓴다. 키 값의 원본은 AWS SSM Parameter Store `/sirloinbh/anthropic-api-key` 한 곳이다([ADR-0010](adr/0010-claude-api-key-ssm.md)).

| 키 | 태그 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | `@secret @used=backend` | Claude API 키. 서버에서는 배포 스크립트가 SSM에서 읽어 넘기므로 서버 `.env`에 쓰지 않는다. 로컬에서는 중앙 명령이 넣는다 |
| `CLAUDE_MODEL` | `@used=backend` | 모델 이름. 코드에 하드코딩하지 않는다. 기본값은 `claude-sonnet-5-5` |

- 프런트엔드(`VITE_` 접두어)로 Claude API 키를 넘기지 않는다. 브라우저에 노출된다. 호출은 백엔드에서만 한다.
- CI에는 실제 키를 두지 않는다. 테스트는 API 호출을 가짜로 바꾼다.
