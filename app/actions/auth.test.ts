import * as assert from 'remix/assert'
import { afterAll, beforeAll, describe, it } from 'remix/test'

import { createTestApp, TEST_PASSWORD, type TestApp, type TestClient } from '../../test/client.ts'
import { createSong } from '../data/songs.ts'
import { deleteUser, getUserByName, setPassword, setRole } from '../data/users.ts'
import { safeReturnTo } from '../middleware/auth.ts'
import { routes } from '../routes.ts'

let app: TestApp
let editor: TestClient
let viewer: TestClient
const songHref = routes.songs.show.href({ artist: 'tester', song: 'first-song' })

beforeAll(async () => {
  app = await createTestApp()
  await createSong(app.db, { title: 'First Song', artist: 'Tester' }, '[G]La la')
  editor = await app.loggedIn('ed', 'editor')
  viewer = await app.loggedIn('vera', 'viewer')
})

afterAll(async () => {
  await app.db.close()
})

describe('anonymous visitors', () => {
  it('are redirected to the login page with a return path', async () => {
    let response = await app.client().get(`${songHref}?t=2`)
    assert.equal(response.status, 302)
    assert.equal(
      response.headers.get('Location'),
      `${routes.login.href()}?returnTo=${encodeURIComponent(`${songHref}?t=2`)}`,
    )
  })

  it('cannot post anything', async () => {
    let response = await app.client().post(routes.setlists.create.href(), { name: 'Nope' })
    assert.equal(response.status, 401)
  })

  it('can load the login page and assets', async () => {
    assert.equal((await app.client().get(routes.login.href())).status, 200)
    assert.equal((await app.client().get('/assets/app/actions/public/entry.ts')).status, 200)
  })
})

describe('logging in', () => {
  it('rejects a wrong password without saying which part was wrong', async () => {
    let response = await app.client().login('ed', 'wrong password!')
    assert.equal(response.status, 401)
    assert.match(await response.text(), /Wrong username or password/)
    assert.equal((await app.client().login('nobody', 'whatever!!')).status, 401)
  })

  it('accepts any letter case in the username and returns to the requested page', async () => {
    let client = app.client()
    let response = await client.post(routes.loginAction.href(), {
      username: 'ED',
      password: TEST_PASSWORD,
      returnTo: songHref,
    })
    assert.equal(response.status, 303)
    assert.equal(response.headers.get('Location'), songHref)
    assert.equal((await client.get(songHref)).status, 200)
  })

  it('only returns to local paths', () => {
    assert.equal(safeReturnTo('/songs?x=1'), '/songs?x=1')
    assert.equal(safeReturnTo('//evil.example'), '/')
    assert.equal(safeReturnTo('https://evil.example'), '/')
    assert.equal(safeReturnTo('/\\evil.example'), '/')
  })

  it('blocks a username after too many failures, even with the right password', async () => {
    // The limiter is per process, so this uses a username no other test logs in with.
    await app.loggedIn('locked', 'viewer')
    let client = app.client()
    for (let i = 0; i < 10; i++) await client.login('locked', 'wrong password!')
    let response = await client.login('locked')
    assert.equal(response.status, 429)
    assert.match(await response.text(), /Too many failed attempts/)
  })

  it('logs out', async () => {
    let client = await app.loggedIn('temp', 'viewer')
    assert.equal((await client.get(songHref)).status, 200)
    let response = await client.post(routes.logout.href())
    assert.equal(response.status, 303)
    assert.equal((await client.get(songHref)).status, 302)
  })
})

describe('roles', () => {
  it('lets viewers read but not edit', async () => {
    let page = await viewer.get(songHref)
    assert.equal(page.status, 200)
    let html = await page.text()
    assert.doesNotMatch(html, /href="[^"]*\/edit"/)
    assert.doesNotMatch(html, />New song</)
    assert.match(html, /vera/)

    assert.equal((await viewer.get(routes.songs.new.href())).status, 403)
    assert.equal((await viewer.get(routes.songs.paste.href())).status, 403)
    assert.equal(
      (await viewer.get(routes.songs.edit.href({ artist: 'tester', song: 'first-song' }))).status,
      403,
    )
    let create = await viewer.post(routes.songs.create.href(), { title: 'X', artist: 'Y', body: '' })
    assert.equal(create.status, 403)
    assert.equal((await viewer.post(routes.setlists.create.href(), { name: 'Mine' })).status, 403)
  })

  it('lets editors edit', async () => {
    let html = await (await editor.get(songHref)).text()
    assert.match(html, /href="[^"]*\/edit"/)
    let response = await editor.post(routes.setlists.create.href(), { name: 'Gig' })
    assert.equal(response.status, 303)
  })

  it('applies role changes and deleted accounts immediately', async () => {
    let client = await app.loggedIn('flip', 'viewer')
    let user = (await getUserByName(app.db, 'flip'))!
    assert.equal((await client.get(routes.songs.new.href())).status, 403)

    await setRole(app.db, user.id, 'editor')
    assert.equal((await client.get(routes.songs.new.href())).status, 200)

    await deleteUser(app.db, user.id)
    assert.equal((await client.get(songHref)).status, 302)
  })
})

describe('passwords', () => {
  it('logs out other sessions when the password changes', async () => {
    let first = await app.loggedIn('pat', 'viewer')
    let second = app.client()
    await second.login('pat')

    let response = await first.post(routes.accountAction.href(), {
      current: TEST_PASSWORD,
      password: 'a brand new password',
    })
    assert.equal(response.status, 200)
    assert.match(await response.text(), /Password changed/)

    assert.equal((await first.get(songHref)).status, 200, 'the session that changed it stays in')
    assert.equal((await second.get(songHref)).status, 302, 'other sessions are logged out')
    assert.equal((await app.client().login('pat', 'a brand new password')).status, 303)
  })

  it('requires the current password and a long enough new one', async () => {
    let client = await app.loggedIn('kim', 'viewer')
    let wrong = await client.post(routes.accountAction.href(), {
      current: 'not it at all',
      password: 'another long password',
    })
    assert.equal(wrong.status, 400)
    let short = await client.post(routes.accountAction.href(), { current: TEST_PASSWORD, password: 'short' })
    assert.equal(short.status, 400)
    assert.match(await short.text(), /at least 10 characters/)
  })

  it('invalidates sessions after a CLI password reset', async () => {
    let client = await app.loggedIn('sam', 'viewer')
    let user = (await getUserByName(app.db, 'sam'))!
    await setPassword(app.db, user.id, 'reset by an admin')
    assert.equal((await client.get(songHref)).status, 302)
  })
})

describe('cross-site requests', () => {
  it('rejects form posts from other sites even with a valid session', async () => {
    let response = await editor.post(
      routes.setlists.create.href(),
      { name: 'Forged' },
      { 'Sec-Fetch-Site': 'cross-site', Origin: 'https://evil.example' },
    )
    assert.equal(response.status, 403)
  })

  it('accepts same-origin posts', async () => {
    let response = await editor.post(
      routes.setlists.create.href(),
      { name: 'Same Origin' },
      { 'Sec-Fetch-Site': 'same-origin', Origin: 'http://localhost' },
    )
    assert.equal(response.status, 303)
  })
})
