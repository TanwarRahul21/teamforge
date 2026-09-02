import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { pool } from '@teamforge/db';

const router = Router();

function hashRefreshToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

router.post('/auth/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body ?? {};

    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'refreshToken is required',
      });
    }

    const refreshHash = hashRefreshToken(refreshToken);

    const result = await pool.query(
      `UPDATE sessions
       SET revoked_at = NOW()
       WHERE refresh_hash = $1
         AND revoked_at IS NULL
       RETURNING id`,
      [refreshHash],
    );

    // Logout is intentionally idempotent:
    // logging out an already-revoked/nonexistent token still succeeds.
    return res.status(200).json({
      message: 'Logout successful',
      revoked: result.rows.length > 0,
    });
  } catch (error: unknown) {
    console.error('[Logout]', error);

    return res.status(500).json({
      error: 'internal_error',
      message: 'Unable to process logout',
    });
  }
});

export default router;