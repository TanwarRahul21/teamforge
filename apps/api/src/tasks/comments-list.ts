import { Router } from 'express';
import { pool } from '@teamforge/db';
import {
  authMiddleware,
  type AuthenticatedRequest,
} from '../auth/middleware.js';

const router = Router();

router.get(
  '/projects/:projectId/tasks/:taskId/comments',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId, taskId } = req.params;
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication required',
        });
      }

      const accessResult = await pool.query(
        `
        SELECT t.id
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

      const commentsResult = await pool.query(
        `
        SELECT
          id,
          task_id,
          author_id,
          body,
          created_at
        FROM task_comments
        WHERE task_id = $1
        ORDER BY created_at ASC
        `,
        [taskId],
      );

      return res.status(200).json({
        comments: commentsResult.rows,
      });
    } catch (error) {
      console.error('[Comments] List error:', error);

      return res.status(500).json({
        error: 'internal_error',
        message: 'Unable to list comments',
      });
    }
  },
);

export default router;