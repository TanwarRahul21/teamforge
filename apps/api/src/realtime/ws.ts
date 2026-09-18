import type http from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { createClient } from 'redis';
import { pool } from '@teamforge/db';
import { verifyAccessToken } from '../auth/tokens.js';
import { isSessionActive } from '../auth/session-check.js';

const REDIS_CHANNEL = 'teamforge:events';
const EVENT_DEDUP_TTL_MS = 24 * 60 * 60 * 1000;

interface AuthMessage {
  type: 'auth';
  token: string;
}

interface RealtimeEvent {
  id?: unknown;
  payload?: {
    orgId?: unknown;
  };
}

interface AuthenticatedSocket {
  userId: string;
}

function parseAuthMessage(raw: string): AuthMessage | null {
  try {
    const parsed = JSON.parse(raw) as {
      type?: unknown;
      token?: unknown;
    };

    if (parsed.type !== 'auth' || typeof parsed.token !== 'string') {
      return null;
    }

    const token = parsed.token.trim();

    if (token.length === 0) {
      return null;
    }

    return {
      type: 'auth',
      token,
    };
  } catch {
    return null;
  }
}

async function hasOrgMembership(userId: string, orgId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1
     FROM memberships
     WHERE user_id = $1
       AND org_id = $2
     LIMIT 1`,
    [userId, orgId],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function createWebSocketGateway(
  server: http.Server,
  redisUrl: string,
): Promise<void> {
  const subscriber = createClient({ url: redisUrl });
  const dedupeClient = subscriber.duplicate();
  const clients = new Set<WebSocket>();
  const authenticatedClients = new Map<WebSocket, AuthenticatedSocket>();
  const wss = new WebSocketServer({ server });

  await subscriber.connect();
  await dedupeClient.connect();

  const broadcastEvent = async (message: string): Promise<void> => {
    try {
      const event = JSON.parse(message) as RealtimeEvent;

      if (typeof event.id !== 'string' || event.id.length === 0) {
        return;
      }

      const orgId = event.payload?.orgId;

      if (typeof orgId !== 'string' || orgId.length === 0) {
        return;
      }

      const claimKey = `teamforge:ws:dedupe:${event.id}`;
      const claimed = await dedupeClient.set(claimKey, '1', {
        NX: true,
        PX: EVENT_DEDUP_TTL_MS,
      });

      if (claimed !== 'OK') {
        return;
      }

      for (const client of clients) {
        if (client.readyState !== WebSocket.OPEN) {
          continue;
        }

        const auth = authenticatedClients.get(client);

        if (!auth) {
          continue;
        }

        const authorized = await hasOrgMembership(auth.userId, orgId);

        if (!authorized) {
          continue;
        }

        client.send(message);
      }
    } catch (error) {
      console.error('[WebSocket] Failed to process Redis event:', error);
    }
  };

  await subscriber.subscribe(REDIS_CHANNEL, (message) => {
    void broadcastEvent(message);
  });

  wss.on('connection', (socket) => {
    clients.add(socket);
    console.log('[WebSocket] Client connected.');

    socket.on('message', (message) => {
      const authMessage = parseAuthMessage(message.toString());

      if (!authMessage) {
        return;
      }

      void (async () => {
        try {
          const claims = verifyAccessToken(authMessage.token);
          const active = await isSessionActive(claims.sid);

          if (!active) {
            authenticatedClients.delete(socket);
            socket.close(1008, 'authentication_failed');
            return;
          }

          authenticatedClients.set(socket, {
            userId: claims.sub,
          });
        } catch {
          authenticatedClients.delete(socket);
          socket.close(1008, 'authentication_failed');
        }
      })();
    });

    socket.on('close', () => {
      clients.delete(socket);
      authenticatedClients.delete(socket);
      console.log('[WebSocket] Client disconnected.');
    });

    socket.on('error', (error) => {
      clients.delete(socket);
      authenticatedClients.delete(socket);
      console.error('[WebSocket] Client error:', error);
    });
  });

  wss.on('error', (error) => {
    console.error('[WebSocket] Server error:', error);
  });

  subscriber.on('error', (error) => {
    console.error('[Redis] WebSocket subscriber error:', error);
  });

  dedupeClient.on('error', (error) => {
    console.error('[Redis] WebSocket dedupe client error:', error);
  });

  console.log('[WebSocket] Gateway listening for Redis events.');
}
