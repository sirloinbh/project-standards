# 코드 관례 (이름, export, 타입, 테스트 위치)

8개 앱이 함께 지키는 코드 모양이다. 대부분은 앱 8개가 이미 같게 쓰고 있던 것을 적었다(2026-10-28 비교: [research/convention-survey.md](../research/convention-survey.md), #243). 이 문서와 다르게 해야 하면 앱에서 바꾸지 말고 중앙 리포에 이슈를 연다.

| 관례 | 규칙 | 검사 |
|---|---|---|
| import 경로 | 상대 경로만 쓴다(`./`, `../`). 경로 별칭(`@/`)은 쓰지 않는다 | — |
| export | 이름 붙은 export만 쓴다. `export default`는 도구 설정 파일(`*.config.*`)에만 쓴다 | ESLint `no-restricted-syntax` (`@sirloinbh/eslint-config` 1.1.0) |
| 컴포넌트 | `export function Name()` 함수 선언으로 쓴다. 화살표 함수 컴포넌트는 쓰지 않는다 | — |
| 타입 | `type`만 쓴다. `interface`는 쓰지 않는다 | ESLint `@typescript-eslint/consistent-type-definitions: type` (1.1.0) |
| import 순서 | `simple-import-sort` 순서. `eslint --fix`가 정렬한다 | ESLint (설치 승인 #245 뒤, #246) |
| 프런트 파일 이름 | 소문자와 하이픈: `study-logs.tsx`, `month-calendar.ts`. 화면 파일도 같다(`StudyLogs.tsx`가 아니라 `study-logs.tsx`) | `standards-check` 경고 |
| 백엔드 테스트 위치 | `backend/test/*.test.ts` (`node:test`, `tsx --test`) | — |
| 프런트 테스트 위치 | 대상 파일 옆 `*.test.ts(x)` (Vitest) | — |
| 브라우저 테스트 | `e2e/*.spec.ts` (Playwright) | — |
| 브랜치·커밋·PR | `<type>/<이슈번호>-<영문-요약>`, `<type>: <무엇을 했는지> (#번호)` | [std-git-writing](../../templates/common/skills/std-git-writing/SKILL.md) |

## 프런트 파일 이름

- 파일 이름은 소문자 영어, 숫자, 하이픈만 쓴다. 점은 종류를 나눌 때만 쓴다: `app.test.tsx`, `vite-env.d.ts`.
- 화면 파일과 그 화면의 로직 파일은 같은 이름에 다른 확장자로 두지 않는다. study-log처럼 `StudyLogs.tsx`(화면)와 `study-logs.ts`(로직)가 대소문자만 다르면 Windows·macOS에서 헷갈린다. 화면은 `study-logs.tsx`, 로직은 `study-logs-data.ts`처럼 이름을 나눈다.
- `standards-check`가 `frontend/src` 아래의 `.ts`·`.tsx` 파일 이름을 보고 경고한다(실패는 아님). study-log의 이름 바꾸기는 study-log 리포 이슈로 한다.

## 바꾸지 않은 것

- 백엔드 폴더 구조(`routes/<기능>.ts`와 `src/<기능>.ts`)는 앱마다 다르게 둔다. 규칙은 [directory-rules.md](../directory-rules.md)에 있고, 새 앱만 따른다(#243 후보 F).
