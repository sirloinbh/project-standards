import type { Pool } from 'pg';

export type Db = Pick<Pool, 'query'>;

// Every error leaves the API in one shape: `{ error: string }` with a Korean message
// (docs/directory-rules.md "API" in sirloinbh/project-standards). The error handler, the JSON 404 and the
// id and date helpers are the central file standard/http.ts (#309). Handlers answer 404 for a missing
// target with `throw new HttpError(404, '…을(를) 찾을 수 없습니다')` and read path ids with `parseId`.
export {
  errorHandler,
  HttpError,
  notFound,
  parseId,
  sendError,
  serviceDate,
} from '../standard/http.js';
