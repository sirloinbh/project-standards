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
