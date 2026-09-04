import { Router } from 'express';
import { pool } from '@teamforge/db';
import {
  authMiddleware,
  type AuthenticatedRequest,
} from './auth/middleware.js';

const router = Router();

router.get(
  '/organizations/:orgId/labels',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { orgId } = req.params;
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication required',
        });
      }

      const membershipResult = await pool.query(
        `
        SELECT 1
        FROM memberships
        WHERE org_id = $1
          AND user_id = $2
        `,
        [orgId, userId],
      );

      if (membershipResult.rowCount === 0) {
        return res.status(404).json({
          error: 'organization_not_found',
          message: 'Organization not found',
        });
      }

      const labelsResult = await pool.query(
        `
        SELECT
          id,
          org_id,
          name,
          color
        FROM labels
        WHERE org_id = $1
        ORDER BY name ASC
        `,
        [orgId],
      );

      return res.status(200).json({
        labels: labelsResult.rows,
      });
    } catch (error) {
      console.error('[Labels] List error:', error);

      return res.status(500).json({
        error: 'internal_error',
        message: 'Unable to list labels',
      });
    }
  },
);

export default router;