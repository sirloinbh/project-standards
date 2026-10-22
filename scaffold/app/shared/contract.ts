// Source of truth for input schemas shared by the API and the screens.
// `npm run contract:sync` copies this file to backend/src and frontend/src; never edit the copies.
import { z } from 'zod';

export const idSchema = z.coerce.number().int().positive({ message: '잘못된 번호입니다' });
