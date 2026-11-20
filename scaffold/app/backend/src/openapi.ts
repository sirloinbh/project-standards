// The API's operation table (project-standards #679). The document is built by the managed standard/openapi.ts
// from Zod schemas (z.toJSONSchema), so this file holds only what is specific to the app. `npm run openapi -w backend`
// writes docs/openapi.json; a test fails when it is out of date or when the table and the routes differ.
import { buildOpenApi, type Operation } from './standard/openapi.js';

// Every registered route must appear here exactly once (checked in test/openapi.test.ts). Add a request schema with
// `body: ['CreateItem', createItemSchema]` or `query: querySchema`; guarded routes get 401, 413 and 429 by default.
export const operations: Record<string, Operation> = {
  'GET /api/health': { summary: 'Check the server and database connection', status: [200, 500], public: true },
  'GET /api/me': { summary: 'Show the signed-in user', status: [200, 401, 503] },
};

export const document = buildOpenApi({
  title: '{{project.title}} API',
  description:
    'Dates are YYYY-MM-DD (Asia/Seoul). Every error answer is { error: message }.',
  errorDescription: 'A short message for the user',
  operations,
  statusText: {
    200: 'OK',
    201: 'Created',
    400: 'Invalid input',
    404: 'Not found',
    409: 'Duplicate or conflict',
    401: 'Sign-in required',
    413: 'Request body too large',
    500: 'Server error',
    503: 'Sign-in service unavailable',
    429: 'Too many requests',
  },
});
