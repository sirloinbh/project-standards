# 의존성 정책

npm 공급망 공격(Shai-Hulud 계열)이 진행 중이므로 의존성은 최소로, 고정 버전으로, 검증한 뒤에만 들인다.

## 메이저 버전 통일표

workout-memo `package-lock.json`의 설치 버전 기준(2026-10-22)이다. 앱마다 메이저 버전을 이 표와 맞춘다.

| 패키지 | 메이저 | 설치 버전 | 비고 |
|---|---|---|---|
| node | 24 | 24.21.0 | `versions.json` |
| npm | 11 | 11.19.0 | `versions.json` |
| react, react-dom | 19 | 19.3.0 | |
| react-router | 8 | 8.4.0 | workout-memo |
| @tanstack/react-query | 5 | 5.104.1 | workout-memo |
| react-hook-form | 7 | 7.89.0 | workout-memo |
| vite | 6 | 6.4.4 | |
| typescript | 5 | 5.9.3 | `@sirloinbh/tsconfig` peer |
| express | 5 | 5.3.0 | |
| pg | 8 | 8.23.1 | |
| zod | 3 | 3.25.76 | |
| tailwindcss, @tailwindcss/vite | 4 | 4.3.3 | ADR-0007 |
| eslint | 10 | 10.12.0 | `@sirloinbh/eslint-config` peer |
| prettier | 3 | 3.9.10 | `@sirloinbh/prettier-config` peer |
| vitest | 5 | 5.0.3 | workout-memo |
| @playwright/test | 1 | 1.63.0 | workout-memo |
| lucide-react | 0 | 0.468.0 | 1.x 검토는 #137 |
| PostgreSQL | 17 | postgres:17-alpine | `versions.json` |

## 버전 쓰는 법

- `package.json`의 모든 의존성은 정확한 버전으로 쓴다(`^`, `~` 금지). `.npmrc`의 `save-exact=true`가 새로 설치할 때 이렇게 만든다. 기존 범위 버전은 첫 동기화 때 설치된 버전으로 고정된다(#63).
- 설치는 항상 `--ignore-scripts`로 한다. `.npmrc`의 `ignore-scripts=true`가 이를 강제한다.

## 새 외부 패키지·도구 도입 절차

1. 중앙 리포(또는 해당 앱 리포)에 이슈를 열고, 왜 필요한지와 대안을 적는다.
2. 읽기 전용 명령으로 조사한다: `npm view <패키지>@<버전> version time license repository.url maintainers scripts dependencies`.
3. 다음 조건을 모두 만족하는 버전을 고른다.
   - 정확한 버전
   - 릴리스 후 14일 경과
   - 설치 스크립트(`preinstall`·`install`·`postinstall`·`prepare`)가 없거나, 있으면 이유를 확인함
   - 게시자와 저장소가 공식 프로젝트와 일치
4. 필요하면 socket.dev, Snyk Advisor, deps.dev로 사전 검증한다.
5. 조사 결과를 이슈에 표로 남기고 **사용자 승인**을 받는다. 승인 없이 `npm install`, `npx`, `pnpm/yarn/bun install`을 실행하지 않는다.
6. `npm install --ignore-scripts <패키지>@<버전>`으로 설치하고, lockfile 변경과 `ioc-scan` 결과를 PR에 적는다.

예외: 자체 패키지(`@sirloinbh/*`)는 14일 규칙 대신 출처 확인으로 검증한다([ADR-0004](adr/0004-own-packages-provenance-instead-of-14-days.md)). 자체 패키지의 외부 peerDependencies는 위 절차를 그대로 따른다.

## 자동 업데이트

- Dependabot은 **보안 업데이트만** 쓴다. 버전 업 PR은 끈다(`open-pull-requests-limit: 0`, 템플릿 `.github/dependabot.yml`).
- 보안 업데이트는 리포 설정에서 켠다(#22). Dependabot이 연 보안 PR도 위 조건을 확인한 뒤 사용자가 병합한다.
- 버전 업은 중앙 리포의 동기화 PR로만 한다.

## 정기 점검

- CI가 매번 `ioc-scan`으로 lockfile·설치 스크립트·워크플로를 점검한다(#76).
- 준수 현황(#82)에 리포별 `npm audit` 결과를 모은다.
