import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import { pool } from '@teamforge/db';

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

import taskCreateRouter from './create.js';

const app = express();

app.use(express.json());
app.use(taskCreateRouter);

const projectId = 'aea04826-53c0-490c-a85c-9bb21974de01';
const actorId = '87f15ca7-5e66-4c5f-a261-23194b9cedd2';

describe('POST /projects/:projectId/tasks', () => {
  it('writes a task.created outbox event when task creation succeeds', async () => {
    const orgResult = await pool.query<{ org_id: string }>(
      `
      SELECT t.org_id
      FROM projects p
      JOIN teams t ON t.id = p.team_id
      WHERE p.id = $1
      `,
      [projectId],
    );

    expect(orgResult.rowCount).toBe(1);
    const orgId = orgResult.rows[0].org_id;

    const title = `Outbox task ${Date.now()}`;
    let taskId: string | undefined;

    try {
      const response = await request(app)
        .post(`/projects/${projectId}/tasks`)
        .send({
          title,
        });

      expect(response.status).toBe(201);
      expect(response.body.task).toMatchObject({
        id: expect.any(String),
        project_id: projectId,
        title,
        version: '1',
      });

      taskId = response.body.task.id as string;

      const outboxResult = await pool.query<{
        payload: {
          taskId: string;
          projectId: string;
          orgId: string;
          actorId: string;
          version: number;
        };
      }>(
        `
        SELECT payload
        FROM outbox
        WHERE type = 'task.created'
          AND payload->>'taskId' = $1
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [taskId],
      );

      expect(outboxResult.rowCount).toBe(1);
      expect(outboxResult.rows[0].payload).toMatchObject({
        taskId,
        projectId,
        orgId,
        actorId,
        version: 1,
      });
    } finally {
      if (taskId) {
        await pool.query("DELETE FROM outbox WHERE payload->>'taskId' = $1", [taskId]);
        await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
      }
    }
  });
});