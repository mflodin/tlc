import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { parseSong } from './chordpro.ts'
import { transposeChord, transposeKey, transposeSong } from './transpose.ts'

describe('transposeChord', () => {
  it('shifts the root and keeps the quality', () => {
    assert.equal(transposeChord('G', 2), 'A')
    assert.equal(transposeChord('Am7', 3), 'Cm7')
    assert.equal(transposeChord('Cmaj7', 1, false), 'C#maj7')
  })

  it('wraps around the octave in both directions', () => {
    assert.equal(transposeChord('B', 1), 'C')
    assert.equal(transposeChord('C', -1), 'B')
    assert.equal(transposeChord('E', 12), 'E')
  })

  it('transposes slash bass notes', () => {
    assert.equal(transposeChord('D/F#', 2), 'E/G#')
    assert.equal(transposeChord('C#m7/G#', 1), 'Dm7/A')
  })

  it('uses flats when asked or when the chord already uses flats', () => {
    assert.equal(transposeChord('C', 1, true), 'Db')
    assert.equal(transposeChord('Bb', 1), 'B')
    assert.equal(transposeChord('Eb', 2), 'F')
    assert.equal(transposeChord('Ab', 1), 'A')
    assert.equal(transposeChord('Eb', 3), 'Gb')
  })

  it('leaves non-chords alone', () => {
    assert.equal(transposeChord('N.C.', 3), 'N.C.')
    assert.equal(transposeChord('x2', 3), 'x2')
  })
})

describe('transposeKey', () => {
  it('picks the conventional spelling for the key', () => {
    assert.equal(transposeKey('C', 5), 'F')
    assert.equal(transposeKey('G', 3), 'Bb')
    assert.equal(transposeKey('E', 2), 'F#')
    assert.equal(transposeKey('Am', 5), 'Dm')
  })
})

describe('transposeSong', () => {
  it('transposes chords and key, but not tabs', () => {
    let song = transposeSong(parseSong('{key: G}\n[G]One [D]two\n{sot}\nG|--0--|\n{eot}'), 2)
    assert.equal(song.key, 'A')
    let line = song.blocks[0]
    assert.ok(line.type === 'line')
    assert.deepEqual(
      line.segments.map((s) => s.chord),
      ['A', 'E'],
    )
    let tab = song.blocks[1]
    assert.ok(tab.type === 'tab' && tab.text === 'G|--0--|')
  })

  it('spells chords with flats in a flat key', () => {
    let song = transposeSong(parseSong('{key: G}\n[G]One [D]two'), 3)
    assert.equal(song.key, 'Bb')
    let line = song.blocks[0]
    assert.ok(line.type === 'line')
    assert.deepEqual(
      line.segments.map((s) => s.chord),
      ['Bb', 'F'],
    )
  })
})
