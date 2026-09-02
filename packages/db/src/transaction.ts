import { PoolClient } from 'pg';
import { pool } from './pool';

/**
 * Executes a set of database operations inside a single PostgreSQL transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK, and releases the client back to the pool.
 */
export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
