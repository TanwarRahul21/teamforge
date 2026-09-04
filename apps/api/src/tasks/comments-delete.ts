import { Router } from 'express';
import { pool } from '@teamforge/db';
import {
  authMiddleware,
  type AuthenticatedRequest,
} from '../auth/middleware.js';

const router = Router();

router.delete(
  '/projects/:projectId/tasks/:taskId/comments/:commentId',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId, taskId, commentId } = req.params;
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication required',
        });
      }

      const accessResult = await pool.query(
        `
        SELECT c.id, c.author_id
        FROM task_comments c
        JOIN tasks t ON t.id = c.task_id
        JOIN projects p ON p.id = t.project_id
        JOIN teams tm ON tm.id = p.team_id
        JOIN memberships m
          ON m.org_id = tm.org_id
         AND m.user_id = $4
        WHERE c.id = $1
          AND c.task_id = $2
          AND t.project_id = $3
          AND t.deleted_at IS NULL
        `,
        [commentId, taskId, projectId, userId],
      );

      if (accessResult.rowCount === 0) {
        return res.status(404).json({
          error: 'comment_not_found',
          message: 'Comment not found',
        });
      }

      const comment = accessResult.rows[0] as { id: string; author_id: string };

      if (comment.author_id !== userId) {
        return res.status(403).json({
          error: 'forbidden',
          message: 'Only the comment author can delete this comment',
        });
      }

      await pool.query(
        `
        DELETE FROM task_comments
        WHERE id = $1
          AND task_id = $2
          AND author_id = $3
        `,
        [commentId, taskId, userId],
      );

      return res.status(204).send();
    } catch (error) {
      console.error('[Comments] Delete error:', error);

      return res.status(500).json({
        error: 'internal_error',
        message: 'Unable to delete comment',
      });
    }
  },
);

export default router;