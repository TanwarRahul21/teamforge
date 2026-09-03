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

import taskDeleteRouter from './delete.js';
import taskRestoreRouter from './restore.js';

const app = express();

app.use(express.json());
app.use(taskDeleteRouter);
app.use(taskRestoreRouter);

const projectId = 'aea04826-53c0-490c-a85c-9bb21974de01';

describe('Task delete and restore', () => {
  it('deletes, restores, and rejects a stale delete', async () => {
    const title = `Delete restore test ${Date.now()}`;

    const createResult = await pool.query<{ id: string; version: string }>(
      `
      INSERT INTO tasks (project_id, title)
      VALUES ($1, $2)
      RETURNING id, version
      `,
      [projectId, title],
    );

    const taskId = createResult.rows[0].id;
    const initialVersion = Number(createResult.rows[0].version);

    try {
      expect(initialVersion).toBe(1);

      const deleteResponse = await request(app)
        .delete(`/projects/${projectId}/tasks/${taskId}`)
        .send({
          expectedVersion: initialVersion,
        });

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.task).toMatchObject({
        id: taskId,
        project_id: projectId,
        version: '2',
      });
      expect(deleteResponse.body.task.deleted_at).toEqual(expect.any(String));

      const restoreResponse = await request(app)
        .post(`/projects/${projectId}/tasks/${taskId}/restore`)
        .send({
          expectedVersion: 2,
        });

      expect(restoreResponse.status).toBe(200);
      expect(restoreResponse.body.task).toMatchObject({
        id: taskId,
        project_id: projectId,
        version: '3',
        deleted_at: null,
      });

      const staleDeleteResponse = await request(app)
        .delete(`/projects/${projectId}/tasks/${taskId}`)
        .send({
          expectedVersion: 2,
        });

      expect(staleDeleteResponse.status).toBe(409);
      expect(staleDeleteResponse.body).toMatchObject({
        error: 'version_conflict',
      });
      expect(Number(staleDeleteResponse.body.currentVersion)).toBe(3);
    } finally {
      await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    }
  });
});