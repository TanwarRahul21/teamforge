import { Router, type Request, type Response } from 'express';
import { pool } from '@teamforge/db';
import { authMiddleware, type AuthenticatedRequest } from './middleware.js';

const router = Router();

router.post(
  '/auth/revoke-all',
  authMiddleware,
  async (req: Request, res: Response) => {
    const authenticatedReq = req as AuthenticatedRequest;

    if (!authenticatedReq.user) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required',
      });
    }

    try {
      const result = await pool.query(
        `UPDATE sessions
         SET revoked_at = NOW()
         WHERE user_id = $1
           AND revoked_at IS NULL
         RETURNING id`,
        [authenticatedReq.user.sub],
      );

      return res.status(200).json({
        message: 'All sessions revoked',
        revokedCount: result.rows.length,
      });
    } catch (error: unknown) {
      console.error('[RevokeAll]', error);

      return res.status(500).json({
        error: 'internal_error',
        message: 'Unable to revoke sessions',
      });
    }
  },
);

export default router;