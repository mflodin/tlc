import * as assert from 'remix/assert'
import type { Database } from 'remix/data-table'
import { afterAll, beforeAll, describe, it } from 'remix/test'

import { createTestDatabase } from '../../test/database.ts'
import { parseQuery, parseSnippet, searchSongs, toFtsQuery } from './search.ts'
import { createSong } from './songs.ts'

describe('parseQuery', () => {
  it('keeps quoted phrases together', () => {
    assert.deepEqual(parseQuery('River "paper boats"  x'), ['river', 'paper boats', 'x'])
  })
})

describe('toFtsQuery', () => {
  it('requires every term, with prefix matching for words', () => {
    assert.equal(toFtsQuery('morn "slow road"'), '"morn"* AND "slow road"')
  })

  it('scopes to a column', () => {
    assert.equal(toFtsQuery('river', 'album'), 'album : ("river"*)')
  })

  it('drops quotes inside terms and returns null when empty', () => {
    assert.equal(toFtsQuery('a"b'), '"ab"*')
    assert.equal(toFtsQuery('  '), null)
  })
})

describe('parseSnippet', () => {
  it('splits marked matches from plain text', () => {
    assert.deepEqual(parseSnippet('we \u0002watched\u0003 it'), [
      { text: 'we ', match: false },
      { text: 'watched', match: true },
      { text: ' it', match: false },
    ])
  })
})

describe('searchSongs', () => {
  let db: Database

  beforeAll(async () => {
    db = await createTestDatabase()
    await createSong(db, { title: 'River Song', artist: 'The Boats', album: 'Water' }, 'down by the bank\nwe watched it flow')
    await createSong(db, { title: 'Paper Boats', artist: 'Ålänningarna' }, 'a [G]river of paper\nfloating away')
    await createSong(db, { title: 'Night', artist: 'Someone', album: 'River Sessions' }, 'stars and nothing else')
  })

  afterAll(async () => {
    await db.close()
  })

  let titles = async (query: string, field?: Parameters<typeof searchSongs>[2]) =>
    (await searchSongs(db, query, field)).map((r) => r.song.title)

  it('ranks title matches above album and lyrics matches', async () => {
    assert.deepEqual(await titles('river'), ['River Song', 'Night', 'Paper Boats'])
  })

  it('limits matches to the chosen field', async () => {
    assert.deepEqual(await titles('river', 'album'), ['Night'])
    assert.deepEqual(await titles('river', 'lyrics'), ['Paper Boats'])
    assert.deepEqual(await titles('boats', 'artist'), ['River Song'])
    assert.deepEqual(await titles('boats', 'title'), ['Paper Boats'])
  })

  it('requires every term and matches word prefixes', async () => {
    assert.deepEqual(await titles('paper float'), ['Paper Boats'])
    assert.deepEqual(await titles('paper stars'), [])
  })

  it('matches quoted phrases exactly', async () => {
    assert.deepEqual(await titles('"river of paper"'), ['Paper Boats'])
    assert.deepEqual(await titles('"paper of river"'), [])
  })

  it('ignores case but treats å, ä and ö as their own letters', async () => {
    assert.deepEqual(await titles('ÅLÄNNINGARNA'), ['Paper Boats'])
    assert.deepEqual(await titles('ålänningarna'), ['Paper Boats'])
    assert.deepEqual(await titles('alanningarna'), [])
  })

  it('distinguishes Swedish words that differ only in å, ä or ö', async () => {
    await createSong(db, { title: 'Spår', artist: 'Test' }, 'jag går för dig')
    assert.deepEqual(await titles('för', 'lyrics'), ['Spår'])
    assert.deepEqual(await titles('for', 'lyrics'), [])
    assert.deepEqual(await titles('spar'), [])
    assert.deepEqual(await titles('spå'), ['Spår'])
  })

  it('matches decomposed input against composed text', async () => {
    assert.deepEqual(await titles('för', 'lyrics'), ['Spår'])
  })

  it('indexes lyrics without chords and highlights the match', async () => {
    let [result] = await searchSongs(db, 'watched')
    assert.equal(result.song.title, 'River Song')
    assert.ok(result.snippet?.some((part) => part.match && part.text === 'watched'))
  })

  it('treats FTS syntax in queries as plain text', async () => {
    assert.deepEqual(await titles('NOT river OR -x*'), [])
    assert.deepEqual(await titles('title:river'), [])
  })
})
