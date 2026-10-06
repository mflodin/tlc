import type { Database } from 'remix/data-table'
import { createContextKey, type Middleware } from 'remix/router'

export const databaseContext = createContextKey<Database>()

/** Exposes the app's shared database as `context.db`. */
export function loadDatabase(db: Database): Middleware<{
  key: typeof databaseContext
  value: Database
  property: 'db'
}> {
  return (context, next) => {
    context.set(databaseContext, db, { property: 'db' })
    return next()
  }
}
