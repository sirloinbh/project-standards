import type express from 'express';
import type { Pool } from 'pg';
import { ZodError } from 'zod';
import type { ApiError } from '../contract.js';

export type Db = Pick<Pool, 'query'>;

// Every error leaves the API in one shape: `{ error: string }` with a Korean message
// (docs/directory-rules.md "API" in sirloinbh/project-standards). Handlers answer 404 for a
// missing target themselves: `res.status(404).json({ error: '…을(를) 찾을 수 없습니다' })`.
function send(res: express.Response, status: number, error: string) {
  res.status(status).json({ error } satisfies ApiError);
}

// Registered after every feature route: an unknown /api path is a JSON 404, not Express's HTML page.
export function notFound(_req: express.Request, res: express.Response) {
  send(res, 404, '요청한 API를 찾을 수 없습니다');
}

export function errorHandler(
  err: unknown,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction,
) {
  if (err instanceof ZodError) {
    send(res, 400, err.issues.map((x) => x.message).join(', '));
    return;
  }
  const error =
    typeof err === 'object' && err !== null
      ? (err as { code?: unknown; type?: unknown; status?: unknown; message?: unknown })
      : {};
  // express.json() rejects malformed or oversized bodies before any route runs.
  if (error.type === 'entity.parse.failed') {
    send(res, 400, '요청 본문의 JSON 형식이 올바르지 않습니다');
    return;
  }
  if (error.type === 'entity.too.large') {
    send(res, 413, '요청 본문이 너무 큽니다');
    return;
  }
  if (error.code === '23505') {
    send(res, 409, '이미 등록된 항목입니다');
    return;
  }
  // Other client errors raised before routing keep their 4xx status instead of a logged 500.
  if (typeof error.status === 'number' && error.status >= 400 && error.status < 500) {
    send(res, error.status, '요청을 처리할 수 없습니다');
    return;
  }
  // The internal message goes to the log only; the response never exposes it.
  console.error(JSON.stringify({ event: 'request_error', message: error.message }));
  send(res, 500, '저장소에 연결할 수 없습니다. 서버 상태를 확인하세요.');
}
