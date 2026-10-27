# #259 CI에서 커밋된 토큰·키를 찾는 비밀값 유출 검사

## 결정

외부 도구(gitleaks 등) 대신 Node 내장 모듈만 쓰는 `scripts/secret-scan.mjs`를 만들었다. `ioc-scan.mjs`와 같은 방식으로 하위 리포에 `.standards/secret-scan.mjs`로 복사한다.

- 새 바이너리·Action을 들이지 않아 공급망 위험과 버전 고정 부담이 없다.
- 오탐이 적은 모양(접두어가 정해진 토큰·키, 개인키 블록, 커밋된 `.env`)만 검사해서 발견하면 바로 실패시킨다.
- 더 넓은 공급자 목록은 GitHub secret scanning이 맡는다(#260, #261).

## 변경

| 파일 | 내용 |
|---|---|
| `scripts/secret-scan.mjs` | 커밋 대상 파일(git이면 `git ls-files`) 검사, `--history`로 모든 브랜치 이력 검사. 값은 출력하지 않음. `secret-scan:allow` 줄 예외 |
| `scripts/test/secret-scan.test.mjs` | 규칙 11개, 오탐 예, 예외 표시, `.env`, 추적 파일만 검사, 이력 검사, 종료 코드, CI 연결 확인 (8개) |
| `templates/index.json`, `scripts/test/fixtures/sync-snapshot.json` | 앱·인프라 리포가 `.standards/secret-scan.mjs`를 받음 |
| `.github/workflows/ci.yml`, `reusable-app-ci.yml`, `reusable-infra-ci.yml` | 의존성 설치 전에 검사 |
| `package.json` | `secrets:check`를 `npm run check`에 추가 |
| `docs/env-conventions.md` | "커밋된 비밀값 검사" 절 |

## 리포 11개 이력 검사 (2026-10-27)

`git clone --mirror`로 받은 리포 11개(project-standards, shared-aws-infrastructure, 앱 8개, file-control)의 모든 브랜치 이력을 `scanHistory`로 검사했다. **발견 0건.** subtree 배포 리포(`*-frontend`, `*-backend`, `*-db`)는 우산 리포 이력의 일부라 따로 검사하지 않았다.

## 검증

- `node --test scripts/test/secret-scan.test.mjs`: 8개 통과
- `UPDATE_SNAPSHOT=1 npm test`: 423개 중 422개 통과, 1개 건너뜀, 실패 0
- `npm run check`: 아래 PR 본문 참고
