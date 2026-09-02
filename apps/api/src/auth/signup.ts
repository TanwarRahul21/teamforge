import { Router, type Request, type Response } from 'express';
import argon2 from 'argon2';
import { pool } from '@teamforge/db';

const router = Router();

router.post('/auth/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body ?? {};

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof displayName !== 'string'
    ) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'email, password and displayName are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = displayName.trim();

    if (!normalizedEmail || !trimmedName || password.length < 8) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Invalid signup data',
      });
    }

    const passwordHash = await argon2.hash(password);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, created_at`,
      [normalizedEmail, passwordHash, trimmedName],
    );

    return res.status(201).json({
      user: result.rows[0],
    });
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;

    if (code === '23505') {
      return res.status(409).json({
        error: 'email_already_exists',
        message: 'An account with this email already exists',
      });
    }

    console.error('[Signup]', error);

    return res.status(500).json({
      error: 'internal_error',
      message: 'Unable to create account',
    });
  }
});

export default router;