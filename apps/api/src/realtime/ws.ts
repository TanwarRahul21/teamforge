import type http from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { createClient } from 'redis';

const REDIS_CHANNEL = 'teamforge:events';
const EVENT_DEDUP_TTL_MS = 24 * 60 * 60 * 1000;

export async function createWebSocketGateway(
  server: http.Server,
  redisUrl: string,
): Promise<void> {
  const subscriber = createClient({ url: redisUrl });
  const dedupeClient = subscriber.duplicate();
  const clients = new Set<WebSocket>();
  const wss = new WebSocketServer({ server });

  await subscriber.connect();
  await dedupeClient.connect();

  const broadcastEvent = async (message: string): Promise<void> => {
    try {
      const event = JSON.parse(message) as { id?: unknown };

      if (typeof event.id !== 'string' || event.id.length === 0) {
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
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
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
      console.log('[WebSocket] Received client message:', message.toString());
    });

    socket.on('close', () => {
      clients.delete(socket);
      console.log('[WebSocket] Client disconnected.');
    });

    socket.on('error', (error) => {
      clients.delete(socket);
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
