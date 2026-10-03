import { Router, type Response } from 'express';
import { pool } from '@teamforge/db';
import { authMiddleware, type AuthenticatedRequest } from '../auth/middleware.js';

const router = Router();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.get('/organizations/:orgId/projects', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { orgId } = req.params;
  const userId = req.user?.sub;

  if (!userId) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Authentication required',
    });
  }

  if (!orgId || !uuidPattern.test(orgId)) {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'Organization ID is invalid',
    });
  }

  try {
    const membershipResult = await pool.query(
      `
      SELECT 1
      FROM memberships
      WHERE user_id = $1
        AND org_id = $2
      `,
      [userId, orgId],
    );

    if (membershipResult.rowCount === 0) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'You are not a member of this organization',
      });
    }

    const projectsResult = await pool.query(
      `
      SELECT
        p.id,
        p.team_id,
        p.name
      FROM projects p
      JOIN teams t
        ON t.id = p.team_id
      JOIN memberships m
        ON m.org_id = t.org_id
       AND m.user_id = $2
      WHERE t.org_id = $1
      ORDER BY p.name ASC, p.id ASC
      `,
      [orgId, userId],
    );

    return res.status(200).json({
      projects: projectsResult.rows,
    });
  } catch (error) {
    console.error('[Projects] List error:', error);

    return res.status(500).json({
      error: 'internal_error',
      message: 'Unable to list projects',
    });
  }
});

export default router;
