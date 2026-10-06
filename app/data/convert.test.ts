import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { parseSong } from './chordpro.ts'
import { bracketChords, convertSong, isChordLine, mergeChords } from './convert.ts'

describe('isChordLine', () => {
  it('recognizes chord lines, including bar notation and repeats', () => {
    assert.ok(isChordLine('G        D/F#    Em7'))
    assert.ok(isChordLine('  F#m    Dmaj7    Fadd#11/B   D7b9   Cadd9  G5  Dsus2'))
    assert.ok(isChordLine('| E     |(E)    | F#m   |(F#m)  | x4'))
    assert.ok(isChordLine('Dm Gm Am Dm'))
  })

  it('rejects lyrics and tab lines', () => {
    assert.ok(!isChordLine('A little song about nothing'))
    assert.ok(!isChordLine('Em, said the cat'))
    assert.ok(!isChordLine('e|-----0-----|'))
    assert.ok(!isChordLine(''))
  })
})

describe('mergeChords', () => {
  it('places chords at their columns', () => {
    assert.equal(mergeChords('G       D', 'Walking down the lane'), '[G]Walking [D]down the lane')
  })

  it('pads short lyric lines so trailing chords keep their place', () => {
    assert.equal(mergeChords('C          G', 'Oh yes'), '[C]Oh yes     [G]')
  })

  it('keeps leading spaces and escapes brackets in lyrics', () => {
    assert.equal(mergeChords('   Am', '  hum [softly]'), '  h[Am]um (softly)')
  })
})

describe('bracketChords', () => {
  it('brackets chords in place and keeps annotations', () => {
    assert.equal(bracketChords('| E   |(E)  | x4'), '| [E]   |([E])  | x4')
    assert.equal(bracketChords('F#m  A  x2'), '[F#m]  [A]  x2')
  })
})

describe('convertSong', () => {
  it('converts chords above lyrics with an "Artist - Title" header', () => {
    let { format, meta, body } = convertSong(
      [
        'The Placeholders - Paper Lanterns',
        '',
        '[Verse 1]',
        'G              D',
        'Paper lanterns on the line',
        '',
        '[Chorus]',
        'C          G',
        'Light them up',
        '',
        'Solo: G D x2',
      ].join('\n'),
    )
    assert.equal(format, 'chords-over-lyrics')
    assert.deepEqual(meta, { title: 'Paper Lanterns', artist: 'The Placeholders' })
    assert.equal(
      body,
      [
        '{comment: Verse 1}',
        '[G]Paper lanterns [D]on the line',
        '',
        '{start_of_chorus: Chorus}',
        '[C]Light them [G]up',
        '{end_of_chorus}',
        '',
        '{comment: Solo}',
        '[G] [D] x2',
      ].join('\n'),
    )
  })

  it('reads underlined titles and labelled metadata', () => {
    let { meta, body } = convertSong(
      ['SLOW WALTZ', '==========', '', 'Artist: Fjällräv', 'Album: Examples', 'Capo: 2nd fret', 'Written by someone', '', '[Intro]', 'Am  E'].join('\n'),
    )
    assert.deepEqual(meta, { title: 'Slow Waltz', artist: 'Fjällräv', album: 'Examples', capo: '2' })
    assert.equal(body, '{comment: Written by someone}\n\n{comment: Intro}\n[Am]  [E]')
  })

  it('reads "Title, by Artist" headers', () => {
    let { meta } = convertSong('Paper Lanterns, by The Placeholders\n\nG\nla la')
    assert.deepEqual(meta, { title: 'Paper Lanterns', artist: 'The Placeholders' })
  })

  it('leaves metadata empty when there is no header', () => {
    let { meta, body } = convertSong('[Intro]\nA E\n\n[Verse]\nA\nla')
    assert.deepEqual(meta, { title: '', artist: '' })
    assert.ok(body.startsWith('{comment: Intro}'))
  })

  it('keeps tabs verbatim, together with a chord line right above them', () => {
    let { body } = convertSong(
      ['[Riff]', '  Am      G', 'e|--0-----3--|', 'B|--1-----0--|', '', 'Am', 'words'].join('\n'),
    )
    assert.equal(
      body,
      [
        '{comment: Riff}',
        '{start_of_tab}',
        '  Am      G',
        'e|--0-----3--|',
        'B|--1-----0--|',
        '{end_of_tab}',
        '',
        '[Am]words',
      ].join('\n'),
    )
  })

  it('produces ChordPro that parses into chord segments', () => {
    let { body } = convertSong('[Verse]\nG     C\nHello there\nNo chords here')
    let lines = parseSong(body).blocks.filter((block) => block.type === 'line')
    assert.deepEqual(
      lines.map((line) => line.type === 'line' && line.segments.map((s) => s.chord ?? null)),
      [['G', 'C'], [null]],
    )
  })

  it('passes ChordPro through unchanged', () => {
    let { format, meta, body } = convertSong('{title: Song}\n{artist: Band}\n\n[G]Hello [C]there')
    assert.equal(format, 'chordpro')
    assert.equal(meta.title, 'Song')
    assert.equal(meta.artist, 'Band')
    assert.equal(body, '[G]Hello [C]there')
  })
})
