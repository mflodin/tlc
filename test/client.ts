import type { Database } from 'remix/data-table'

import { createUser, type Role } from '../app/data/users.ts'
import { createAppRouter } from '../app/router.ts'
import { createTestDatabase } from './database.ts'

export const ORIGIN = 'http://localhost'
export const TEST_PASSWORD = 'correct horse battery'

type Fields = Record<string, string | File>

/** Sends requests through the router like a browser: it keeps the session cookie between them. */
export class TestClient {
  cookie = ''

  constructor(readonly router: ReturnType<typeof createAppRouter>) {}

  async fetch(request: Request): Promise<Response> {
    if (this.cookie) request.headers.set('Cookie', this.cookie)
    let response = await this.router.fetch(request)
    let setCookie = response.headers.getSetCookie().find((c) => c.startsWith('tlc_session='))
    if (setCookie) this.cookie = setCookie.split(';', 1)[0]
    return response
  }

  get(href: string, headers?: HeadersInit): Promise<Response> {
    return this.fetch(new Request(new URL(href, ORIGIN), { headers }))
  }

  post(href: string, fields: Fields = {}, headers?: HeadersInit): Promise<Response> {
    let body = new FormData()
    for (let [name, value] of Object.entries(fields)) body.set(name, value)
    return this.fetch(new Request(new URL(href, ORIGIN), { method: 'POST', body, headers }))
  }

  async login(username: string, password = TEST_PASSWORD): Promise<Response> {
    return this.post('/login', { username, password })
  }
}

/** A migrated in-memory database and a router around it. */
export async function createTestApp() {
  let db = await createTestDatabase()
  let router = createAppRouter({ db, sessionSecret: 'test-secret' })
  return {
    db,
    router,
    client: () => new TestClient(router),
    /** Creates a user with TEST_PASSWORD and returns a client logged in as them. */
    async loggedIn(username: string, role: Role): Promise<TestClient> {
      await createUser(db, username, TEST_PASSWORD, role)
      let client = new TestClient(router)
      let response = await client.login(username)
      if (response.status !== 303) throw new Error(`Login failed: ${response.status}`)
      return client
    },
  }
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>
export type { Database }
