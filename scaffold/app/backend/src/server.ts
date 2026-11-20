import { Pool } from 'pg';

import { createApp } from './app.js';
import { listenHost, sharedAuth } from './standard/auth.js';
import { createPool } from './standard/db.js';

// createPool adds the error listeners: a lost connection, idle or inside a transaction, is logged, not a crash.
const pool = createPool(new Pool({ connectionString: process.env.DATABASE_URL }));
const port = Number(process.env.PORT ?? {{project.ports.api}});
// The shared sign-in: open without AUTH_INTERNAL_URL only in explicit local mode (#667), which also keeps the
// listener on 127.0.0.1 (listenHost) so another machine on the network cannot reach the open API.
const auth = sharedAuth();
const host = listenHost(auth !== undefined);
const server = createApp(pool, { auth }).listen(port, host, () => console.log(`API http://${host}:${port}`));
process.on('SIGTERM', () =>
  server.close(() => {
    void pool.end();
  }),
);
