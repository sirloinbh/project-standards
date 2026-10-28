# #241 앱 8개 백엔드 API 형태 비교

조사 결과와 공통화 후보는 [docs/research/api-survey.md](../research/api-survey.md)에 있다. 코드는 바꾸지 않았다.

## 확인한 방법

- 앱 8개 리포를 `git fetch` 한 뒤 `origin/main`의 `backend/src/**/*.ts`를 `git show`로 읽었다.
- 응답 모양·삭제 상태 코드·ID 처리는 파일 전체에서 패턴(`status(204)`, `rowCount ? 200 : 404`, `id::text`, `z.coerce.number()`)을 세고, 걸린 곳을 직접 읽어 확인했다.
- 기준은 [directory-rules.md "API (Express)"](../directory-rules.md#api-express)와 스캐폴드 `scaffold/app/backend`다.
