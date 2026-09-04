import { Router } from 'express';
import { pool } from '@teamforge/db';
import {
  authMiddleware,
  type AuthenticatedRequest,
} from '../auth/middleware.js';

const router = Router();

router.delete(
  '/projects/:projectId/tasks/:taskId/labels/:labelId',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.sub;
      const { projectId, taskId, labelId } = req.params;

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication required',
        });
      }

      const taskResult = await pool.query<{
        org_id: string;
      }>(
        `
        SELECT tm.org_id
        FROM tasks t
        JOIN projects p ON p.id = t.project_id
        JOIN teams tm ON tm.id = p.team_id
        JOIN memberships m
          ON m.org_id = tm.org_id
         AND m.user_id = $3
        WHERE t.id = $1
          AND p.id = $2
          AND t.deleted_at IS NULL
        LIMIT 1
        `,
        [taskId, projectId, userId],
      );

      if (taskResult.rowCount === 0) {
        return res.status(404).json({
          error: 'task_not_found',
          message: 'Task not found',
        });
      }

      const orgId = taskResult.rows[0].org_id;

      const labelResult = await pool.query(
        `
        SELECT id
        FROM labels
        WHERE id = $1
          AND org_id = $2
        LIMIT 1
        `,
        [labelId, orgId],
      );

      if (labelResult.rowCount === 0) {
        return res.status(404).json({
          error: 'label_not_found',
          message: 'Label not found',
        });
      }

      const deleteResult = await pool.query(
        `
        DELETE FROM task_labels
        WHERE task_id = $1
          AND label_id = $2
        RETURNING task_id, label_id
        `,
        [taskId, labelId],
      );

      if (deleteResult.rowCount === 0) {
        return res.status(404).json({
          error: 'label_not_attached',
          message: 'Label is not attached to this task',
        });
      }

      return res.status(204).send();
    } catch (error) {
      console.error('[Labels] Remove error:', error);

      return res.status(500).json({
        error: 'internal_error',
        message: 'Unable to remove label from task',
      });
    }
  },
);

export default router;