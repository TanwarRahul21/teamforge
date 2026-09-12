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

import commentsCreateRouter from './comments-create.js';

const app = express();

app.use(express.json());
app.use(commentsCreateRouter);

const projectId = 'aea04826-53c0-490c-a85c-9bb21974de01';
const taskId = 'd22b47cf-b656-423f-822f-bd8aa49f56a0';
const actorId = '87f15ca7-5e66-4c5f-a261-23194b9cedd2';

describe('POST /projects/:projectId/tasks/:taskId/comments', () => {
  it('writes a task.comment.created outbox event when comment creation succeeds', async () => {
    const orgResult = await pool.query<{ org_id: string }>(
      `
      SELECT tm.org_id
      FROM projects p
      JOIN teams tm ON tm.id = p.team_id
      WHERE p.id = $1
      `,
      [projectId],
    );

    expect(orgResult.rowCount).toBe(1);
    const orgId = orgResult.rows[0].org_id;

    const response = await request(app)
      .post(`/projects/${projectId}/tasks/${taskId}/comments`)
      .send({
        body: `Outbox comment ${Date.now()}`,
      });

    expect(response.status).toBe(201);
    expect(response.body.comment).toMatchObject({
      id: expect.any(String),
      task_id: taskId,
      author_id: actorId,
      body: expect.any(String),
    });

    const commentId = response.body.comment.id as string;

    const outboxResult = await pool.query<{
      payload: {
        commentId: string;
        taskId: string;
        projectId: string;
        orgId: string;
        actorId: string;
      };
    }>(
      `
      SELECT payload
      FROM outbox
      WHERE type = 'task.comment.created'
        AND payload->>'commentId' = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [commentId],
    );

    expect(outboxResult.rowCount).toBe(1);
    expect(outboxResult.rows[0].payload).toMatchObject({
      commentId,
      taskId,
      projectId,
      orgId,
      actorId,
    });
  });
});
