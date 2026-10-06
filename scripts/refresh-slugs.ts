// Recomputes song and setlist slugs from their titles/names, e.g. after the slug rules change.
// Old URLs stop working for anything that changes.
//
//   npm run db:refresh-slugs
import { refreshSetlistSlugs } from '../app/data/setlists.ts'
import { refreshSongSlugs } from '../app/data/songs.ts'
import { migrateDatabase, openDatabase } from '../app/db.ts'

const db = openDatabase()
await migrateDatabase(db)

console.log(`Songs: ${await refreshSongSlugs(db)} slugs updated.`)
console.log(`Setlists: ${await refreshSetlistSlugs(db)} slugs updated.`)

await db.close()
