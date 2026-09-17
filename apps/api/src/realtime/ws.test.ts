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
  const subscribeSpy = vi.fn();
  const setSpy = vi.fn();
  const connectSpy = vi.fn();
  const duplicateSpy = vi.fn();
  const dedupeConnectSpy = vi.fn().mockResolvedValue(undefined);

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
    subscribeSpy,
    setSpy,
    connectSpy,
    duplicateSpy,
    dedupeConnectSpy,
    getSubscriptionHandler: () => subscriptionHandler,
    getWebSocketServerInstance: () => websocketServerInstance,
  };
});

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

beforeEach(() => {
  mocks.sendSpy.mockReset();
  mocks.subscribeSpy.mockClear();
  mocks.setSpy.mockReset();
  mocks.connectSpy.mockClear();
  mocks.duplicateSpy.mockClear();
  mocks.dedupeConnectSpy.mockClear();
  mocks.dedupeClient.set.mockReset();
});

describe('createWebSocketGateway', () => {
  it('broadcasts the first delivery of an event', async () => {
    mocks.setSpy.mockResolvedValue('OK');

    const server = {} as never;

    await createWebSocketGateway(server, 'redis://localhost:6379');

    const socket = {
      readyState: 1,
      send: mocks.sendSpy,
      on: vi.fn(),
    };

    mocks.getWebSocketServerInstance()?.emit('connection', socket);

    const message = JSON.stringify({
      id: 'event-1',
      type: 'task.created',
      payload: { taskId: 'task-1' },
    });

    mocks.getSubscriptionHandler()?.(message);

    await Promise.resolve();

    expect(mocks.setSpy).toHaveBeenCalledWith('teamforge:ws:dedupe:event-1', '1', {
      NX: true,
      PX: 24 * 60 * 60 * 1000,
    });
    expect(mocks.sendSpy).toHaveBeenCalledTimes(1);
    expect(mocks.sendSpy).toHaveBeenCalledWith(message);
  });

  it('does not broadcast duplicate event ids', async () => {
    mocks.setSpy.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);

    const server = {} as never;

    await createWebSocketGateway(server, 'redis://localhost:6379');

    const socket = {
      readyState: 1,
      send: mocks.sendSpy,
      on: vi.fn(),
    };

    mocks.getWebSocketServerInstance()?.emit('connection', socket);

    const message = JSON.stringify({
      id: 'event-dup',
      type: 'task.deleted',
      payload: { taskId: 'task-1' },
    });

    mocks.getSubscriptionHandler()?.(message);
    mocks.getSubscriptionHandler()?.(message);

    await Promise.resolve();

    expect(mocks.setSpy).toHaveBeenCalledTimes(2);
    expect(mocks.sendSpy).toHaveBeenCalledTimes(1);
    expect(mocks.sendSpy).toHaveBeenCalledWith(message);
  });
});