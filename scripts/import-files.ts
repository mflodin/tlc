// Imports ChordPro files and setlists into the database.
//
//   npm run db:import [-- <dir>]     (default dir: ./data)
//
// Reads every *.cho file under <dir>/songs (any depth) and, if present, <dir>/setlists.json with
// entries like { "name": "...", "songIds": ["<artist>/<song>", ...] } where song ids are the file
// paths relative to <dir>/songs without the extension. Songs and setlists that already exist are
// skipped, so running it twice is safe.
import { readdir, readFile } from 'node:fs/promises'
import * as path from 'node:path'

import { parseSong, songBody } from '../app/data/chordpro.ts'
import { addSongToSetlist, createSetlist, getSetlist } from '../app/data/setlists.ts'
import { slugify } from '../app/data/slug.ts'
import { songId } from '../app/data/song-id.ts'
import { createSong, getSong } from '../app/data/songs.ts'
import { migrateDatabase, openDatabase } from '../app/db.ts'

const dir = path.resolve(process.argv[2] ?? 'data')
const songsDir = path.join(dir, 'songs')

const db = openDatabase()
await migrateDatabase(db)

// Maps a file's path id ("artist/song") to the slug it has in the database.
const imported = new Map<string, string>()
let created = 0
let skipped = 0

for (let entry of await readdir(songsDir, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.cho')) continue

  let file = path.join(entry.parentPath, entry.name)
  let pathId = path.relative(songsDir, file).slice(0, -'.cho'.length).split(path.sep).join('/')
  let text = await readFile(file, 'utf8')
  let song = parseSong(text)

  if (!song.title || !song.artist) {
    console.warn(`Skipping ${pathId}: needs {title: ...} and {artist: ...}`)
    skipped++
    continue
  }

  let slug = songId({ artist: slugify(song.artist), song: slugify(song.title) })
  if (await getSong(db, slug)) {
    skipped++
  } else {
    let meta = { title: song.title, artist: song.artist, album: song.album, key: song.key, capo: song.capo }
    slug = await createSong(db, meta, songBody(text))
    created++
  }
  imported.set(pathId, slug)
}

console.log(`Songs: ${created} imported, ${skipped} skipped.`)

let setlistsFile = path.join(dir, 'setlists.json')
let setlists: Array<{ name: string; songIds: string[] }> = []
try {
  setlists = JSON.parse(await readFile(setlistsFile, 'utf8'))
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}

for (let { name, songIds } of setlists) {
  if (await getSetlist(db, slugify(name))) {
    console.log(`Setlist "${name}" already exists, skipped.`)
    continue
  }
  let slug = await createSetlist(db, name)
  for (let pathId of songIds) {
    let songSlug = imported.get(pathId)
    if (songSlug) await addSongToSetlist(db, slug, songSlug)
    else console.warn(`Setlist "${name}": no song ${pathId}`)
  }
  console.log(`Setlist "${name}" imported with ${songIds.length} songs.`)
}

await db.close()
