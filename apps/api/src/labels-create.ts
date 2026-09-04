import { Router } from 'express';
import { pool } from '@teamforge/db';
import {
  authMiddleware,
  type AuthenticatedRequest,
} from './auth/middleware.js';

const router = Router();

router.post(
  '/organizations/:orgId/labels',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { orgId } = req.params;
      const userId = req.user?.sub;
      const { name, color } = req.body as {
        name?: unknown;
        color?: unknown;
      };

      if (!userId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication required',
        });
      }

      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'name is required',
        });
      }

      if (name.trim().length > 50) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'name must be 50 characters or less',
        });
      }

      if (typeof color !== 'string' || color.trim().length === 0) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'color is required',
        });
      }

      if (color.trim().length > 30) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'color must be 30 characters or less',
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

      const labelResult = await pool.query<{
        id: string;
        org_id: string;
        name: string;
        color: string;
      }>(
        `
        INSERT INTO labels (org_id, name, color)
        VALUES ($1, $2, $3)
        RETURNING id, org_id, name, color
        `,
        [orgId, name.trim(), color.trim()],
      );

      return res.status(201).json({
        label: labelResult.rows[0],
      });
    } catch (error: unknown) {
      const code =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof error.code === 'string'
          ? error.code
          : undefined;

      if (code === '23505') {
        return res.status(409).json({
          error: 'label_exists',
          message: 'A label with this name already exists',
        });
      }

      console.error('[Labels] Create error:', error);

      return res.status(500).json({
        error: 'internal_error',
        message: 'Unable to create label',
      });
    }
  },
);

export default router;