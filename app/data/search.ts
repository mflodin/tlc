import { sql, type Database } from 'remix/data-table'

import { toStoredSong, type StoredSong } from './songs.ts'
import type { SongRow } from './tables.ts'

export const SEARCH_FIELDS = ['all', 'title', 'artist', 'album', 'lyrics'] as const
export type SearchField = (typeof SEARCH_FIELDS)[number]

export interface SnippetPart {
  text: string
  match: boolean
}

export interface SearchResult {
  song: StoredSong
  /** Lyrics around the match, when the lyrics matched. */
  snippet?: SnippetPart[]
}

// Marks matches in FTS snippets; control characters can't appear in stored lyrics.
const MATCH_START = '\u0002'
const MATCH_END = '\u0003'

// bm25 column weights for title, artist, album and lyrics: title matches rank highest.
const WEIGHTS = [10, 6, 3, 1] as const

export function isSearchField(value: string): value is SearchField {
  return (SEARCH_FIELDS as readonly string[]).includes(value)
}

/** Splits a query into terms; "quoted phrases" stay together. */
export function parseQuery(query: string): string[] {
  let terms: string[] = []
  // NFC to match the stored text: å, ä and ö are distinct letters in the search index.
  for (let match of query.normalize('NFC').toLowerCase().matchAll(/"([^"]+)"|(\S+)/g)) {
    let term = (match[1] ?? match[2]).replace(/"/g, '').trim()
    if (term) terms.push(term)
  }
  return terms
}

/**
 * Builds an FTS5 match expression: every term must match, words match as prefixes ("morn"
 * finds "morning") and quoted phrases match exactly.
 */
export function toFtsQuery(query: string, field: SearchField = 'all'): string | null {
  let terms = parseQuery(query).map((term) => (term.includes(' ') ? `"${term}"` : `"${term}"*`))
  if (terms.length === 0) return null
  let expression = terms.join(' AND ')
  return field === 'all' ? expression : `${field} : (${expression})`
}

export function parseSnippet(snippet: string): SnippetPart[] {
  let parts: SnippetPart[] = []
  for (let [index, chunk] of snippet.split(MATCH_START).entries()) {
    let [matched, rest] = index === 0 ? [null, chunk] : chunk.split(MATCH_END)
    if (matched) parts.push({ text: matched, match: true })
    if (rest) parts.push({ text: rest, match: false })
  }
  return parts
}

export async function searchSongs(
  db: Database,
  query: string,
  field: SearchField = 'all',
): Promise<SearchResult[]> {
  let ftsQuery = toFtsQuery(query, field)
  if (!ftsQuery) return []

  let result = await db.exec(sql`
    select songs.*, snippet(songs_fts, 3, ${MATCH_START}, ${MATCH_END}, '…', 12) as snippet
    from songs_fts
    join songs on songs.id = songs_fts.rowid
    where songs_fts match ${ftsQuery}
    order by bm25(songs_fts, ${WEIGHTS[0]}, ${WEIGHTS[1]}, ${WEIGHTS[2]}, ${WEIGHTS[3]}), songs.title
  `)

  return ((result.rows ?? []) as unknown as Array<SongRow & { snippet: string }>).map((row) => ({
    song: toStoredSong(row),
    snippet: row.snippet.includes(MATCH_START) ? parseSnippet(row.snippet) : undefined,
  }))
}
