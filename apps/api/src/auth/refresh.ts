import { Router, type Request, type Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { pool, withTransaction } from '@teamforge/db';
import { createAccessToken, newRefreshToken } from './tokens.js';

const router = Router();

function hashRefreshToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

router.post('/auth/refresh', async (req: Request, res: Response) => {
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
      `SELECT
         id,
         user_id,
         family_id,
         expires_at,
         revoked_at
       FROM sessions
       WHERE refresh_hash = $1`,
      [refreshHash],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'invalid_refresh_token',
        message: 'Refresh token is invalid',
      });
    }

    const session = result.rows[0];

    // A previously-used refresh token was presented again.
    // Revoke the entire token family to stop further reuse.
    if (session.revoked_at) {
      await pool.query(
        `UPDATE sessions
         SET revoked_at = COALESCE(revoked_at, NOW())
         WHERE family_id = $1`,
        [session.family_id],
      );

      return res.status(401).json({
        error: 'refresh_token_reuse',
        message: 'Refresh token reuse detected',
      });
    }

    if (new Date(session.expires_at).getTime() <= Date.now()) {
      return res.status(401).json({
        error: 'refresh_token_expired',
        message: 'Refresh token has expired',
      });
    }

    const rotated = await withTransaction(async (tx) => {
      // Lock the current session row so concurrent refresh requests
      // cannot successfully rotate the same token twice.
      const locked = await tx.query(
        `SELECT
           id,
           user_id,
           family_id,
           expires_at,
           revoked_at
         FROM sessions
         WHERE id = $1
         FOR UPDATE`,
        [session.id],
      );

      if (locked.rows.length === 0) {
        throw new Error('Session disappeared during refresh');
      }

      const current = locked.rows[0];

      if (current.revoked_at) {
        await tx.query(
          `UPDATE sessions
           SET revoked_at = COALESCE(revoked_at, NOW())
           WHERE family_id = $1`,
          [current.family_id],
        );

        throw new Error('REFRESH_TOKEN_REUSE');
      }

      if (new Date(current.expires_at).getTime() <= Date.now()) {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      }

      const { raw: newRawToken, hash: newHash } = newRefreshToken();
      const newSessionId = randomUUID();

      // Revoke the old session token.
      await tx.query(
        `UPDATE sessions
         SET revoked_at = NOW()
         WHERE id = $1`,
        [current.id],
      );

      // Create the rotated session inside the same transaction.
      await tx.query(
        `INSERT INTO sessions (
           id,
           user_id,
           refresh_hash,
           family_id,
           expires_at
         )
         VALUES (
           $1,
           $2,
           $3,
           $4,
           NOW() + INTERVAL '30 days'
         )`,
        [
          newSessionId,
          current.user_id,
          newHash,
          current.family_id,
        ],
      );

      const accessToken = createAccessToken({
        sub: current.user_id,
        sid: newSessionId,
      });

      return {
        accessToken,
        refreshToken: newRawToken,
      };
    });

    return res.status(200).json(rotated);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'REFRESH_TOKEN_REUSE') {
        return res.status(401).json({
          error: 'refresh_token_reuse',
          message: 'Refresh token reuse detected',
        });
      }

      if (error.message === 'REFRESH_TOKEN_EXPIRED') {
        return res.status(401).json({
          error: 'refresh_token_expired',
          message: 'Refresh token has expired',
        });
      }
    }

    console.error('[Refresh]', error);

    return res.status(500).json({
      error: 'internal_error',
      message: 'Unable to refresh session',
    });
  }
});

export default router;