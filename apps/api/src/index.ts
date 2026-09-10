import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { createClient } from 'redis';
import { pool, runMigrations } from '@teamforge/db';
import { createWebSocketGateway } from './realtime/ws.js';
import authRouter from './auth/signup';
import loginRouter from './auth/login';
import meRouter from './auth/me';
import refreshRouter from './auth/refresh';
import logoutRouter from './auth/logout.js';
import revokeAllRouter from './auth/revoke-all.js';
import organizationCreateRouter from './organizations/create.js';
import teamCreateRouter from './teams/create.js';
import teamAddMemberRouter from './teams/add-member.js';
import projectCreateRouter from './projects/create.js';
import taskCreateRouter from './tasks/create.js';
import taskListRouter from './tasks/list.js';
import taskUpdateRouter from './tasks/update.js';
import taskDeleteRouter from './tasks/delete.js';
import taskRestoreRouter from './tasks/restore.js';
import commentsCreateRouter from './tasks/comments-create.js';
import commentsListRouter from './tasks/comments-list.js';
import commentsUpdateRouter from './tasks/comments-update.js';
import commentsDeleteRouter from './tasks/comments-delete.js';
import labelsCreateRouter from './labels-create.js';
import labelsListRouter from './labels-list.js';
import labelsAddRouter from './tasks/labels-add.js';
import labelsRemoveRouter from './tasks/labels-remove.js';
const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(authRouter);
app.use(loginRouter);
app.use(meRouter);
app.use(refreshRouter);
app.use(logoutRouter);
app.use(revokeAllRouter);
app.use(organizationCreateRouter);
app.use(teamCreateRouter);
app.use(teamAddMemberRouter);
app.use(projectCreateRouter);
app.use(taskListRouter);
app.use(taskCreateRouter);
app.use(taskUpdateRouter);
app.use(taskDeleteRouter);
app.use(taskRestoreRouter);
app.use(commentsCreateRouter);  
app.use(commentsListRouter);
app.use(commentsUpdateRouter);
app.use(commentsDeleteRouter);
app.use(labelsCreateRouter);
app.use(labelsListRouter);
app.use(labelsAddRouter);
app.use(labelsRemoveRouter);
// Initialize Redis Client
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (err) => {
  console.error('[Redis] Client connection error:', err);
});

app.get('/health', async (req, res) => {
  let dbStatus = 'unhealthy';
  let redisStatus = 'unhealthy';
  let isHealthy = true;

  try {
    await pool.query('SELECT 1');
    dbStatus = 'healthy';
  } catch (err) {
    console.error('[Healthcheck] DB Connection Failure:', err);
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
    console.error('[Healthcheck] Redis Connection Failure:', err);
    isHealthy = false;
  }

  const statusCode = isHealthy ? 200 : 503;
  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      redis: redisStatus,
    },
  });
});

async function startServer() {
  try {
    // Run SQL database migrations
    await runMigrations();

    // Connect to Redis on startup
    await redisClient.connect();
    console.log('[Redis] Connected successfully.');

    const server = createServer(app);
    await createWebSocketGateway(server, redisUrl);

    server.listen(port, () => {
      console.log(`[API] Server listening on port ${port}`);
    });
  } catch (error) {
    console.error('[API] Failed to start application:', error);
    process.exit(1);
  }
}

startServer();
