import { isSafeId } from './slug.ts'

/** A song is identified by "<artist>/<song>", matching both its URL and its file path. */
// A type alias (not an interface) so it's assignable to `href()`'s params type.
export type SongParams = {
  artist: string
  song: string
}

/** NFC-normalized, so a URL typed with decomposed "a" + "¨" still finds "ä". */
export function songId(params: SongParams): string {
  return `${params.artist}/${params.song}`.normalize('NFC')
}

export function isSongId(id: string): boolean {
  let parts = id.split('/')
  return parts.length === 2 && parts.every(isSafeId)
}

/** Splits an id into route params. Only call with ids that passed `isSongId`. */
export function songParams(id: string): SongParams {
  let [artist, song] = id.split('/')
  return { artist, song }
}
