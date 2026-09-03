import { Router } from 'express';
import { pool } from '@teamforge/db';
import {
  authMiddleware,
  type AuthenticatedRequest,
} from '../auth/middleware.js';

const router = Router();

router.post(
  '/projects/:projectId/tasks/:taskId/comments',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId, taskId } = req.params;
      const userId = req.user?.sub;
      const { body } = req.body as {
        body?: unknown;
      };

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

      const commentResult = await pool.query<{
        id: string;
        task_id: string;
        author_id: string;
        body: string;
        created_at: string;
      }>(
        `
        INSERT INTO task_comments (
          task_id,
          author_id,
          body
        )
        VALUES ($1, $2, $3)
        RETURNING
          id,
          task_id,
          author_id,
          body,
          created_at
        `,
        [taskId, userId, body.trim()],
      );

      return res.status(201).json({
        comment: commentResult.rows[0],
      });
    } catch (error) {
      console.error('[Comments] Create error:', error);

      return res.status(500).json({
        error: 'internal_error',
        message: 'Unable to create comment',
      });
    }
  },
);

export default router;