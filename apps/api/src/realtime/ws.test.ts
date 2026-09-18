import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  let subscriptionHandler: ((message: string) => void) | undefined;
  let websocketServerInstance: MockWebSocketServer | undefined;

  class MockWebSocketServer {
    private readonly handlers = new Map<string, Array<(...args: any[]) => void>>();

    constructor() {
      websocketServerInstance = this;
    }

    on(event: string, handler: (...args: any[]) => void): void {
      const handlers = this.handlers.get(event) ?? [];
      handlers.push(handler);
      this.handlers.set(event, handlers);
    }

    emit(event: string, ...args: any[]): void {
      for (const handler of this.handlers.get(event) ?? []) {
        handler(...args);
      }
    }
  }

  const sendSpy = vi.fn();
  const closeSpy = vi.fn();
  const subscribeSpy = vi.fn();
  const setSpy = vi.fn();
  const connectSpy = vi.fn();
  const duplicateSpy = vi.fn();
  const dedupeConnectSpy = vi.fn().mockResolvedValue(undefined);
  const verifyAccessTokenSpy = vi.fn();
  const isSessionActiveSpy = vi.fn();
  const poolQuerySpy = vi.fn();

  const dedupeClient = {
    connect: dedupeConnectSpy,
    set: setSpy,
    on: vi.fn(),
  };

  const subscriberClient = {
    connect: connectSpy.mockResolvedValue(undefined),
    subscribe: subscribeSpy.mockImplementation(
      async (_channel: string, handler: (message: string) => void) => {
        subscriptionHandler = handler;
      },
    ),
    on: vi.fn(),
    duplicate: duplicateSpy.mockImplementation(() => dedupeClient),
  };

  return {
    MockWebSocketServer,
    subscriberClient,
    dedupeClient,
    sendSpy,
    closeSpy,
    subscribeSpy,
    setSpy,
    connectSpy,
    duplicateSpy,
    dedupeConnectSpy,
    verifyAccessTokenSpy,
    isSessionActiveSpy,
    poolQuerySpy,
    getSubscriptionHandler: () => subscriptionHandler,
    getWebSocketServerInstance: () => websocketServerInstance,
  };
});

vi.mock('@teamforge/db', () => ({
  pool: {
    query: mocks.poolQuerySpy,
  },
}));

vi.mock('../auth/tokens.js', () => ({
  verifyAccessToken: mocks.verifyAccessTokenSpy,
}));

vi.mock('../auth/session-check.js', () => ({
  isSessionActive: mocks.isSessionActiveSpy,
}));

vi.mock('redis', () => ({
  createClient: vi.fn(() => mocks.subscriberClient),
}));

vi.mock('ws', () => ({
  WebSocket: {
    OPEN: 1,
  },
  WebSocketServer: mocks.MockWebSocketServer,
}));

import { createWebSocketGateway } from './ws.js';

function createSocket() {
  const handlers = new Map<string, Array<(payload?: Buffer) => void>>();

  return {
    readyState: 1,
    send: mocks.sendSpy,
    close: mocks.closeSpy,
    on: vi.fn((event: string, handler: (payload?: Buffer) => void) => {
      const existingHandlers = handlers.get(event) ?? [];
      existingHandlers.push(handler);
      handlers.set(event, existingHandlers);
    }),
    emit: (event: string, payload?: Buffer) => {
      for (const handler of handlers.get(event) ?? []) {
        handler(payload);
      }
    },
  };
}

async function authenticateSocket(
  socket: ReturnType<typeof createSocket>,
  token: string,
): Promise<void> {
  socket.emit(
    'message',
    Buffer.from(
      JSON.stringify({
        type: 'auth',
        token,
      }),
    ),
  );

  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  mocks.sendSpy.mockReset();
  mocks.closeSpy.mockReset();
  mocks.subscribeSpy.mockClear();
  mocks.setSpy.mockReset();
  mocks.connectSpy.mockClear();
  mocks.duplicateSpy.mockClear();
  mocks.dedupeConnectSpy.mockClear();
  mocks.dedupeClient.set.mockReset();
  mocks.verifyAccessTokenSpy.mockReset();
  mocks.isSessionActiveSpy.mockReset();
  mocks.poolQuerySpy.mockReset();
});

