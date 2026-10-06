import { sql, type Database } from 'remix/data-table'

import { isSafeId, slugify, uniqueId } from './slug.ts'
import { getSong } from './songs.ts'
import { songId } from './song-id.ts'
import { setlists } from './tables.ts'

/** A setlist as the UI sees it: identified by slug, with song slugs in play order. */
export interface Setlist {
  id: string
  name: string
  songIds: string[]
}

interface SetlistSongRow {
  slug: string
  name: string
  artist_slug: string | null
  song_slug: string | null
}

/** Loads all setlists, or only the one with `onlySlug`. */
async function querySetlists(db: Database, onlySlug: string | null = null): Promise<Setlist[]> {
  let result = await db.exec(sql`
    select s.slug, s.name, so.artist_slug, so.song_slug
    from setlists s
    left join setlist_songs ss on ss.setlist_id = s.id
    left join songs so on so.id = ss.song_id
    where ${onlySlug} is null or s.slug = ${onlySlug}
    order by s.name, s.id, ss.position
  `)

  let bySlug = new Map<string, Setlist>()
  for (let row of (result.rows ?? []) as unknown as SetlistSongRow[]) {
    let setlist = bySlug.get(row.slug)
    if (!setlist) {
      setlist = { id: row.slug, name: row.name, songIds: [] }
      bySlug.set(row.slug, setlist)
    }
    if (row.artist_slug && row.song_slug) {
      setlist.songIds.push(songId({ artist: row.artist_slug, song: row.song_slug }))
    }
  }
  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name, 'sv'))
}

async function findRowId(db: Database, slug: string): Promise<number | null> {
  if (!isSafeId(slug)) return null
  let row = await db.findOne(setlists, { where: { slug } })
  return row?.id ?? null
}

/** Applies `change` to the ordered song row ids of a setlist and saves the new order. */
async function reorder(
  db: Database,
  slug: string,
  change: (songIds: number[]) => void,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    let setlistId = await findRowId(tx, slug)
    if (setlistId === null) return false

    let result = await tx.exec(sql`
      select song_id from setlist_songs where setlist_id = ${setlistId} order by position
    `)
    let songIds = ((result.rows ?? []) as Array<{ song_id: number }>).map((row) => row.song_id)
    change(songIds)

    await tx.exec(sql`delete from setlist_songs where setlist_id = ${setlistId}`)
    for (let [index, songIdValue] of songIds.entries()) {
      await tx.exec(sql`
        insert into setlist_songs (setlist_id, song_id, position)
        values (${setlistId}, ${songIdValue}, ${index + 1})
      `)
    }
    return true
  })
}

export function listSetlists(db: Database): Promise<Setlist[]> {
  return querySetlists(db)
}

export async function getSetlist(db: Database, slug: string): Promise<Setlist | null> {
  slug = slug.normalize('NFC')
  if (!isSafeId(slug)) return null
  let [setlist] = await querySetlists(db, slug)
  return setlist ?? null
}

export async function setlistsContaining(db: Database, songSlug: string): Promise<Setlist[]> {
  return (await listSetlists(db)).filter((s) => s.songIds.includes(songSlug))
}

export async function createSetlist(db: Database, name: string): Promise<string> {
  name = name.normalize('NFC')
  return db.transaction(async (tx) => {
    let existing = await tx.findMany(setlists, {})
    let slug = uniqueId(slugify(name), new Set(existing.map((s) => s.slug)))
    await tx.create(setlists, { slug, name })
    return slug
  })
}

/** Renames the setlist but keeps its slug, so links to it keep working. */
export async function renameSetlist(db: Database, slug: string, name: string): Promise<boolean> {
  let id = await findRowId(db, slug)
  if (id === null) return false
  await db.update(setlists, id, { name: name.normalize('NFC') })
  return true
}

/** Recomputes every setlist slug from its name, e.g. after the slug rules change. */
export async function refreshSetlistSlugs(db: Database): Promise<number> {
  return db.transaction(async (tx) => {
    let rows = await tx.findMany(setlists, { orderBy: ['id', 'asc'] })
    let taken = new Set<string>()
    let changes: Array<{ id: number; slug: string }> = []
    for (let row of rows) {
      let slug = uniqueId(slugify(row.name), taken)
      taken.add(slug)
      if (slug !== row.slug) changes.push({ id: row.id, slug })
    }
    // Move changed rows to temporary slugs first so swaps can't hit the unique constraint.
    for (let { id } of changes) await tx.update(setlists, id, { slug: `tmp-${id}` })
    for (let { id, slug } of changes) await tx.update(setlists, id, { slug })
    return changes.length
  })
}

/** Deletes the setlist; its songs are kept. */
export async function deleteSetlist(db: Database, slug: string): Promise<boolean> {
  let id = await findRowId(db, slug)
  return id === null ? false : db.delete(setlists, id)
}

/** Adds a song to the end of the setlist. A song appears at most once per setlist. */
export async function addSongToSetlist(
  db: Database,
  slug: string,
  songSlug: string,
): Promise<boolean> {
  let song = await getSong(db, songSlug)
  if (!song) return false
  return reorder(db, slug, (songIds) => {
    if (!songIds.includes(song.id)) songIds.push(song.id)
  })
}

export function removeSongAt(db: Database, slug: string, index: number): Promise<boolean> {
  return reorder(db, slug, (songIds) => {
    if (index >= 0 && index < songIds.length) songIds.splice(index, 1)
  })
}

export function moveSong(
  db: Database,
  slug: string,
  index: number,
  offset: -1 | 1,
): Promise<boolean> {
  return reorder(db, slug, (songIds) => {
    let target = index + offset
    if (index < 0 || target < 0 || target >= songIds.length) return
    ;[songIds[index], songIds[target]] = [songIds[target], songIds[index]]
  })
}
