import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import express from 'express';

vi.mock('../auth/middleware.js', () => ({
  authMiddleware: (
    req: { user?: { sub: string; sid: string } },
    _res: unknown,
    next: () => void,
  ) => {
    req.user = {
      sub: '87f15ca7-5e66-4c5f-a261-23194b9cedd2',
      sid: 'test-session',
    };
    next();
  },
}));

import taskListRouter from './list.js';

const app = express();

app.use(express.json());
app.use(taskListRouter);

describe('GET /projects/:projectId/tasks', () => {
  it('returns tasks for an accessible project', async () => {
    const response = await request(app).get(
      '/projects/aea04826-53c0-490c-a85c-9bb21974de01/tasks',
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('tasks');
    expect(Array.isArray(response.body.tasks)).toBe(true);

    expect(response.body.tasks[0]).toMatchObject({
      id: expect.any(String),
      project_id: 'aea04826-53c0-490c-a85c-9bb21974de01',
      title: expect.any(String),
      status: expect.any(String),
      priority: expect.any(String),
    });
  });
});