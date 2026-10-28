# #312 API·불러오는 중 화면·코드 관례 규칙과 파일 이름 검사

## 변경

| 파일 | 내용 |
|---|---|
| `docs/directory-rules.md` | `PATCH`, 동작 경로 `POST /:id/<동작>`, 삭제 `200`·`204`, "성공 응답 모양"(새 코드는 `{ items }`·`{ item }`), JSON의 ID는 숫자, 검사 경고 목록 |
| `docs/ui-components.md` | "불러오는 중 화면": 목록은 `SkeletonList`·`SkeletonCard`, 버튼은 `Spinner`, 실패는 `Notice` |
| `docs/conventions/code.md` | 새 문서: 앱 8개가 이미 같이 따르던 관례 8개 + 프런트 파일 이름 소문자-하이픈 |
| `scripts/standards-check.mjs` | `checkFileNames`: `frontend/src`의 `.ts`·`.tsx` 이름 경고 |
| `scripts/test/standards-check.test.mjs` | 파일 이름 검사 테스트 |

## 정한 것

- 문서 규칙은 지금 코드를 바꾸지 않는다. workout-memo의 "행 그대로 응답"과 plan-routine의 문자열 ID는 화면을 함께 바꿔야 해서 기존 앱의 예외로 적었다. 새 코드와 새 앱이 규칙을 따른다.
- 파일 이름 검사는 경고만 한다(API 규칙 경고와 같다). 앱 8개 `origin/main` 기준으로 study-log 15개만 걸리고 나머지 7개는 0개다.
- 화면 파일과 로직 파일이 대소문자만 다른 경우(study-log `StudyLogs.tsx`와 `study-logs.ts`)는 소문자로 바꾸면 import가 겹친다. 그래서 로직 파일 이름을 나누라고 문서에 적었다.

## 앱 이슈

| 앱 | 이슈 |
|---|---|
| study-log | sirloinbh/study-log#117 파일 이름 15개, sirloinbh/study-log#118 불러오는 중 표시 |
| workout-memo | sirloinbh/workout-memo#173 불러오는 중 표시 |
| plan-routine | sirloinbh/plan-routine#34 불러오는 중 표시 |

골격 5개 앱은 기능 화면이 없어 이슈를 만들지 않았다.

## 검증

- `node --test scripts/test/standards-check.test.mjs scripts/test/scaffold.test.mjs`: 29개 통과. 스캐폴드와 공통 UI 파일 이름은 모두 규칙에 맞는다
- 앱 8개 `origin/main` 파일 목록에 `checkFileNames`를 돌림: study-log 15개, 나머지 0개
- `npm run check` 결과는 PR에 적는다
