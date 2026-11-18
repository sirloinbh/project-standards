import { Pool } from 'pg';

import { createApp } from './app.js';
import { sharedAuth } from './standard/auth.js';
import { createPool } from './standard/db.js';

// createPool adds the error listener: a lost idle connection is logged, not a crash.
const pool = createPool(new Pool({ connectionString: process.env.DATABASE_URL }));
const port = Number(process.env.PORT ?? {{project.ports.api}});
// The shared sign-in: open without AUTH_INTERNAL_URL locally, required in production.
const server = createApp(pool, { auth: sharedAuth() }).listen(port, '0.0.0.0', () =>
  console.log(`API http://localhost:${port}`),
);
process.on('SIGTERM', () =>
  server.close(() => {
    void pool.end();
  }),
);
