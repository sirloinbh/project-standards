# 기술 스택

8개 앱이 쓸 수 있는 기술(허용 목록)과 신규 프로젝트의 기본 구성이다. 근거는 workout-memo의 현재 구현이다. 버전은 [versions.json](../versions.json)과 [dependency-policy.md](dependency-policy.md)가 원본이다.

## 허용 목록

| 영역 | 기술 | 상태 | 근거 |
|---|---|---|---|
| 런타임 | Node.js 24, npm 11, npm workspaces | 8개 앱 사용 중 | 각 리포 `.nvmrc`, `packageManager` |
| 프런트엔드 | React 19, Vite, TypeScript | 8개 앱 사용 중 | `frontend/package.json` |
| 라우팅 | React Router (`BrowserRouter`, `NavLink`) | workout-memo | `frontend/src/app.tsx` |
| 서버 상태 | TanStack Query | workout-memo | `frontend/package.json` |
| 폼 | React Hook Form + `@hookform/resolvers` + Zod | workout-memo | `frontend/package.json` |
| 스타일 | Tailwind CSS 4 + `@sirloinbh/design-tokens` | workout-memo, 나머지는 #126 | [design-system.md](design-system.md) |
| UI 컴포넌트 | shadcn/ui (소스 직접 소유), Radix UI | 결정됨 (ADR-0007) | [ADR-0007](adr/0007-shadcn-ui-icons-emoji.md) |
| 아이콘·이모지 | lucide-react, Fluent Emoji Flat | 결정됨 (ADR-0007) | 같은 ADR |
| 백엔드 | Express 5, pg, Zod | 8개 앱 사용 중 | `backend/package.json` |
| DB | PostgreSQL 17 | 8개 앱 사용 중 | `compose.yaml` |
| 실행 환경 | Docker Compose, nginx | 8개 앱 사용 중 | `compose.yaml`, `frontend/nginx.conf` |
| 테스트 | node:test(백엔드), Vitest + Testing Library(화면), Playwright(브라우저) | workout-memo | workout-memo `AGENTS.md` 검증 명령 |
| CI | GitHub Actions, 중앙 공통 CI | 중앙 리포 | [reusable-app-ci.yml](../.github/workflows/reusable-app-ci.yml) |
| 인프라 | Terraform, AWS Lightsail | shared-aws-infrastructure | ADR-0005 |

이 목록에 없는 라이브러리·도구를 도입하려면 중앙 리포에 이슈를 열고 [dependency-policy.md](dependency-policy.md)의 도입 절차를 따른다.

## 신규 프로젝트 기본 구성

- 위 표의 기술을 모두 쓴다. 표준 스캐폴드(`scaffold/app`, #85)가 이 구성으로 만든다.
- 디렉토리와 URL은 [directory-rules.md](directory-rules.md)를 따른다.
- 포트·DB 이름은 레지스트리 슬롯 공식으로 정한다(README "새 프로젝트 추가").

## 메이저 업그레이드 절차

1. 중앙 리포에 이슈를 연다. 변경 내역(공식 릴리스 노트)과 영향을 받는 코드를 정리한다.
2. 새 버전이 릴리스 후 14일이 지났는지 확인한다.
3. 필요하면 ADR을 쓰고 [dependency-policy.md](dependency-policy.md)의 버전 표를 고친다. 공유 패키지의 peerDependencies도 함께 고친다.
4. workout-memo에 먼저 적용해 CI·e2e·화면 확인을 통과시킨다.
5. 나머지 앱은 동기화 PR 또는 리포별 PR로 적용한다. 앱 리포 PR의 병합은 사용자가 한다.
