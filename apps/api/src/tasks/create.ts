import { Router } from 'express';
import { pool } from '@teamforge/db';
import { authMiddleware, AuthenticatedRequest } from '../auth/middleware.js';

const router = Router();

const VALID_STATUSES = ['backlog', 'in_progress', 'review', 'done'] as const;
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

router.post(
  '/projects/:projectId/tasks',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId } = req.params;
      const { title, description, status, priority, assigneeId, dueAt } =
        req.body as {
          title?: unknown;
          description?: unknown;
          status?: unknown;
          priority?: unknown;
          assigneeId?: unknown;
          dueAt?: unknown;
        };

      if (typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'title is required',
        });
      }

      if (title.trim().length > 200) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'title must be 200 characters or less',
        });
      }

      if (
        status !== undefined &&
        (typeof status !== 'string' ||
          !VALID_STATUSES.includes(
            status as (typeof VALID_STATUSES)[number],
          ))
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

      if (description !== undefined && typeof description !== 'string') {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'description must be a string',
        });
      }

      if (assigneeId !== undefined && typeof assigneeId !== 'string') {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'assigneeId must be a string',
        });
      }

      if (dueAt !== undefined && typeof dueAt !== 'string') {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'dueAt must be a string',
        });
      }
      const userId = req.user?.sub;

if (!userId) {
  return res.status(401).json({
    error: 'unauthorized',
    message: 'Authentication required',
  });
}

      const projectResult = await pool.query<{
        id: string;
        team_id: string;
      }>(
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

      if (projectResult.rowCount === 0) {
        return res.status(404).json({
          error: 'project_not_found',
          message: 'Project not found',
        });
      }

      const project = projectResult.rows[0];

      if (assigneeId) {
        const assigneeResult = await pool.query(
          `
          SELECT 1
          FROM team_members tm
          WHERE tm.team_id = $1
            AND tm.user_id = $2
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

      const taskResult = await pool.query<{
        id: string;
        project_id: string;
        title: string;
        description: string | null;
        status: string;
        priority: string;
        assignee_id: string | null;
        due_at: string | null;
        version: string;
        created_at: string;
        updated_at: string;
      }>(
        `
        INSERT INTO tasks (
          project_id,
          title,
          description,
          status,
          priority,
          assignee_id,
          due_at
        )
        VALUES ($1, $2, $3, COALESCE($4::task_status, 'backlog'),
                COALESCE($5::task_priority, 'medium'), $6, $7)
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
          projectId,
          title.trim(),
          description ?? null,
          status ?? null,
          priority ?? null,
          assigneeId ?? null,
          dueAt ?? null,
        ],
      );

      return res.status(201).json({
        task: taskResult.rows[0],
      });
    } catch (error) {
      console.error('[Tasks] Create error:', error);

      return res.status(500).json({
        error: 'internal_error',
        message: 'Unable to create task',
      });
    }
  },
);

export default router;