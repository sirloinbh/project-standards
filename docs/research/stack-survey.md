# 앱 8개 의존성·기술 스택 비교 (#240)

2026-10-28 조사. 앱 8개 리포의 `origin/main`에서 `package.json` 3개(루트·`frontend/`·`backend/`)와 lockfile 3개를 읽어 비교했다. 아무것도 설치하지 않았다. 채택한 후보는 맨 아래 "결정"에 적고 구현 이슈로 등록한다.

## 1. 직접 의존성: 이미 같다

앱 8개가 직접 적은 의존성은 52종이다. **8개 앱 모두가 쓰는 41종은 버전까지 모두 같다.** 스캐폴드(#85)와 동기화 PR(#63)이 같은 버전으로 만들었기 때문이다. 같은 목적에 다른 라이브러리를 쓰는 경우도 없다.

| 묶음 | 패키지 (8개 앱 공통, 버전 같음) |
|---|---|
| 프런트 | react·react-dom 19.3.0, react-router 8.4.0, vite 6.4.4, tailwindcss·@tailwindcss/vite 4.3.3, radix-ui 1.7.0, lucide-react 1.52.0, sonner 2.0.8, vaul 1.1.2, class-variance-authority 0.7.1, clsx 2.1.1, tailwind-merge 3.7.0, tw-animate-css 1.4.0, @sirloinbh/design-tokens 1.0.0 |
| 프런트 테스트 | vitest 5.0.3, jsdom 30.1.2, @testing-library/react 16.3.3·dom 10.4.2·jest-dom 7.0.1 |
| 백엔드 | express 5.3.0, pg 8.23.1, zod 3.25.76, tsx 4.23.15, @types/express·node·pg |
| 루트 도구 | eslint 10.12.0, @eslint/js, typescript-eslint 8.71.2, eslint-plugin-react-hooks, eslint-config-prettier, globals, prettier 3.9.10, concurrently 9.2.5, @sirloinbh/eslint-config·prettier-config·tsconfig 1.0.0, typescript 5.9.3 |

한 앱만 쓰는 의존성은 11종이다. 앱 기능에 따른 것이라 공통화할 대상이 아니다.

| 앱 | 패키지 |
|---|---|
| workout-memo | @tanstack/react-query, react-hook-form, @hookform/resolvers, zod(프런트), tesseract.js, @playwright/test, @axe-core/playwright, @testing-library/user-event |
| study-log | @anthropic-ai/sdk(백엔드), react-markdown, recharts, pdfjs-dist |

참고: file-control(레지스트리 밖)은 의존성이 하나도 없는 Node CLI다(`engines.node: >=22`). 비교 대상에서 뺐다.

**문제:** 지금은 같지만, 같게 유지하는 검사가 없다. 버전 원본은 문서 표(`docs/dependency-policy.md`)뿐이라 기계가 읽을 수 없다. 그 표도 이미 낡았다. 예를 들어 "lucide-react 앱 설치본은 아직 0.468.0"이라고 적혀 있지만, 지금은 8개 앱 모두 1.52.0이다.

## 2. lockfile: 프로덕션 빌드가 쓰는 파일이 따로 있다

앱마다 lockfile이 3개다.

- 루트 `package-lock.json`: npm workspaces 전체. 로컬 개발과 CI가 쓴다.
- `frontend/package-lock.json`, `backend/package-lock.json`: Docker 빌드가 `frontend/`, `backend/` 폴더만 보고 `npm ci`로 쓴다. 즉 **운영 이미지는 하위 lockfile로 설치된다.**

루트 lockfile과 하위 lockfile의 설치 버전을 비교했다. 패키지 위치 차이로 생긴 값(esbuild, ansi-styles, lru-cache)은 뺐다.

| 앱 | frontend 다른 버전 | backend 다른 버전 |
|---|---:|---:|
| workout-memo | 7개 (undici 8.11.2→8.12.3, @babel/runtime, tldts 등 패치) | 0 |
| 나머지 7개 | 0 | 0 |

- workout-memo는 루트만 업데이트되고 `frontend/package-lock.json`이 따라가지 않았다. 그래서 CI가 테스트한 버전과 운영 이미지 버전이 다르다.
- Dependabot도 lockfile마다 따로 PR을 연다(아래 3장의 `/backend`, `/frontend` 표시). 같은 업데이트가 두 번 열린다.

## 3. 열린 의존성 PR (2026-10-28, `node tools/dependency-prs.mjs list`)

| 패키지 | 변경 | 종류 | PR 수 | 비고 |
|---|---|---|---:|---|
| body-parser | 2.3.0 → 2.4.0 | 마이너 (보안) | 16 | express의 하위 의존성. 앱마다 루트·backend 2개씩 |
| zod | 3.25.76 → 4.6.6/4.6.7 | 메이저 | 17 | API가 바뀌는 메이저. 정책상 14일·이슈·workout-memo 선행 절차 필요 |
| undici | 8.11.2 → 8.12.3 | 마이너 | 1 | workout-memo `/frontend`만. 2장 차이와 같은 것 |

이 PR들은 묶음 설정(#274)이 동기화되기 전에 열린 것이다.

## 4. 공통화 후보

| # | 후보 | 방식 | 효과 | 판단 |
|---|---|---|---|---|
| A | 공통 의존성 41종 버전을 기계가 읽는 원본으로 옮기고 검사하기 | `versions.json`에 `dependencies` 항목 추가 + `standards-check`가 앱 `package.json`과 비교 | 앱 하나만 버전이 달라지면 CI가 잡는다. 문서 표는 생성물로 바꾼다 | **권장** |
| B | 하위 lockfile이 루트 lockfile과 같은지 검사하기 | `standards-check`에 비교 추가(패키지 위치 차이는 무시) | 운영 이미지와 CI 버전 불일치를 잡는다 | **권장** |
| C | 하위 lockfile을 루트에서 만들어 맞추는 명령 | 중앙 도구가 루트 lockfile에서 workspace 부분만 뽑아 쓰기 | 2장 drift를 고치는 방법. 설치 없이 파일만 다시 씀 | B와 함께 권장. 어렵다면 B만 하고 drift는 사용자가 `npm install`로 고친다 |
| D | body-parser 2.4.0을 중앙에서 한 번에 올리고 Dependabot PR 16개 닫기 | lockfile만 바뀜(사용자가 설치 실행) | 보안 업데이트 16개를 PR 8개로 줄인다 | **권장** (사용자 단계 포함) |
| E | zod 4 이전 여부 정하기 | 메이저 업그레이드 절차(`docs/stack.md`) | PR 17개를 닫을지, 이전할지 | **결정 필요.** 권장: 지금은 3에 머물고 zod PR 17개를 사유를 적어 닫는다. 이전은 별도 이슈 |
| F | 한 앱만 쓰는 라이브러리를 공통 권장 목록에 올리기 | 문서만(`docs/stack.md`) | 새 앱이 같은 목적에 같은 라이브러리를 고른다 | 이미 대부분 표에 있음. 표의 낡은 "사용 중" 칸만 고친다(이 PR에서 함) |

## 결정

- 2026-10-28 사용자가 4장 권장안을 채택했다.
- A: #304
- B·C: #303
- D: #305 (사용자가 Dependabot PR 병합)
- E: zod 3 유지와 열린 zod 4 PR 닫기는 #306. 이전 여부는 #307에서 따로 정한다.
- F: 하지 않음 (낡은 문서 칸은 #298에서 고침)
