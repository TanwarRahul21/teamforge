import { type PoolClient } from 'pg';
import { pool } from '@teamforge/db';

export interface AuditLogInput {
  orgId?: string | null;
  actorId?: string | null;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

export async function writeAuditLog(
  input: AuditLogInput,
  client?: PoolClient,
): Promise<void> {
  const db = client ?? pool;

  await db.query(
    `
    INSERT INTO audit_log (
      org_id,
      actor_id,
      action,
      resource,
      metadata,
      ip
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6)
    `,
    [
      input.orgId ?? null,
      input.actorId ?? null,
      input.action,
      input.resource,
      JSON.stringify(input.metadata ?? {}),
      input.ip ?? null,
    ],
  );
}