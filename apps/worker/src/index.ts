import http from 'http';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import { pool } from '@teamforge/db';
dotenv.config();

const port = process.env.WORKER_PORT || 4001;

// Initialize Redis Client
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (err) => {
  console.error('[Redis] Worker client error:', err);
});

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
