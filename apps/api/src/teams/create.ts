import { Router, type Request, type Response } from 'express';
import { pool, withTransaction } from '@teamforge/db';
import {
  authMiddleware,
  type AuthenticatedRequest,
} from '../auth/middleware.js';

const router = Router();

router.post(
  '/organizations/:orgId/teams',
  authMiddleware,
  async (req: Request, res: Response) => {
    const authenticatedReq = req as AuthenticatedRequest;

    if (!authenticatedReq.user) {
      res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { orgId } = req.params;

    if (!orgId) {
      res.status(400).json({
        error: 'invalid_request',
        message: 'Organization ID is required',
      });
      return;
    }

    try {
      const membershipResult = await pool.query(
        `SELECT role
         FROM memberships
         WHERE user_id = $1
           AND org_id = $2`,
        [authenticatedReq.user.sub, orgId],
      );

      if (membershipResult.rows.length === 0) {
        res.status(403).json({
          error: 'forbidden',
          message: 'You are not a member of this organization',
        });
        return;
      }

      const role = membershipResult.rows[0].role;

      if (!['org_owner', 'org_admin', 'team_lead'].includes(role)) {
        res.status(403).json({
          error: 'forbidden',
          message: 'You do not have permission to create teams',
        });
        return;
      }

      const { name } = req.body ?? {};

      if (typeof name !== 'string') {
        res.status(400).json({
          error: 'invalid_request',
          message: 'Team name is required',
        });
        return;
      }

      const normalizedName = name.trim();

      if (normalizedName.length < 2 || normalizedName.length > 100) {
        res.status(400).json({
          error: 'invalid_request',
          message: 'Team name must be between 2 and 100 characters',
        });
        return;
      }

      const team = await withTransaction(async (tx) => {
        const teamResult = await tx.query(
          `INSERT INTO teams (
             org_id,
             name
           )
           VALUES ($1, $2)
           RETURNING id, org_id, name`,
          [orgId, normalizedName],
        );

        return teamResult.rows[0];
      });

      res.status(201).json({
        team,
      });
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;

      if (code === '23505') {
        res.status(409).json({
          error: 'team_already_exists',
          message: 'A team with this name already exists in this organization',
        });
        return;
      }

      console.error('[TeamCreate]', error);

      res.status(500).json({
        error: 'internal_error',
        message: 'Unable to create team',
      });
    }
  },
);

export default router;