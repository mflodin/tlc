import { mkdirSync } from 'node:fs'
import * as path from 'node:path'
import type { Database } from 'remix/data-table'
import { loadMigrations } from 'remix/data-table/migrations/node'
import { createSqliteDatabase } from 'remix/data-table/sqlite'

const rootDir = path.resolve(import.meta.dirname, '..')
const migrationsDir = path.join(rootDir, 'db', 'migrations')

/**
 * Opens the SQLite database at `DATABASE_PATH` (default `db/tlc.sqlite`). In Docker, point it at
 * a file inside a mounted volume directory, e.g. `DATABASE_PATH=/data/tlc.sqlite`.
 */
export function openDatabase(
  filename = process.env.DATABASE_PATH ?? path.join(rootDir, 'db', 'tlc.sqlite'),
): Database {
  if (filename !== ':memory:') mkdirSync(path.dirname(path.resolve(filename)), { recursive: true })
  return createSqliteDatabase({ filename, foreignKeys: true })
}

export async function migrateDatabase(db: Database): Promise<void> {
  await db.migrate(await loadMigrations(migrationsDir))
}
