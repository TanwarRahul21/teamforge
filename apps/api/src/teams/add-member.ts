import { Router, type Request, type Response } from 'express';
import { pool, withTransaction } from '@teamforge/db';
import {
  authMiddleware,
  type AuthenticatedRequest,
} from '../auth/middleware.js';

const router = Router();

router.post(
  '/organizations/:orgId/teams/:teamId/members',
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

    const { orgId, teamId } = req.params;

    if (!orgId || !teamId) {
      res.status(400).json({
        error: 'invalid_request',
        message: 'Organization ID and team ID are required',
      });
      return;
    }

    try {
      // Verify the requester belongs to the organization
      // and has permission to manage team membership.
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

      const requesterRole = membershipResult.rows[0].role;

      if (!['org_owner', 'org_admin', 'team_lead'].includes(requesterRole)) {
        res.status(403).json({
          error: 'forbidden',
          message: 'You do not have permission to manage team members',
        });
        return;
      }

      // Verify that the team belongs to this organization.
      const teamResult = await pool.query(
        `SELECT id, org_id, name
         FROM teams
         WHERE id = $1
           AND org_id = $2`,
        [teamId, orgId],
      );

      if (teamResult.rows.length === 0) {
        res.status(404).json({
          error: 'team_not_found',
          message: 'Team not found in this organization',
        });
        return;
      }

      const { userId } = req.body ?? {};

      if (typeof userId !== 'string' || userId.length === 0) {
        res.status(400).json({
          error: 'invalid_request',
          message: 'userId is required',
        });
        return;
      }

      // The target user must first belong to the organization.
      const targetMembershipResult = await pool.query(
        `SELECT user_id
         FROM memberships
         WHERE user_id = $1
           AND org_id = $2`,
        [userId, orgId],
      );

      if (targetMembershipResult.rows.length === 0) {
        res.status(400).json({
          error: 'user_not_in_organization',
          message: 'The user is not a member of this organization',
        });
        return;
      }

      const teamMember = await withTransaction(async (tx) => {
        const result = await tx.query(
          `INSERT INTO team_members (
             team_id,
             user_id
           )
           VALUES ($1, $2)
           ON CONFLICT (team_id, user_id) DO NOTHING
           RETURNING team_id, user_id`,
          [teamId, userId],
        );

        return result.rows[0] ?? null;
      });

      if (!teamMember) {
        res.status(200).json({
          message: 'User is already a member of this team',
          teamMember: {
            team_id: teamId,
            user_id: userId,
          },
        });
        return;
      }

      res.status(201).json({
        teamMember,
      });
    } catch (error: unknown) {
      console.error('[TeamAddMember]', error);

      res.status(500).json({
        error: 'internal_error',
        message: 'Unable to add team member',
      });
    }
  },
);

export default router;