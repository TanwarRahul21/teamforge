import type http from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { createClient } from 'redis';

const REDIS_CHANNEL = 'teamforge:events';

export async function createWebSocketGateway(
  server: http.Server,
  redisUrl: string,
): Promise<void> {
  const subscriber = createClient({ url: redisUrl });
  await subscriber.connect();

  await subscriber.subscribe(REDIS_CHANNEL, (message) => {
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  });

  const clients = new Set<WebSocket>();
  const wss = new WebSocketServer({ server });

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

  console.log('[WebSocket] Gateway listening for Redis events.');
}
