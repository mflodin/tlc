import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { isChordOnly, lyricsText, parseLine, parseSong, serializeSong, songBody } from './chordpro.ts'

describe('parseLine', () => {
  it('splits a line into chord/lyric segments', () => {
    assert.deepEqual(parseLine('Some [G]words [D/F#]here'), [
      { chord: undefined, lyric: 'Some ' },
      { chord: 'G', lyric: 'words ' },
      { chord: 'D/F#', lyric: 'here' },
    ])
  })

  it('handles chords without lyrics', () => {
    assert.deepEqual(parseLine('[Am][G]'), [
      { chord: 'Am', lyric: '' },
      { chord: 'G', lyric: '' },
    ])
  })

  it('keeps a line without chords as one segment', () => {
    assert.deepEqual(parseLine('just lyrics'), [{ chord: undefined, lyric: 'just lyrics' }])
  })
})

describe('parseSong', () => {
  let text = [
    '{title: Test Song}',
    '{a: Someone}',
    '{album: Record}',
    '{key: G}',
    '# a comment',
    '{c: Verse}',
    '[G]Hello [C]world',
    '',
    '{soc}',
    'Chorus [D]line',
    '{eoc}',
    '{sot}',
    'e|--0--|',
    '{eot}',
  ].join('\n')

  it('reads metadata with long and short directive names', () => {
    let song = parseSong(text)
    assert.equal(song.title, 'Test Song')
    assert.equal(song.artist, 'Someone')
    assert.equal(song.album, 'Record')
    assert.equal(song.key, 'G')
  })

  it('builds headings, lines, chorus markers and tabs', () => {
    let song = parseSong(text)
    assert.deepEqual(
      song.blocks.map((b) => b.type),
      ['heading', 'line', 'empty', 'heading', 'line', 'tab'],
    )
    let chorus = song.blocks[4]
    assert.ok(chorus.type === 'line' && chorus.chorus)
    let tab = song.blocks[5]
    assert.ok(tab.type === 'tab' && tab.text === 'e|--0--|')
  })

  it('extracts lyrics without chords or tabs', () => {
    assert.equal(lyricsText(parseSong(text)), 'Hello world\nChorus line')
  })
})

describe('isChordOnly', () => {
  it('is true for chords with bar lines, parentheses and repeat marks', () => {
    assert.ok(isChordOnly(parseLine('| [E]     |([E])    | [F#m]   |([F#m])  | x4')))
    assert.ok(isChordOnly(parseLine('[Am] [G] [F] 2x')))
    assert.ok(isChordOnly(parseLine('[Am][G]')))
  })

  it('is false for lines with words or without chords', () => {
    assert.ok(!isChordOnly(parseLine('[G]Walking down the [D]lane')))
    assert.ok(!isChordOnly(parseLine('[G] [D] yeah')))
    assert.ok(!isChordOnly(parseLine('| | x4')))
  })

  it('keeps chord-only lines out of the searchable lyrics', () => {
    let song = parseSong('| [E]  |([E])  | x4\n[G]Hello [C]there')
    assert.equal(lyricsText(song), 'Hello there')
  })
})

describe('serializeSong', () => {
  it('writes metadata directives and replaces old ones in the body', () => {
    let text = serializeSong(
      { title: 'New', artist: 'Band', album: undefined, key: 'A' },
      '{title: Old}\n[A]La la',
    )
    assert.equal(text, '{title: New}\n{artist: Band}\n{key: A}\n\n[A]La la\n')
    assert.equal(songBody(text), '[A]La la\n')
  })
})
