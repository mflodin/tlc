export interface Segment {
  chord?: string
  lyric: string
}

export type Block =
  | { type: 'heading'; text: string }
  | { type: 'line'; segments: Segment[]; chorus: boolean }
  | { type: 'empty' }
  | { type: 'tab'; text: string }

export interface SongMeta {
  title: string
  artist: string
  album?: string
  key?: string
  capo?: string
}

export interface Song extends SongMeta {
  blocks: Block[]
}

const META_DIRECTIVES: Record<string, keyof SongMeta> = {
  title: 'title',
  t: 'title',
  artist: 'artist',
  a: 'artist',
  album: 'album',
  key: 'key',
  capo: 'capo',
}

const COMMENT_DIRECTIVES = new Set(['comment', 'c', 'comment_italic', 'ci', 'comment_box', 'cb'])

const SECTION_START: Record<string, string> = {
  start_of_verse: 'Verse',
  sov: 'Verse',
  start_of_chorus: 'Chorus',
  soc: 'Chorus',
  start_of_bridge: 'Bridge',
  sob: 'Bridge',
}

const SECTION_END = new Set(['end_of_verse', 'eov', 'end_of_chorus', 'eoc', 'end_of_bridge', 'eob'])

const TAB_START = new Set(['start_of_tab', 'sot'])
const TAB_END = new Set(['end_of_tab', 'eot'])

const DIRECTIVE = /^\{\s*([a-z_]+)\s*(?::\s*(.*?))?\s*\}$/i

function parseDirective(line: string): { name: string; value: string } | null {
  let match = DIRECTIVE.exec(line.trim())
  if (!match) return null
  return { name: match[1].toLowerCase(), value: match[2] ?? '' }
}

export function parseLine(line: string): Segment[] {
  let segments: Segment[] = []
  let pattern = /\[([^\]]*)\]/g
  let lastIndex = 0
  let chord: string | undefined
  let match: RegExpExecArray | null

  while ((match = pattern.exec(line))) {
    let lyric = line.slice(lastIndex, match.index)
    if (chord !== undefined || lyric !== '') segments.push({ chord, lyric })
    chord = match[1].trim()
    lastIndex = pattern.lastIndex
  }
  segments.push({ chord, lyric: line.slice(lastIndex) })

  return segments
}

export function parseSong(text: string): Song {
  let song: Song = { title: '', artist: '', blocks: [] }
  let chorus = false
  let tabLines: string[] | null = null

  for (let rawLine of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = rawLine.trimEnd()
    let directive = parseDirective(line)

    if (tabLines) {
      if (directive && TAB_END.has(directive.name)) {
        song.blocks.push({ type: 'tab', text: tabLines.join('\n') })
        tabLines = null
      } else {
        tabLines.push(line)
      }
      continue
    }

    if (directive) {
      let { name, value } = directive
      let metaKey = META_DIRECTIVES[name]
      if (metaKey) {
        song[metaKey] = value
      } else if (COMMENT_DIRECTIVES.has(name)) {
        song.blocks.push({ type: 'heading', text: value })
      } else if (name in SECTION_START) {
        song.blocks.push({ type: 'heading', text: value || SECTION_START[name] })
        chorus = name === 'start_of_chorus' || name === 'soc'
      } else if (SECTION_END.has(name)) {
        chorus = false
      } else if (TAB_START.has(name)) {
        tabLines = []
      }
      continue
    }

    if (line.startsWith('#')) continue

    if (line.trim() === '') {
      song.blocks.push({ type: 'empty' })
    } else {
      song.blocks.push({ type: 'line', segments: parseLine(line), chorus })
    }
  }

  if (tabLines) song.blocks.push({ type: 'tab', text: tabLines.join('\n') })

  return song
}

export function lyricsText(song: Song): string {
  return song.blocks
    .filter((block) => block.type === 'line')
    .map((block) =>
      block.segments
        .map((segment) => segment.lyric)
        .join('')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n')
}

const STORED_META = new Set(Object.keys(META_DIRECTIVES))

/** Returns the song text without the metadata directives that the form edits as separate fields. */
export function songBody(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => {
      let directive = parseDirective(line)
      return !(directive && STORED_META.has(directive.name))
    })
    .join('\n')
    .replace(/^\n+/, '')
}

export function serializeSong(meta: SongMeta, body: string): string {
  let header = [
    `{title: ${meta.title}}`,
    `{artist: ${meta.artist}}`,
    meta.album ? `{album: ${meta.album}}` : null,
    meta.key ? `{key: ${meta.key}}` : null,
    meta.capo ? `{capo: ${meta.capo}}` : null,
  ].filter((line) => line !== null)

  return `${header.join('\n')}\n\n${songBody(body).trimEnd()}\n`
}
