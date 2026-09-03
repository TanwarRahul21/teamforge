import { Router } from 'express';
import { pool } from '@teamforge/db';
import {
  authMiddleware,
  type AuthenticatedRequest,
} from '../auth/middleware.js';

const router = Router();

router.post(
  '/projects/:projectId/tasks/:taskId/restore',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId, taskId } = req.params;
      const userId = req.user?.sub;
      const { expectedVersion } = req.body as {
        expectedVersion?: unknown;
      };

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication required',
        });
      }

      if (
        typeof expectedVersion !== 'number' ||
        !Number.isInteger(expectedVersion) ||
        expectedVersion < 1
      ) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'expectedVersion must be a positive integer',
        });
      }

      const projectAccess = await pool.query(
        `
        SELECT p.id
        FROM projects p
        JOIN teams t ON t.id = p.team_id
        JOIN memberships m
          ON m.org_id = t.org_id
         AND m.user_id = $2
        WHERE p.id = $1
        `,
        [projectId, userId],
      );

      if (projectAccess.rowCount === 0) {
        return res.status(404).json({
          error: 'project_not_found',
          message: 'Project not found',
        });
      }

      const restoreResult = await pool.query<{
        id: string;
        project_id: string;
        version: string;
        deleted_at: string | null;
      }>(
        `
        UPDATE tasks
        SET
          deleted_at = NULL,
          version = version + 1,
          updated_at = NOW()
        WHERE id = $1
          AND project_id = $2
          AND deleted_at IS NOT NULL
          AND version = $3
        RETURNING
          id,
          project_id,
          version,
          deleted_at
        `,
        [taskId, projectId, expectedVersion],
      );

      if (restoreResult.rowCount === 0) {
        const taskResult = await pool.query<{
          id: string;
          version: string;
          deleted_at: string | null;
        }>(
          `
          SELECT id, version, deleted_at
          FROM tasks
          WHERE id = $1
            AND project_id = $2
          `,
          [taskId, projectId],
        );

        if (taskResult.rowCount === 0) {
          return res.status(404).json({
            error: 'task_not_found',
            message: 'Task not found',
          });
        }

        const task = taskResult.rows[0];

        if (task.deleted_at === null) {
          return res.status(409).json({
            error: 'task_already_active',
            message: 'Task is already active',
            currentVersion: task.version,
          });
        }

        return res.status(409).json({
          error: 'version_conflict',
          message: 'Task was modified by another request',
          currentVersion: task.version,
        });
      }

      return res.status(200).json({
        task: restoreResult.rows[0],
      });
    } catch (error) {
      console.error('[Tasks] Restore error:', error);

      return res.status(500).json({
        error: 'internal_error',
        message: 'Unable to restore task',
      });
    }
  },
);

export default router;