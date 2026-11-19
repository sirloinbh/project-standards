// The API's operation table (project-standards #679). The document is built by the managed standard/openapi.ts
// from Zod schemas (z.toJSONSchema), so this file holds only what is specific to the app. `npm run openapi -w backend`
// writes docs/openapi.json; a test fails when it is out of date or when the table and the routes differ.
import { buildOpenApi, type Operation } from './standard/openapi.js';

// Every registered route must appear here exactly once (checked in test/openapi.test.ts). Add a request schema with
// `body: ['CreateItem', createItemSchema]` or `query: querySchema`; guarded routes get 401, 413 and 429 by default.
export const operations: Record<string, Operation> = {
  'GET /api/health': { summary: '서버와 DB 연결 상태 확인', status: [200, 500], public: true },
  'GET /api/me': { summary: '로그인한 사용자 확인', status: [200, 401, 503] },
};

export const document = buildOpenApi({
  title: '{{project.title}} API',
  description:
    '날짜는 YYYY-MM-DD(Asia/Seoul). 오류 응답은 모두 { error: 한국어 메시지 }입니다.',
  errorDescription: '한국어 오류 메시지',
  operations,
  statusText: {
    200: '성공',
    201: '생성됨',
    400: '입력 검증 실패',
    404: '대상 없음',
    409: '중복 또는 충돌',
    401: '로그인이 필요함',
    413: '요청 크기 한도 초과',
    500: '서버 오류',
    503: '로그인 서비스를 사용할 수 없음',
    429: '요청이 너무 많음',
  },
});
