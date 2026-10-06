import type { Database } from 'remix/data-table'

import { migrateDatabase, openDatabase } from '../app/db.ts'

/** A fresh, migrated in-memory database for one test file. */
export async function createTestDatabase(): Promise<Database> {
  let db = openDatabase(':memory:')
  await migrateDatabase(db)
  return db
}
