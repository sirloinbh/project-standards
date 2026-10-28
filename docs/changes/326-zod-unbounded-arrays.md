# #326 zod 보안 권고 대응: 길이 제한 없는 배열 막기와 검사

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/backend/src/standard/http.ts` | zod 이슈 메시지를 앞 10개(`MAX_ISSUES`)와 "외 N개"만 응답 |
| `scripts/standards-check.mjs` | `checkZodArrays`: 길이 제한 없는 `z.array`·`.array()` 경고 |
| `scripts/test/backend-http.test.mjs`, `scripts/test/standards-check.test.mjs` | 테스트 |
| `docs/research/zod4.md` | 결정 |
| `docs/directory-rules.md` | 검사 경고 목록, 400 응답 설명 |

## 정한 것

- 사용자가 #307 후보 A를 골랐다. zod는 3.25.76에 머물고, 공격 경로(길이 제한 없는 배열)를 막는다.
- 응답 메시지를 줄여도 메모리 문제가 사라지지는 않는다. 이슈는 zod 안에서 이미 쌓인 뒤이기 때문이다. 실제 대책은 배열에 `.max()`를 붙이는 것이고, 메시지 제한은 수 MB 응답을 막는 보조 장치다.
- 검사는 경고만 한다(API 규칙 경고와 같다). 여러 줄에 걸친 체인도 괄호를 따라가며 `.max()`·`.length()`를 찾는다. zod를 import하지 않는 파일은 읽지 않는다.
- study-log `backend/src/textbook-contents.ts`의 `ids`는 study-log PR로 고친다.

## 검증

- `node --test scripts/test/backend-http.test.mjs`: 8개 통과 (이슈 5만 개 → 메시지 10개 + "외 49990개")
- `node --test scripts/test/standards-check.test.mjs scripts/test/scaffold.test.mjs`: 30개 통과
- 앱 8개 `origin/main`의 `backend/src`에 `checkZodArrays`: study-log `textbook-contents.ts:54` 1곳만 경고
- 관리 파일을 workout-memo의 TypeScript로 타입 검사, 같은 앱의 ESLint·Prettier로 검사: 문제 없음
