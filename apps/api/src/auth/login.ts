import { Router, type Request, type Response } from 'express';
import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { pool, withTransaction } from '@teamforge/db';
import { createAccessToken, newRefreshToken } from './tokens.js';
import { createRateLimiter } from './rate-limit.js';

const router = Router();

const loginRateLimiter = createRateLimiter({
  limit: 5,
  windowSeconds: 60,
  prefix: 'login',
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'email and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || password.length === 0) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'email and password are required',
      });
    }

    const identifier = `${req.ip ?? 'unknown'}:${normalizedEmail}`;

    const rateLimit = await loginRateLimiter(identifier);

    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'rate_limited',
        message: 'Too many login attempts. Please try again later.',
      });
    }

    const result = await pool.query(
      `SELECT
         id,
         email,
         password_hash,
         display_name,
         is_active,
         failed_logins,
         locked_until
       FROM users
       WHERE email = $1`,
      [normalizedEmail],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid email or password',
      });
    }

    const user = result.rows[0];

    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid email or password',
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid email or password',
      });
    }

    const passwordValid = await argon2.verify(
      user.password_hash,
      password,
    );

    if (!passwordValid) {
      await pool.query(
        `UPDATE users
         SET
           failed_logins = failed_logins + 1,
           locked_until = CASE
             WHEN failed_logins + 1 >= 5
               THEN NOW() + INTERVAL '15 minutes'
             ELSE locked_until
           END,
           updated_at = NOW()
         WHERE id = $1`,
        [user.id],
      );

      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid email or password',
      });
    }

    await pool.query(
      `UPDATE users
       SET
         failed_logins = 0,
         locked_until = NULL,
         updated_at = NOW()
       WHERE id = $1`,
      [user.id],
    );

    const { accessToken, refreshToken } = await withTransaction(
      async (tx) => {
        const sessionId = randomUUID();
        const familyId = randomUUID();
        const { raw, hash } = newRefreshToken();

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
          [sessionId, user.id, hash, familyId],
        );

        const accessToken = createAccessToken({
          sub: user.id,
          sid: sessionId,
        });

        return {
          accessToken,
          refreshToken: raw,
        };
      },
    );

    return res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
      },
    });
  } catch (error: unknown) {
    console.error('[Login]', error);

    return res.status(500).json({
      error: 'internal_error',
      message: 'Unable to process login',
    });
  }
});

export default router;