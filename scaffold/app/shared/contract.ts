// Source of truth for input schemas shared by the API and the screens.
// `npm run contract:sync` copies this file to backend/src and frontend/src; never edit the copies.
import { z } from 'zod/v4';

export const idSchema = z.coerce.number().int().positive({ error: '잘못된 번호입니다' });

// Body of every 4xx/5xx API response; `error` is a Korean message the screen can show as is.
export type ApiError = { error: string };
