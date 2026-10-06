import { parseSong, songBody, type SongMeta } from './chordpro.ts'

// Converts "chords above lyrics" text (the format most chord sites use) into ChordPro.
// ChordPro input is passed through unchanged.

export type SourceFormat = 'chordpro' | 'chords-over-lyrics'

export interface ConvertedSong {
  format: SourceFormat
  /** Whatever metadata could be detected; empty strings when unknown. */
  meta: SongMeta
  /** ChordPro body without metadata directives. */
  body: string
}

const CHORD = /^[A-G][#b]?(?:maj|min|dim|aug|sus|add|m|M|[0-9]|[#b+°ø])*(?:\([^)\s]*\))?(?:\/[A-G][#b]?)?$/
// Things allowed on a chord line besides chords: bar lines, repeats, dashes, "N.C." and so on.
const ANNOTATION = /^(?:[|:]+|x\d+|\d+x|\(x?\d+x?\)|-+|\/+|\.{2,}|…|n\.?c\.?|%)$/i
const TAB_LINE = /^\s*[A-Ga-g][#b]?\s?[|:].*-{2,}/
const UNDERLINE = /^\s*[=\-_~*]{3,}\s*$/
const SECTION_BRACKETS = /^\s*\[([^\]]{1,40})\]\s*$/
const SECTION_WORDS =
  /^\s*((?:pre-?\s?)?(?:intro|verse|vers|chorus|refräng|refrain|bridge|stick|outro|solo|interlude|mellanspel|slinga|riff|instrumental|coda|tag)(?:\s*\d+)?)\s*:?\s*$/i
const LABEL_WITH_CHORDS = /^\s*([^:[\]{}]{1,30}):\s+(\S.*)$/
const CHORUS_NAME = /^(?:chorus|refräng|refrain)/i

interface ChordToken {
  chord: string
  column: number
}

function chordTokens(line: string): ChordToken[] | null {
  if (TAB_LINE.test(line)) return null
  let chords: ChordToken[] = []
  for (let match of line.matchAll(/\S+/g)) {
    let token = match[0]
    if (CHORD.test(token)) {
      chords.push({ chord: token, column: match.index })
      continue
    }
    // Chords wrapped in bar lines or parentheses, like "|(E)" or "(F#m)|".
    let wrapped = /^([|(]*)(.+?)([|)]*)$/.exec(token)
    if (wrapped && CHORD.test(wrapped[2])) {
      chords.push({ chord: wrapped[2], column: match.index + wrapped[1].length })
    } else if (!ANNOTATION.test(token)) {
      return null
    }
  }
  return chords.length > 0 ? chords : null
}

export function isChordLine(line: string): boolean {
  return chordTokens(line) !== null
}

function sectionName(line: string): string | null {
  let bracketed = SECTION_BRACKETS.exec(line)
  if (bracketed && !CHORD.test(bracketed[1].trim())) return bracketed[1].trim()
  return SECTION_WORDS.exec(line)?.[1] ?? null
}

/** Brackets in lyrics would read as chords, and braces as directives. */
function escapeLyric(line: string): string {
  return line.replace(/\[/g, '(').replace(/\]/g, ')').replace(/^(\s*)\{/, '$1(')
}

function directiveValue(text: string): string {
  return text.replace(/[{}]/g, '').trim()
}

/** Places each chord at its column in the lyric line. */
export function mergeChords(chordLine: string, lyric: string): string {
  let chords = chordTokens(chordLine) ?? []
  let result = escapeLyric(lyric)
  for (let { chord, column } of [...chords].reverse()) {
    result = result.padEnd(column)
    result = `${result.slice(0, column)}[${chord}]${result.slice(column)}`
  }
  return result.trimEnd()
}

/** A chord line with no lyrics under it: chords keep their spacing, annotations stay as text. */
export function bracketChords(chordLine: string): string {
  let result = chordLine
  for (let { chord, column } of [...(chordTokens(chordLine) ?? [])].reverse()) {
    result = `${result.slice(0, column)}[${chord}]${result.slice(column + chord.length)}`
  }
  return result.trimEnd()
}

function looksLikeChordPro(text: string): boolean {
  return (
    /^\s*\{[a-z_]+\s*(?::|\})/im.test(text) ||
    // An inline chord directly followed by lyrics, like "[G]Hello".
    /\[[A-G][^\]\s]{0,10}\][^\s[]/.test(text)
  )
}

function emptyMeta(): SongMeta {
  return { title: '', artist: '' }
}

interface Header {
  meta: SongMeta
  comments: string[]
}

const META_LINE: Array<[RegExp, keyof SongMeta]> = [
  [/^\s*(?:title|titel|låt)\s*:\s*(.+)$/i, 'title'],
  [/^\s*(?:artist|band|artister)\s*:\s*(.+)$/i, 'artist'],
  [/^\s*(?:album|skiva)\s*:\s*(.+)$/i, 'album'],
  [/^\s*(?:key|tonart)\s*:\s*(.+)$/i, 'key'],
]

function parseHeader(lines: string[]): Header {
  let meta = emptyMeta()
  let comments: string[] = []
  let sawFirstLine = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim()
    if (!line || UNDERLINE.test(line)) continue

    if (lines[i + 1] !== undefined && UNDERLINE.test(lines[i + 1]) && !meta.title) {
      meta.title = line
      sawFirstLine = true
      continue
    }

    let known = META_LINE.find(([pattern]) => pattern.test(line))
    if (known) {
      meta[known[1]] = known[0].exec(line)![1].trim()
      continue
    }

    let capo = /^capo\b\s*:?\s*(.*)$/i.exec(line)
    if (capo) {
      meta.capo = /\d+/.exec(capo[1])?.[0] ?? capo[1]
      continue
    }

    if (!sawFirstLine) {
      sawFirstLine = true
      let dashed = /^(.+?)\s+[-–—]\s+(.+)$/.exec(line)
      let by = /^(.+?),?\s+by\s+(.+)$/i.exec(line)
      if (dashed && !meta.artist && !meta.title) {
        meta.artist = dashed[1].trim()
        meta.title = dashed[2].trim()
        continue
      }
      if (by && !meta.title) {
        meta.title = by[1].trim()
        meta.artist ||= by[2].trim()
        continue
      }
      if (!meta.title && line.length <= 60) {
        meta.title = line
        continue
      }
    }

    comments.push(line)
  }

  // Titles in all caps ("TIME") read better in title case.
  if (meta.title && meta.title === meta.title.toUpperCase() && /\p{L}/u.test(meta.title)) {
    meta.title = meta.title.toLowerCase().replace(/(^|\s)\p{L}/gu, (char) => char.toUpperCase())
  }
  return { meta, comments }
}

function isContentLine(line: string): boolean {
  return (
    sectionName(line) !== null ||
    isChordLine(line) ||
    TAB_LINE.test(line) ||
    labelWithChords(line) !== null
  )
}

function labelWithChords(line: string): { label: string; chords: string } | null {
  let match = LABEL_WITH_CHORDS.exec(line)
  if (!match || !isChordLine(match[2])) return null
  return { label: match[1].trim(), chords: match[2] }
}

const MAX_HEADER_LINES = 15

export function convertSong(input: string): ConvertedSong {
  let text = input.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').normalize('NFC')

  if (looksLikeChordPro(text)) {
    let song = parseSong(text)
    let { title, artist, album, key, capo } = song
    return { format: 'chordpro', meta: { title, artist, album, key, capo }, body: songBody(text).trim() }
  }

  let lines = text.split('\n')
  let firstContent = lines.findIndex(isContentLine)
  let headerEnd = firstContent >= 0 && firstContent <= MAX_HEADER_LINES ? firstContent : 0
  let { meta, comments } = parseHeader(lines.slice(0, headerEnd))

  let out: string[] = comments.map((comment) => `{comment: ${directiveValue(comment)}}`)
  if (out.length > 0) out.push('')
  let inChorus = false

  let closeChorus = () => {
    if (!inChorus) return
    let trailingBlanks = 0
    while (out.length > 0 && out[out.length - 1] === '') {
      out.pop()
      trailingBlanks++
    }
    out.push('{end_of_chorus}')
    for (let i = 0; i < trailingBlanks; i++) out.push('')
    inChorus = false
  }

  let body = lines.slice(headerEnd)
  for (let i = 0; i < body.length; i++) {
    let line = body[i].trimEnd()

    if (line.trim() === '') {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('')
      continue
    }

    let section = sectionName(line)
    if (section) {
      closeChorus()
      if (CHORUS_NAME.test(section)) {
        out.push(`{start_of_chorus: ${directiveValue(section)}}`)
        inChorus = true
      } else {
        out.push(`{comment: ${directiveValue(section)}}`)
      }
      continue
    }

    if (TAB_LINE.test(line) || (isChordLine(line) && TAB_LINE.test(body[i + 1] ?? ''))) {
      // A chord-name line right above a tab belongs to the tab, aligned with its columns.
      out.push('{start_of_tab}')
      while (i < body.length && (TAB_LINE.test(body[i]) || isChordLine(body[i]))) {
        out.push(body[i].trimEnd())
        i++
      }
      out.push('{end_of_tab}')
      i--
      continue
    }

    let labelled = labelWithChords(line)
    if (labelled) {
      // "Solo: G D" starts a section of its own.
      closeChorus()
      out.push(`{comment: ${directiveValue(labelled.label)}}`)
      out.push(bracketChords(labelled.chords.trim()))
      continue
    }

    if (isChordLine(line)) {
      let next = body[i + 1]
      let nextIsLyric =
        next !== undefined && next.trim() !== '' && !isContentLine(next)
      if (nextIsLyric) {
        out.push(mergeChords(line, next.trimEnd()))
        i++
      } else {
        out.push(bracketChords(line))
      }
      continue
    }

    out.push(escapeLyric(line))
  }
  closeChorus()

  while (out[out.length - 1] === '') out.pop()
  return { format: 'chords-over-lyrics', meta, body: out.join('\n') }
}
