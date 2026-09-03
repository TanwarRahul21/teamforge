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

import taskUpdateRouter from './update.js';

const app = express();

app.use(express.json());
app.use(taskUpdateRouter);

const projectId = 'aea04826-53c0-490c-a85c-9bb21974de01';
const taskId = 'd22b47cf-b656-423f-822f-bd8aa49f56a0';

describe('PATCH /projects/:projectId/tasks/:taskId', () => {
  it('rejects an update with a stale version', async () => {
    const taskResult = await pool.query<{ version: string }>(
      `
      SELECT version
      FROM tasks
      WHERE id = $1
        AND project_id = $2
        AND deleted_at IS NULL
      `,
      [taskId, projectId],
    );

    expect(taskResult.rowCount).toBe(1);

    const currentVersion = Number(taskResult.rows[0].version);
    expect(currentVersion).toBeGreaterThan(1);

    const staleVersion = currentVersion - 1;

    const response = await request(app)
      .patch(`/projects/${projectId}/tasks/${taskId}`)
      .send({
        title: 'Stale update',
        expectedVersion: staleVersion,
      });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      error: 'version_conflict',
    });
    expect(Number(response.body.currentVersion)).toBeGreaterThan(staleVersion);
  });
});