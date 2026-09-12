import { Router } from 'express';
import { pool, withTransaction } from '@teamforge/db';
import { writeAuditLog } from '../audit/log.js';
import { writeOutboxEvent } from '../outbox/write.js';
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

      const commentResult = await withTransaction(async (tx) => {
        const createdCommentResult = await tx.query<{
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

        const comment = createdCommentResult.rows[0];

        await writeAuditLog(
          {
            orgId,
            actorId: userId,
            action: 'task.comment.created',
            resource: comment.id,
            metadata: {
              commentId: comment.id,
              taskId,
              projectId,
            },
          },
          tx,
        );

        await writeOutboxEvent(
          {
            type: 'task.comment.created',
            payload: {
              commentId: comment.id,
              taskId,
              projectId,
              orgId,
              actorId: userId,
            },
          },
          tx,
        );

        return comment;
      });

      return res.status(201).json({
        comment: commentResult,
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