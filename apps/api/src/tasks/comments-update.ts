import { Router } from 'express';
import { pool } from '@teamforge/db';
import {
  authMiddleware,
  type AuthenticatedRequest,
} from '../auth/middleware.js';

const router = Router();

router.patch(
  '/projects/:projectId/tasks/:taskId/comments/:commentId',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId, taskId, commentId } = req.params;
      const userId = req.user?.sub;
      const { body } = req.body as { body?: unknown };

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication required',
        });
      }

      if (typeof body !== 'string' || body.trim().length === 0) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'body is required',
        });
      }

      if (body.trim().length > 5000) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'body must be 5000 characters or less',
        });
      }

      const accessResult = await pool.query(
        `
        SELECT c.id
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

      const updateResult = await pool.query<{
        id: string;
        task_id: string;
        author_id: string;
        body: string;
        created_at: string;
      }>(
        `
        UPDATE task_comments
        SET body = $1
        WHERE id = $2
          AND task_id = $3
          AND author_id = $4
        RETURNING
          id,
          task_id,
          author_id,
          body,
          created_at
        `,
        [body.trim(), commentId, taskId, userId],
      );

      if (updateResult.rowCount === 0) {
        return res.status(403).json({
          error: 'forbidden',
          message: 'Only the comment author can edit this comment',
        });
      }

      return res.status(200).json({
        comment: updateResult.rows[0],
      });
    } catch (error) {
      console.error('[Comments] Update error:', error);

      return res.status(500).json({
        error: 'internal_error',
        message: 'Unable to update comment',
      });
    }
  },
);

export default router;