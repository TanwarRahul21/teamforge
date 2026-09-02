import { pool } from '@teamforge/db';

export async function isSessionActive(
  sessionId: string,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1
     FROM sessions
     WHERE id = $1
       AND revoked_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [sessionId],
  );

  return result.rows.length > 0;
}