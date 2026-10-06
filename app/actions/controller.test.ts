import * as assert from 'remix/assert'
import type { Database } from 'remix/data-table'
import { afterAll, beforeAll, describe, it } from 'remix/test'

import { createTestDatabase } from '../../test/database.ts'
import { listSetlists } from '../data/setlists.ts'
import { getSong } from '../data/songs.ts'
import { songParams } from '../data/song-id.ts'
import { createAppRouter } from '../router.ts'
import { routes } from '../routes.ts'

// The tests below run in order against one in-memory database.
const origin = 'http://localhost'
let db: Database
let router: ReturnType<typeof createAppRouter>

beforeAll(async () => {
  db = await createTestDatabase()
  router = createAppRouter({ db })
})

afterAll(async () => {
  await db.close()
})

function get(href: string) {
  return router.fetch(new Request(new URL(href, origin)))
}

function post(href: string, fields: Record<string, string>) {
  let body = new FormData()
  for (let [name, value] of Object.entries(fields)) body.set(name, value)
  return router.fetch(new Request(new URL(href, origin), { method: 'POST', body }))
}

function readSetlists() {
  return listSetlists(db)
}

describe('songbook', () => {
  it('GET / returns the home page', async () => {
    let response = await get(routes.home.href())

    assert.equal(response.status, 200)
    assert.match(response.headers.get('Content-Type') ?? '', /text\/html/)
    assert.match(await response.text(), /No songs yet/)
  })

  it('rejects a song without a title', async () => {
    let response = await post(routes.songs.create.href(), { title: '', artist: 'X', body: '' })
    assert.equal(response.status, 400)
    assert.match(await response.text(), /Title is required/)
  })

  it('creates, shows, searches, transposes and edits a song', async () => {
    let response = await post(routes.songs.create.href(), {
      title: 'Test Tune',
      artist: 'Tester',
      album: 'Demo',
      key: 'G',
      body: '[G]Humming along the [D]morning road',
    })
    assert.equal(response.status, 303)
    let showHref = routes.songs.show.href({ artist: 'tester', song: 'test-tune' })
    assert.equal(showHref, '/songs/tester/test-tune')
    assert.equal(response.headers.get('Location'), showHref)

    let stored = await getSong(db, 'tester/test-tune')
    assert.equal(stored?.album, 'Demo')
    assert.equal(stored?.body, '[G]Humming along the [D]morning road')

    let page = await (await get(showHref)).text()
    assert.match(page, /Test Tune/)
    assert.match(page, /morning road/)

    let transposed = await (await get(`${showHref}?t=2`)).text()
    assert.match(transposed, /Key A/)

    let search = await (await get(`${routes.home.href()}?q=morning&field=lyrics`)).text()
    assert.match(search, /Test Tune/)
    assert.match(search, /1 result/)

    let noHit = await (await get(`${routes.home.href()}?q=morning&field=title`)).text()
    assert.match(noHit, /No songs match/)

    response = await post(routes.songs.update.href({ artist: 'tester', song: 'test-tune' }), {
      title: 'Test Tune',
      artist: 'Tester',
      album: 'Live',
      body: '[A]Changed',
    })
    assert.equal(response.status, 303)
    assert.equal(response.headers.get('Location'), showHref)
    page = await (await get(showHref)).text()
    assert.match(page, /Live/)
  })

  it('manages a setlist and plays through it', async () => {
    await post(routes.songs.create.href(), { title: 'Second', artist: 'Tester', body: 'La' })

    let response = await post(routes.setlists.create.href(), { name: 'Friday Gig' })
    assert.equal(response.status, 303)
    let id = 'friday-gig'
    assert.equal(response.headers.get('Location'), routes.setlists.show.href({ id }))

    await post(routes.songs.addToSetlist.href(songParams('tester/test-tune')), { setlist: id })
    await post(routes.setlists.update.href({ id }), { intent: 'add', song: 'tester/second' })
    assert.deepEqual((await readSetlists())[0].songIds, ['tester/test-tune', 'tester/second'])

    await post(routes.setlists.update.href({ id }), { intent: 'down', index: '0' })
    assert.deepEqual((await readSetlists())[0].songIds, ['tester/second', 'tester/test-tune'])

    let play = await get(routes.setlists.play.href({ id, pos: '2' }))
    assert.equal(play.status, 200)
    let html = await play.text()
    assert.match(html, /Test Tune/)
    assert.match(html, /2 \/ 2/)

    assert.equal((await get(routes.setlists.play.href({ id, pos: '3' }))).status, 404)
  })

  it('moves the song and updates setlists when the artist or title changes', async () => {
    let response = await post(routes.songs.update.href(songParams('tester/second')), {
      title: 'Second Take',
      artist: 'Other Band',
      body: 'La',
    })
    assert.equal(response.status, 303)
    assert.equal(response.headers.get('Location'), '/songs/other-band/second-take')
    assert.equal((await get('/songs/tester/second')).status, 404)
    assert.equal((await get('/songs/other-band/second-take')).status, 200)
    assert.deepEqual((await readSetlists())[0].songIds, ['other-band/second-take', 'tester/test-tune'])
  })

  it('removes a deleted song from its setlists', async () => {
    let params = songParams('other-band/second-take')
    let confirm = await (await get(routes.songs.confirmDelete.href(params))).text()
    assert.match(confirm, /Friday Gig/)

    let response = await post(routes.songs.destroy.href(params), {})
    assert.equal(response.status, 303)
    assert.equal((await get(routes.songs.show.href(params))).status, 404)
    assert.deepEqual((await readSetlists())[0].songIds, ['tester/test-tune'])
  })

  it('uses Swedish letters in song and setlist URLs', async () => {
    let response = await post(routes.songs.create.href(), {
      title: 'Långsam vals',
      artist: 'Fjällräv',
      body: '[Am]Sakta över ängen',
    })
    let location = response.headers.get('Location') ?? ''
    assert.equal(location, routes.songs.show.href({ artist: 'fjällräv', song: 'långsam-vals' }))
    assert.equal(decodeURIComponent(location), '/songs/fjällräv/långsam-vals')
    assert.equal((await get(location)).status, 200)
    // A decomposed "ä" (as some systems produce) finds the same song.
    assert.equal((await get(`/songs/${encodeURIComponent('fjällräv')}/långsam-vals`)).status, 200)

    response = await post(routes.setlists.create.href(), { name: 'Övning' })
    assert.equal(decodeURIComponent(response.headers.get('Location') ?? ''), '/setlists/övning')

    let search = await (await get(`${routes.home.href()}?q=${encodeURIComponent('ängen')}`)).text()
    assert.match(search, /Långsam vals/)
  })

  it('converts pasted chords-above-lyrics into a pre-filled song form', async () => {
    assert.equal((await get(routes.songs.paste.href())).status, 200)

    let response = await post(routes.songs.convert.href(), {
      text: 'Tester - Pasted Song\n\n[Verse]\nG       D\nWalking down the lane',
    })
    assert.equal(response.status, 200)
    let html = await response.text()
    assert.match(html, /Converted from chords-above-lyrics/)
    assert.match(html, /value="Pasted Song"/)
    assert.match(html, /\[G\]Walking \[D\]down the lane/)

    let empty = await post(routes.songs.convert.href(), { text: '  ' })
    assert.equal(empty.status, 400)
  })

  it('accepts an uploaded file for conversion', async () => {
    let body = new FormData()
    body.set('text', '')
    body.set('file', new File(['[Intro]\nAm  E'], 'song.txt', { type: 'text/plain' }))
    let response = await router.fetch(
      new Request(new URL(routes.songs.convert.href(), origin), { method: 'POST', body }),
    )
    let html = await response.text()
    assert.match(html, /\[Am\]  \[E\]/)
    assert.match(html, /find the title or artist/)
  })

  it('returns 404 for unknown or unsafe ids', async () => {
    assert.equal((await get('/songs/tester/nope')).status, 404)
    assert.equal((await get('/songs/..%2F..%2Fetc/passwd')).status, 404)
    assert.equal((await get('/songs/tester')).status, 404)
    assert.equal((await get(routes.setlists.show.href({ id: 'nope' }))).status, 404)
  })
})
