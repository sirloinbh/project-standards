# 앱 8개 코드 컨벤션 비교 (#243)

2026-10-28 조사. 앱 8개 리포 `origin/main`의 파일 목록, `frontend/src`·`backend/src` 코드, 앱 고유 스킬(`skills/<앱>-*`)을 `git show`로 읽었다. 코드는 바꾸지 않았다. 채택한 항목은 맨 아래 "결정"에 적고 후속 이슈로 등록한다.

골격만 있는 5개 앱(health-log, life-journal, money-ledger, english-study, dev-career-portfolio)은 스캐폴드 그대로라 서로 같다. 아래 표의 "골격 5개"는 health-log로 확인한 값이다.

## 1. 이미 같은 것 (규칙으로 적기만 하면 됨)

| 항목 | 8개 앱 공통 |
|---|---|
| import 경로 | 상대 경로만 (`./`, `../`). 별칭(`@/`) 0곳 |
| export | 이름 붙은 export만. `export default` 0곳 |
| 컴포넌트 | `export function Name()` 함수 선언. 화살표 함수 컴포넌트 0곳 |
| 타입 | `type`만. `interface` 0곳 |
| 백엔드 테스트 위치 | `backend/test/*.test.ts` (node:test) |
| 프런트 테스트 위치 | 대상 옆 `*.test.tsx` (Vitest) |
| 브라우저 테스트 | `e2e/*.spec.ts` (workout-memo만 있음) |
| 브랜치·커밋 | `<type>/<번호>-<요약>`, `<type>: … (#번호)` (`std-git-writing`) |

## 2. 다른 것

| 항목 | workout-memo | study-log | plan-routine | 골격 5개 |
|---|---|---|---|---|
| 프런트 파일 이름 | 모두 소문자-하이픈 (`body.tsx`, `date-range.ts`) | **섞임**: 화면은 PascalCase 15개(`StudyLogs.tsx`), 그 밖의 모듈은 소문자-하이픈 17개(`study-logs.ts`) | 소문자-하이픈 | 소문자-하이픈 |
| 화면과 로직 나누기 | 화면 파일 + 로직 파일(`progress.tsx`/`progression.ts`) | 화면(`StudyLogs.tsx`) + 같은 이름 로직(`study-logs.ts`) | 한 파일 | — |
| 백엔드 폴더 | `routes/<기능>.ts` + `domain.ts` | `src/<기능>.ts` (평평함) | `src/<기능>.ts` + `<기능>-routes.ts` | `app.ts`만 |
| 타입·스키마 위치 | `shared/contract.ts`(화면·서버 공유) + `domain.ts` | 기능 파일 안 | 기능 파일 안 | — |
| 프런트 테스트 수 (공통 컴포넌트 제외) | 19 | 1 (`app.test.tsx`, 화면 16개) | 2 | 1 |

## 3. 앱 고유 스킬

앱마다 `<앱>-foundation`, `<앱>-implementation`, `<앱>-testing` 스킬이 있다(workout-memo는 `workout-communication` 하나 더).

- **중앙 스킬과 겹친다.** `<앱>-implementation`의 계정 확인·이슈 등록·브랜치 규칙은 중앙 `std-implementation`·`std-git-writing`과 같은 내용이다. 세 앱의 문장이 앱 이름만 다르다.
- **사실과 다른 줄이 있다.**
  - study-log·plan-routine `*-testing`: "아직 도입하지 않은 Vitest·Playwright". 지금은 8개 앱 모두 Vitest·Testing Library가 설치돼 있다(#240).
  - study-log·plan-routine `*-foundation`: "디자인 토큰(`frontend/src/style.css`의 CSS 변수)". 지금 원본은 `@sirloinbh/design-tokens` 패키지다(#126).
- **다른 앱에도 맞는 규칙:**
  - workout-memo `workout-testing`의 화면 공통 검사(반응형 4폭, axe WCAG 2.1 AA, 시각 회귀)
  - workout-memo `workout-communication`의 "사용자에게는 한국어, 식별자·로그는 원문" 규칙

## 4. 채택 후보

| # | 후보 | 방식 | 판단 |
|---|---|---|---|
| A | 1장의 공통 관례를 규칙 문서로 적기 (`docs/conventions/code.md`) | 규칙 문서. 대부분 새 패키지 없이 ESLint로 검사할 수 있다: `no-restricted-syntax`(`ExportDefaultDeclaration` 금지, 설정 파일 제외), `@typescript-eslint/consistent-type-definitions: type`. import 순서는 #244 `simple-import-sort` | **권장** |
| B | 프런트 파일 이름은 소문자-하이픈 | 규칙 문서 + 검사(`standards-check` 경고). study-log 15개 이름 바꾸기는 study-log 이슈 | **권장** |
| C | 앱 스킬에서 중앙 스킬과 겹치는 줄을 지우고, 사실과 다른 줄 고치기 | 앱 리포 이슈 3개(또는 동기화 PR). 앱 스킬에는 앱 고유 사실(도메인, 단위, 화면 검사 대상)만 남긴다 | **권장** |
| D | 의사소통 규칙(`workout-communication`)을 중앙 스킬로 | `templates/common/skills/`에 `std-communication` 추가 | **권장** |
| E | 화면 공통 검사(반응형·axe·시각 회귀)를 다른 앱에 퍼뜨리기 | Playwright 설치가 필요해 #245 뒤. 화면이 있는 study-log·plan-routine부터 | 보류 |
| F | 백엔드 폴더 구조를 `routes/<기능>.ts`로 맞추기 | — | 하지 않음. 규칙(`directory-rules.md`)은 이미 있고, 옮기는 비용에 비해 얻는 것이 적다. 새 앱만 따른다 |
| G | study-log 프런트 테스트 보강 | study-log 이슈 | 권장하지만 이 조사 범위 밖. 결정 때 함께 등록 |

## 결정

- (사용자 확인 전)
