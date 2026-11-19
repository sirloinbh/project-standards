// Source of truth for input schemas shared by the API and the screens. Opt-in (ADR-0026): the scaffold writes this
// file only when the project's `features.contract` is on.
// `npm run contract:sync` copies this file to backend/src and frontend/src; never edit the copies.
import { z } from 'zod/v4';

// An id is a number or a string of digits, up to 15 digits like parseId in the backend (ADR-0025). The old
// coercing schema also accepted "1e3", "0x10" and true.
const invalidId = { error: '잘못된 번호입니다' };
export const idSchema = z
  .union([z.number(), z.string().regex(/^[1-9]\d{0,14}$/, invalidId)], invalidId)
  .transform(Number)
  .pipe(z.number().int(invalidId).positive(invalidId).max(999_999_999_999_999, invalidId));

// Body of every 4xx/5xx API response; `error` is a Korean message the screen can show as is.
export type ApiError = { error: string };
