import { Router } from 'express';
import { pool } from '@teamforge/db';
import {
  authMiddleware,
  type AuthenticatedRequest,
} from '../auth/middleware.js';

const router = Router();

router.post(
  '/projects/:projectId/tasks/:taskId/labels/:labelId',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId, taskId, labelId } = req.params;
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication required',
        });
      }

      const accessResult = await pool.query<{
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
          AND t.project_id = $2
          AND t.deleted_at IS NULL
        `,
        [taskId, projectId, userId],
      );

      if (accessResult.rowCount === 0) {
        return res.status(404).json({
          error: 'task_not_found',
          message: 'Task not found',
        });
      }

      const orgId = accessResult.rows[0].org_id;

      const labelResult = await pool.query(
        `
        SELECT id
        FROM labels
        WHERE id = $1
          AND org_id = $2
        `,
        [labelId, orgId],
      );

      if (labelResult.rowCount === 0) {
        return res.status(404).json({
          error: 'label_not_found',
          message: 'Label not found',
        });
      }

      const result = await pool.query(
        `
        INSERT INTO task_labels (task_id, label_id)
        VALUES ($1, $2)
        ON CONFLICT (task_id, label_id) DO NOTHING
        RETURNING task_id, label_id
        `,
        [taskId, labelId],
      );

      return res.status(201).json({
        taskLabel: result.rows[0] ?? {
          task_id: taskId,
          label_id: labelId,
        },
      });
    } catch (error) {
      console.error('[Labels] Add error:', error);

      return res.status(500).json({
        error: 'internal_error',
        message: 'Unable to add label to task',
      });
    }
  },
);

export default router;