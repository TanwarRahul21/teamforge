import fs from 'fs';
import path from 'path';
import { pool } from './pool';
import { withTransaction } from './transaction';

/**
 * Ensures the schema_migrations tracking table exists.
 */
async function ensureMigrationsTable(): Promise<void> {
  const query = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  await pool.query(query);
}

/**
 * Runs all pending SQL migrations found in the migrations folder.
 */
export async function runMigrations(): Promise<void> {
  console.log('[Migration] Starting migrations check...');
  await ensureMigrationsTable();

  // Resolve migrations path relative to dist output
  const migrationsDir = path.resolve(__dirname, '../migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.warn(`[Migration] Migrations directory not found at: ${migrationsDir}`);
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[Migration] No SQL migrations found.');
    return;
  }

  // Get already applied migrations
  const { rows } = await pool.query('SELECT version FROM schema_migrations');
  const applied = new Set(rows.map((r: { version: string }) => r.version));

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    console.log(`[Migration] Applying migration: ${file}`);
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    if (!sql.trim()) {
      console.log(`[Migration] Migration ${file} is empty. Marking as applied.`);
      await pool.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      continue;
    }

    // Run migration in a transaction
    try {
      await withTransaction(async (client) => {
        // Execute the migration SQL
        await client.query(sql);
        // Record the version
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      });
      console.log(`[Migration] Successfully applied migration: ${file}`);
    } catch (err) {
      console.error(`[Migration] Failed to apply migration: ${file}`);
      throw err;
    }
  }

  console.log('[Migration] Migrations check completed.');
}
runMigrations().catch((err: unknown) => {
  console.error('[Migration] Failed:', err);
  process.exit(1);
});
