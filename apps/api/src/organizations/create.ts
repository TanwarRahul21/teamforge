import { Router, type Request, type Response } from 'express';
import { withTransaction } from '@teamforge/db';
import { authMiddleware, type AuthenticatedRequest } from '../auth/middleware.js';

const router = Router();

router.post('/organizations', authMiddleware, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;

  if (!authenticatedReq.user) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  try {
    const { name, slug } = req.body ?? {};

    if (typeof name !== 'string' || typeof slug !== 'string') {
      res.status(400).json({
        error: 'invalid_request',
        message: 'name and slug are required',
      });
      return;
    }

    const normalizedName = name.trim();
    const normalizedSlug = slug.trim().toLowerCase();

    if (normalizedName.length < 2 || normalizedName.length > 100) {
      res.status(400).json({
        error: 'invalid_request',
        message: 'Organization name must be between 2 and 100 characters',
      });
      return;
    }

    if (
      normalizedSlug.length < 2 ||
      normalizedSlug.length > 50 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)
    ) {
      res.status(400).json({
        error: 'invalid_request',
        message:
          'Slug must be 2-50 characters and contain only lowercase letters, numbers, and hyphens',
      });
      return;
    }

    const organization = await withTransaction(async (tx) => {
      const organizationResult = await tx.query(
        `INSERT INTO organizations (
             name,
             slug,
             owner_id
           )
           VALUES ($1, $2, $3)
           RETURNING
             id,
             name,
             slug,
             owner_id,
             created_at`,
        [normalizedName, normalizedSlug, authenticatedReq.user!.sub],
      );

      const createdOrganization = organizationResult.rows[0];

      await tx.query(
        `INSERT INTO memberships (
             user_id,
             org_id,
             role
           )
           VALUES ($1, $2, 'org_owner')`,
        [authenticatedReq.user!.sub, createdOrganization.id],
      );

      return createdOrganization;
    });

    res.status(201).json({
      organization,
    });
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;

    if (code === '23505') {
      res.status(409).json({
        error: 'slug_already_exists',
        message: 'An organization with this slug already exists',
      });
      return;
    }

    console.error('[OrganizationCreate]', error);

    res.status(500).json({
      error: 'internal_error',
      message: 'Unable to create organization',
    });
  }
});

export default router;
