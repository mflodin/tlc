import { column as c, table, type TableRow } from 'remix/data-table'

// Keep in sync with db/migrations. setlist_songs and songs_fts are queried with SQL directly.

export const songs = table({
  name: 'songs',
  columns: {
    id: c.integer(),
    artist_slug: c.text(),
    song_slug: c.text(),
    title: c.text(),
    artist: c.text(),
    album: c.text().nullable(),
    song_key: c.text().nullable(),
    capo: c.text().nullable(),
    body: c.text(),
    lyrics: c.text(),
    created_at: c.text(),
    updated_at: c.text(),
  },
})

export const setlists = table({
  name: 'setlists',
  columns: {
    id: c.integer(),
    slug: c.text(),
    name: c.text(),
  },
})

export const users = table({
  name: 'users',
  columns: {
    id: c.integer(),
    username: c.text(),
    password_hash: c.text(),
    role: c.enum(['viewer', 'editor']),
    session_version: c.integer(),
    created_at: c.text(),
  },
})

export type SongRow = TableRow<typeof songs>
export type UserRow = TableRow<typeof users>
export type SetlistRow = TableRow<typeof setlists>
