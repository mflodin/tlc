import { sql, type Database } from 'remix/data-table'

import { lyricsText, parseSong, serializeSong, songBody, type Song, type SongMeta } from './chordpro.ts'
import { slugify, uniqueId } from './slug.ts'
import { isSongId, songId, songParams } from './song-id.ts'
import { songs, type SongRow } from './tables.ts'

/** A song row plus its parsed ChordPro. */
export interface StoredSong {
  /** Database row id; setlists reference this, so it survives renames. */
  id: number
  /** "<artist>/<song>", used in URLs. See song-id.ts. */
  slug: string
  /** Full ChordPro text, metadata directives included. */
  text: string
  /** ChordPro text without the metadata directives (what the edit form shows). */
  body: string
  song: Song
  title: string
  artist: string
  album?: string
}

export function toStoredSong(row: SongRow): StoredSong {
  let meta = rowMeta(row)
  let text = serializeSong(meta, row.body)
  return {
    id: row.id,
    slug: songId({ artist: row.artist_slug, song: row.song_slug }),
    text,
    body: row.body,
    song: parseSong(text),
    title: row.title,
    artist: row.artist,
    album: row.album ?? undefined,
  }
}

function rowMeta(row: SongRow): SongMeta {
  return {
    title: row.title,
    artist: row.artist,
    album: row.album ?? undefined,
    key: row.song_key ?? undefined,
    capo: row.capo ?? undefined,
  }
}

/** Column values for a song with the given metadata and ChordPro body. */
function songColumns(meta: SongMeta, body: string) {
  // NFC so "ä" is stored the same way whether it was typed or pasted from a decomposed source.
  let nfc = (value: string | undefined) => value?.normalize('NFC') ?? null
  let cleanBody = songBody(body).normalize('NFC').trimEnd()
  let cleanMeta: SongMeta = {
    title: meta.title.normalize('NFC'),
    artist: meta.artist.normalize('NFC'),
    album: nfc(meta.album) ?? undefined,
    key: nfc(meta.key) ?? undefined,
    capo: nfc(meta.capo) ?? undefined,
  }
  return {
    title: cleanMeta.title,
    artist: cleanMeta.artist,
    album: cleanMeta.album ?? null,
    song_key: cleanMeta.key ?? null,
    capo: cleanMeta.capo ?? null,
    body: cleanBody,
    lyrics: lyricsText(parseSong(serializeSong(cleanMeta, cleanBody))),
  }
}

/** Picks free slugs for the metadata, keeping the current ones when they still fit. */
async function slugsFor(db: Database, meta: SongMeta, current?: SongRow) {
  let artistSlug = slugify(meta.artist)
  let base = slugify(meta.title)
  if (current && current.artist_slug === artistSlug && current.song_slug === base) {
    return { artist_slug: artistSlug, song_slug: base }
  }
  let sameArtist = await db.findMany(songs, { where: { artist_slug: artistSlug } })
  let taken = new Set(sameArtist.filter((row) => row.id !== current?.id).map((row) => row.song_slug))
  return { artist_slug: artistSlug, song_slug: uniqueId(base, taken) }
}

async function findRow(db: Database, slug: string): Promise<SongRow | null> {
  slug = slug.normalize('NFC')
  if (!isSongId(slug)) return null
  let { artist, song } = songParams(slug)
  return db.findOne(songs, { where: { artist_slug: artist, song_slug: song } })
}

export async function listSongs(db: Database): Promise<StoredSong[]> {
  let rows = await db.findMany(songs, {})
  return rows
    .map(toStoredSong)
    .sort(
      (a, b) => a.artist.localeCompare(b.artist, 'sv') || a.title.localeCompare(b.title, 'sv'),
    )
}

export async function getSong(db: Database, slug: string): Promise<StoredSong | null> {
  let row = await findRow(db, slug)
  return row ? toStoredSong(row) : null
}

export async function createSong(db: Database, meta: SongMeta, body: string): Promise<string> {
  return db.transaction(async (tx) => {
    let slugs = await slugsFor(tx, meta)
    await tx.create(songs, { ...slugs, ...songColumns(meta, body) })
    return songId({ artist: slugs.artist_slug, song: slugs.song_slug })
  })
}

/**
 * Saves the song. Its slug follows the artist and title so the URL stays in sync; setlists
 * reference the row id and are unaffected. Returns the (possibly new) slug, or null if missing.
 */
export async function updateSong(
  db: Database,
  slug: string,
  meta: SongMeta,
  body: string,
): Promise<string | null> {
  return db.transaction(async (tx) => {
    let row = await findRow(tx, slug)
    if (!row) return null
    let slugs = await slugsFor(tx, meta, row)
    await tx.exec(sql`update songs set updated_at = datetime('now') where id = ${row.id}`)
    await tx.update(songs, row.id, { ...slugs, ...songColumns(meta, body) })
    return songId({ artist: slugs.artist_slug, song: slugs.song_slug })
  })
}

/**
 * Recomputes every song's slug from its artist and title, e.g. after the slug rules change.
 * Returns how many changed.
 */
export async function refreshSongSlugs(db: Database): Promise<number> {
  return db.transaction(async (tx) => {
    let changed = 0
    for (let row of await tx.findMany(songs, { orderBy: ['id', 'asc'] })) {
      let slugs = await slugsFor(tx, rowMeta(row), row)
      if (slugs.artist_slug !== row.artist_slug || slugs.song_slug !== row.song_slug) {
        await tx.update(songs, row.id, slugs)
        changed++
      }
    }
    return changed
  })
}

/** Deletes the song; the database removes it from setlists too. */
export async function deleteSong(db: Database, slug: string): Promise<boolean> {
  let row = await findRow(db, slug)
  return row ? db.delete(songs, row.id) : false
}
