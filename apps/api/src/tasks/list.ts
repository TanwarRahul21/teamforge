import { Router } from 'express';
import { pool } from '@teamforge/db';
import {
  authMiddleware,
  type AuthenticatedRequest,
} from '../auth/middleware.js';

const router = Router();

router.get(
  '/projects/:projectId/tasks',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication required',
        });
      }

      const projectResult = await pool.query(
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

      if (projectResult.rowCount === 0) {
        return res.status(404).json({
          error: 'project_not_found',
          message: 'Project not found',
        });
      }

      const tasksResult = await pool.query(
        `
        SELECT
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
        FROM tasks
        WHERE project_id = $1
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        `,
        [projectId],
      );

      return res.status(200).json({
        tasks: tasksResult.rows,
      });
    } catch (error) {
      console.error('[Tasks] List error:', error);

      return res.status(500).json({
        error: 'internal_error',
        message: 'Unable to list tasks',
      });
    }
  },
);

export default router;