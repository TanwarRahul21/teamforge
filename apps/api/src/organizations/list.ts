import { Router, type Response } from 'express';
import { pool } from '@teamforge/db';
import { authMiddleware, type AuthenticatedRequest } from '../auth/middleware.js';

const router = Router();

router.get('/organizations', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.sub;

  if (!userId) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Authentication required',
    });
  }

  try {
    const organizationsResult = await pool.query(
      `
      SELECT
        o.id,
        o.name,
        o.slug,
        o.owner_id,
        o.created_at
      FROM organizations o
      JOIN memberships m
        ON m.org_id = o.id
      WHERE m.user_id = $1
      ORDER BY o.name ASC, o.id ASC
      `,
      [userId],
    );

    return res.status(200).json({
      organizations: organizationsResult.rows,
    });
  } catch (error) {
    console.error('[Organizations] List error:', error);

    return res.status(500).json({
      error: 'internal_error',
      message: 'Unable to list organizations',
    });
  }
});

export default router;
