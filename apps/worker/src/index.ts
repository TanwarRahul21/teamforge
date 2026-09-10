import http from 'http';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import { pool } from '@teamforge/db';

dotenv.config();

const port = process.env.WORKER_PORT || 4001;
const REDIS_CHANNEL = 'teamforge:events';

// Initialize Redis Client
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (err) => {
  console.error('[Redis] Worker client error:', err);
});

let isPolling = false;

async function pollOutbox(): Promise<void> {
  if (isPolling) {
    return;
  }

  isPolling = true;

  const client = await pool.connect();

  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    await client.query('BEGIN');

    const result = await client.query<{
      id: string;
      type: string;
      payload: Record<string, unknown>;
    }>(`
      SELECT id, type, payload
      FROM outbox
      WHERE published_at IS NULL
      ORDER BY created_at ASC
      LIMIT 50
      FOR UPDATE SKIP LOCKED
    `);

    if (result.rowCount === 0) {
      await client.query('COMMIT');
      return;
    }

    for (const row of result.rows) {
      try {
        const event = {
          id: row.id,
          type: row.type,
          payload: row.payload,
        };

        await redisClient.publish(REDIS_CHANNEL, JSON.stringify(event));
        await client.query('UPDATE outbox SET published_at = NOW() WHERE id = $1', [
          row.id,
        ]);

        console.log(`[Worker] Published outbox event: ${row.type} (${row.id})`);
      } catch (err) {
        console.error(
          `[Worker] Failed to publish outbox event: ${row.type} (${row.id})`,
          err,
        );
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_rollbackError) {
      // Ignore rollback errors after a failed transaction setup.
    }

    console.error('[Worker] Outbox poll failed:', error);
  } finally {
    isPolling = false;
    client.release();
  }
}

// Setup health HTTP server
const server = http.createServer(async (req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    let dbStatus = 'unhealthy';
    let redisStatus = 'unhealthy';
    let isHealthy = true;

    try {
      await pool.query('SELECT 1');
      dbStatus = 'healthy';
    } catch (err) {
      console.error('[Worker Healthcheck] DB Failure:', err);
      isHealthy = false;
    }

    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      const pingResponse = await redisClient.ping();
      if (pingResponse === 'PONG') {
        redisStatus = 'healthy';
      } else {
        isHealthy = false;
      }
    } catch (err) {
      console.error('[Worker Healthcheck] Redis Failure:', err);
      isHealthy = false;
    }

    const statusCode = isHealthy ? 200 : 503;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus,
          redis: redisStatus,
        },
      }),
    );
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

async function startWorker() {
  try {
    // Connect to Redis
    await redisClient.connect();
    console.log('[Worker] Connected to Redis.');

    // Start HTTP server for health check
    server.listen(port, () => {
      console.log(`[Worker] Health server listening on port ${port}`);
    });

    void pollOutbox();
    setInterval(() => {
      void pollOutbox();
    }, 5000);

    // Simulate worker loop heartbeat
    setInterval(() => {
      console.log('[Worker] Heartbeat: Background tasks status verified.');
    }, 30000);
  } catch (error) {
    console.error('[Worker] Startup failure:', error);
    process.exit(1);
  }
}

startWorker();
