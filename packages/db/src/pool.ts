import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/teamforge';

export const pool = new Pool({
  connectionString,
});

// Helper to shut down pool during tests/app exit
export async function closePool(): Promise<void> {
  await pool.end();
}
