import { type PoolClient } from 'pg';
import { pool } from '@teamforge/db';

export interface OutboxEvent {
  type: string;
  payload: Record<string, unknown>;
}

export async function writeOutboxEvent(
  event: OutboxEvent,
  client?: PoolClient,
): Promise<void> {
  const db = client ?? pool;

  await db.query(
    `
    INSERT INTO outbox (
      type,
      payload
    )
    VALUES ($1, $2::jsonb)
    `,
    [event.type, JSON.stringify(event.payload)],
  );
}