describe('createWebSocketGateway', () => {
  it('does not broadcast events to unauthenticated clients', async () => {
    mocks.setSpy.mockResolvedValue('OK');

    const server = {} as never;

    await createWebSocketGateway(server, 'redis://localhost:6379');

    const socket = createSocket();

    mocks.getWebSocketServerInstance()?.emit('connection', socket);

    const message = JSON.stringify({
      id: 'event-1',
      type: 'task.created',
      payload: {
        taskId: 'task-1',
        orgId: 'org-1',
      },
    });

    mocks.getSubscriptionHandler()?.(message);

    await Promise.resolve();

    expect(mocks.setSpy).toHaveBeenCalledWith('teamforge:ws:dedupe:event-1', '1', {
      NX: true,
      PX: 24 * 60 * 60 * 1000,
    });
    expect(mocks.sendSpy).not.toHaveBeenCalled();
  });

  it('broadcasts events to authenticated organization members', async () => {
    mocks.setSpy.mockResolvedValue('OK');
    mocks.verifyAccessTokenSpy.mockReturnValue({
      sub: 'user-1',
      sid: 'session-1',
    });
    mocks.isSessionActiveSpy.mockResolvedValue(true);
    mocks.poolQuerySpy.mockResolvedValue({ rowCount: 1, rows: [{ '?column?': 1 }] });

    const server = {} as never;

    await createWebSocketGateway(server, 'redis://localhost:6379');

    const socket = createSocket();

    mocks.getWebSocketServerInstance()?.emit('connection', socket);

    await authenticateSocket(socket, 'valid-token');
    await vi.waitFor(() => {
      expect(mocks.isSessionActiveSpy).toHaveBeenCalledWith('session-1');
    });

    const message = JSON.stringify({
      id: 'event-member',
      type: 'task.updated',
      payload: {
        taskId: 'task-1',
        orgId: 'org-1',
      },
    });

    mocks.getSubscriptionHandler()?.(message);

    await vi.waitFor(() => {
      expect(mocks.sendSpy).toHaveBeenCalledTimes(1);
    });

    expect(mocks.verifyAccessTokenSpy).toHaveBeenCalledWith('valid-token');
    expect(mocks.isSessionActiveSpy).toHaveBeenCalledWith('session-1');
    expect(mocks.poolQuerySpy).toHaveBeenCalledWith(
      expect.stringContaining('FROM memberships'),
      ['user-1', 'org-1'],
    );
    expect(mocks.sendSpy).toHaveBeenCalledWith(message);
  });

  it('does not broadcast events to authenticated non-members', async () => {
    mocks.setSpy.mockResolvedValue('OK');
    mocks.verifyAccessTokenSpy.mockReturnValue({
      sub: 'user-2',
      sid: 'session-2',
    });
    mocks.isSessionActiveSpy.mockResolvedValue(true);
    mocks.poolQuerySpy.mockResolvedValue({ rowCount: 0, rows: [] });

    const server = {} as never;

    await createWebSocketGateway(server, 'redis://localhost:6379');

    const socket = createSocket();

    mocks.getWebSocketServerInstance()?.emit('connection', socket);

    await authenticateSocket(socket, 'valid-token');
    await vi.waitFor(() => {
      expect(mocks.isSessionActiveSpy).toHaveBeenCalledWith('session-2');
    });

    const message = JSON.stringify({
      id: 'event-non-member',
      type: 'task.deleted',
      payload: {
        taskId: 'task-2',
        orgId: 'org-2',
      },
    });

    mocks.getSubscriptionHandler()?.(message);

    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.sendSpy).not.toHaveBeenCalled();
  });

  it('rejects invalid authentication tokens and closes socket', async () => {
    mocks.verifyAccessTokenSpy.mockImplementation(() => {
      throw new Error('invalid token');
    });

    const server = {} as never;

    await createWebSocketGateway(server, 'redis://localhost:6379');

    const socket = createSocket();

    mocks.getWebSocketServerInstance()?.emit('connection', socket);

    await authenticateSocket(socket, 'bad-token');

    expect(mocks.closeSpy).toHaveBeenCalledWith(1008, 'authentication_failed');
  });

  it('does not broadcast duplicate event ids', async () => {
    mocks.setSpy.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);
    mocks.verifyAccessTokenSpy.mockReturnValue({
      sub: 'user-1',
      sid: 'session-1',
    });
    mocks.isSessionActiveSpy.mockResolvedValue(true);
    mocks.poolQuerySpy.mockResolvedValue({ rowCount: 1, rows: [{ '?column?': 1 }] });

    const server = {} as never;

    await createWebSocketGateway(server, 'redis://localhost:6379');

    const socket = createSocket();

    mocks.getWebSocketServerInstance()?.emit('connection', socket);

    await authenticateSocket(socket, 'valid-token');
    await vi.waitFor(() => {
      expect(mocks.isSessionActiveSpy).toHaveBeenCalledWith('session-1');
    });

    const message = JSON.stringify({
      id: 'event-dup',
      type: 'task.deleted',
      payload: {
        taskId: 'task-1',
        orgId: 'org-1',
      },
    });

    mocks.getSubscriptionHandler()?.(message);
    mocks.getSubscriptionHandler()?.(message);

    await vi.waitFor(() => {
      expect(mocks.setSpy).toHaveBeenCalledTimes(2);
    });

    await vi.waitFor(() => {
      expect(mocks.sendSpy).toHaveBeenCalledTimes(1);
    });
    expect(mocks.sendSpy).toHaveBeenCalledWith(message);
  });
});