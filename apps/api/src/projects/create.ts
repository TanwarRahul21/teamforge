import { Router, type Request, type Response } from 'express';
import { pool, withTransaction } from '@teamforge/db';
import { authMiddleware, type AuthenticatedRequest } from '../auth/middleware.js';

const router = Router();

router.post(
  '/organizations/:orgId/teams/:teamId/projects',
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
      // Verify the requester belongs to the organization.
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

      // Only organization owners/admins and team leads can create projects.
      const requesterRole = membershipResult.rows[0].role;

      if (!['org_owner', 'org_admin', 'team_lead'].includes(requesterRole)) {
        res.status(403).json({
          error: 'forbidden',
          message: 'You do not have permission to create projects',
        });
        return;
      }

      const { name } = req.body ?? {};

      if (typeof name !== 'string') {
        res.status(400).json({
          error: 'invalid_request',
          message: 'Project name is required',
        });
        return;
      }

      const normalizedName = name.trim();

      if (normalizedName.length < 2 || normalizedName.length > 150) {
        res.status(400).json({
          error: 'invalid_request',
          message: 'Project name must be between 2 and 150 characters',
        });
        return;
      }

      const project = await withTransaction(async (tx) => {
        const projectResult = await tx.query(
          `INSERT INTO projects (
             team_id,
             name
           )
           VALUES ($1, $2)
           RETURNING id, team_id, name`,
          [teamId, normalizedName],
        );

        return projectResult.rows[0];
      });

      res.status(201).json({
        project,
      });
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;

      if (code === '23505') {
        res.status(409).json({
          error: 'project_already_exists',
          message: 'A project with this name already exists in this team',
        });
        return;
      }

      console.error('[ProjectCreate]', error);

      res.status(500).json({
        error: 'internal_error',
        message: 'Unable to create project',
      });
    }
  },
);

export default router;
