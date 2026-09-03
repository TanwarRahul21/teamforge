import { Router } from 'express';
import { pool } from '@teamforge/db';
import {
  authMiddleware,
  type AuthenticatedRequest,
} from '../auth/middleware.js';

const router = Router();

const VALID_STATUSES = ['backlog', 'in_progress', 'review', 'done'] as const;
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

router.patch(
  '/projects/:projectId/tasks/:taskId',
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

      const {
        title,
        description,
        status,
        priority,
        assigneeId,
        dueAt,
        expectedVersion,
      } = req.body as {
        title?: unknown;
        description?: unknown;
        status?: unknown;
        priority?: unknown;
        assigneeId?: unknown;
        dueAt?: unknown;
        expectedVersion?: unknown;
      };

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

      if (
        title !== undefined &&
        (typeof title !== 'string' ||
          title.trim().length === 0 ||
          title.trim().length > 200)
      ) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'title must be a non-empty string of 200 characters or less',
        });
      }

      if (description !== undefined && typeof description !== 'string') {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'description must be a string',
        });
      }

      if (
        status !== undefined &&
        (typeof status !== 'string' ||
          !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number]))
      ) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'invalid status',
        });
      }

      if (
        priority !== undefined &&
        (typeof priority !== 'string' ||
          !VALID_PRIORITIES.includes(
            priority as (typeof VALID_PRIORITIES)[number],
          ))
      ) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'invalid priority',
        });
      }

      if (assigneeId !== undefined && assigneeId !== null && typeof assigneeId !== 'string') {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'assigneeId must be a string or null',
        });
      }

      if (dueAt !== undefined && dueAt !== null && typeof dueAt !== 'string') {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'dueAt must be a string or null',
        });
      }

      const projectAccess = await pool.query(
        `
        SELECT p.id, p.team_id
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

      const project = projectAccess.rows[0] as { id: string; team_id: string };

      if (assigneeId) {
        const assigneeResult = await pool.query(
          `
          SELECT 1
          FROM team_members
          WHERE team_id = $1
            AND user_id = $2
          `,
          [project.team_id, assigneeId],
        );

        if (assigneeResult.rowCount === 0) {
          return res.status(400).json({
            error: 'invalid_assignee',
            message: 'Assignee must belong to the project team',
          });
        }
      }

      const updateResult = await pool.query(
        `
        UPDATE tasks
        SET
          title = COALESCE($3, title),
          description = CASE
            WHEN $4::boolean THEN $5
            ELSE description
          END,
          status = COALESCE($6::task_status, status),
          priority = COALESCE($7::task_priority, priority),
          assignee_id = CASE
            WHEN $8::boolean THEN $9
            ELSE assignee_id
          END,
          due_at = CASE
            WHEN $10::boolean THEN $11::timestamptz
            ELSE due_at
          END,
          version = version + 1,
          updated_at = NOW()
        WHERE id = $1
          AND project_id = $2
          AND deleted_at IS NULL
          AND version = $12
        RETURNING
          id,
          project_id,
          title,
          description,
          status,
          priority,
          assignee_id,
          due_at,
          version,
          created_at,
          updated_at
        `,
        [
          taskId,
          projectId,
          title !== undefined ? title.trim() : null,
          description !== undefined,
          description ?? null,
          status ?? null,
          priority ?? null,
          assigneeId !== undefined,
          assigneeId ?? null,
          dueAt !== undefined,
          dueAt ?? null,
          expectedVersion,
        ],
      );

      if (updateResult.rowCount === 0) {
        const taskResult = await pool.query(
          `
          SELECT id, version
          FROM tasks
          WHERE id = $1
            AND project_id = $2
            AND deleted_at IS NULL
          `,
          [taskId, projectId],
        );

        if (taskResult.rowCount === 0) {
          return res.status(404).json({
            error: 'task_not_found',
            message: 'Task not found',
          });
        }

        return res.status(409).json({
          error: 'version_conflict',
          message: 'Task was modified by another request',
          currentVersion: taskResult.rows[0].version,
        });
      }

      return res.status(200).json({
        task: updateResult.rows[0],
      });
    } catch (error) {
      console.error('[Tasks] Update error:', error);

      return res.status(500).json({
        error: 'internal_error',
        message: 'Unable to update task',
      });
    }
  },
);

export default router;