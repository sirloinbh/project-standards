import { Pool } from 'pg';

import { createApp } from './app.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const port = Number(process.env.PORT ?? {{project.ports.api}});
const server = createApp(pool).listen(port, '0.0.0.0', () =>
  console.log(`API http://localhost:${port}`),
);
process.on('SIGTERM', () =>
  server.close(() => {
    void pool.end();
  }),
);
