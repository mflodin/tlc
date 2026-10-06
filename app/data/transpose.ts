import type { Song } from './chordpro.ts'

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

// F#/Gb is spelled with sharps by convention.
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'])

const NOTE = /^([A-G])([#b]?)/

function noteIndex(note: string): number {
  let match = NOTE.exec(note)
  if (!match) return -1
  let index = SHARPS.indexOf(match[1])
  if (match[2] === '#') index += 1
  if (match[2] === 'b') index -= 1
  return (index + 12) % 12
}

function shiftNote(note: string, steps: number, useFlats: boolean): string {
  let index = noteIndex(note)
  if (index === -1) return note
  let names = useFlats ? FLATS : SHARPS
  return names[(((index + steps) % 12) + 12) % 12]
}

export function normalizeSteps(steps: number): number {
  return ((Math.trunc(steps) % 12) + 12) % 12
}

/**
 * Transposes a chord like `C#m7/G#` by `steps` semitones. Anything that doesn't start with a note
 * name (e.g. `N.C.`) is returned unchanged.
 */
export function transposeChord(chord: string, steps: number, useFlats = chord.includes('b')): string {
  let match = NOTE.exec(chord)
  if (!match || steps % 12 === 0) return chord

  let rest = chord.slice(match[0].length)
  let bass = /\/([A-G][#b]?)$/.exec(rest)
  if (bass) rest = rest.slice(0, bass.index)

  let root = shiftNote(match[0], steps, useFlats)
  return bass ? `${root}${rest}/${shiftNote(bass[1], steps, useFlats)}` : `${root}${rest}`
}

export function transposeKey(key: string, steps: number): string {
  let match = NOTE.exec(key)
  if (!match) return key
  let suffix = key.slice(match[0].length)
  let sharpKey = shiftNote(match[0], steps, false) + suffix
  let flatKey = shiftNote(match[0], steps, true) + suffix
  return FLAT_KEYS.has(flatKey) ? flatKey : sharpKey
}

export function transposeSong(song: Song, steps: number): Song {
  if (normalizeSteps(steps) === 0) return song

  let key = song.key ? transposeKey(song.key, steps) : undefined
  let useFlats = key ? FLAT_KEYS.has(key) : undefined

  return {
    ...song,
    key,
    blocks: song.blocks.map((block) =>
      block.type === 'line'
        ? {
            ...block,
            segments: block.segments.map((segment) =>
              segment.chord
                ? { ...segment, chord: transposeChord(segment.chord, steps, useFlats) }
                : segment,
            ),
          }
        : block,
    ),
  }
}
