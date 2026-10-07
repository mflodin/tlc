import { createCookie } from 'remix/cookie'
import type { Database } from 'remix/data-table'
import { getContext } from 'remix/middleware/async-context'
import { Auth, auth, createSessionAuthScheme } from 'remix/middleware/auth'
import { session } from 'remix/middleware/session'
import { redirect } from 'remix/response/redirect'
import type { Middleware } from 'remix/router'
import { createCookieSessionStorage } from 'remix/session-storage/cookie'

import { getUserById, type User } from '../data/users.ts'
import { routes } from '../routes.ts'

/** What the session stores after login. `version` must match the user's session_version. */
export interface AuthRecord {
  userId: number
  version: number
}

const THIRTY_DAYS = 60 * 60 * 24 * 30

/**
 * Signed, HTTP-only session cookie. `secure` is left to the session middleware, which sets it
 * for https request URLs (the server trusts the proxy's X-Forwarded-Proto in production).
 */
export function loadSession(secret: string) {
  let cookie = createCookie('tlc_session', {
    secrets: [secret],
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS,
  })
  return session(cookie, createCookieSessionStorage())
}

/** Resolves the session's auth record into `context.auth`, re-checking the user every request. */
export function loadAuth(db: Database) {
  return auth({
    schemes: [
      createSessionAuthScheme<User, AuthRecord>({
        read(session) {
          return (session.get('auth') as AuthRecord | undefined) ?? null
        },
        async verify(record) {
          let user = await getUserById(db, record.userId)
          // Deleted users and sessions from before a password change are rejected.
          return user && user.sessionVersion === record.version ? user : null
        },
        invalidate(session) {
          session.unset('auth')
        },
      }),
    ],
  })
}

// Pages anyone may load. Static files in public/ are served before this middleware runs.
function isPublic(path: string): boolean {
  return path === routes.login.href() || path.startsWith('/assets/')
}

// Logged-in users who aren't editors may still post to these.
function isSelfService(path: string): boolean {
  return path === routes.logout.href() || path === routes.account.href()
}

// GET pages that only make sense for editors (forms). Keep in sync with routes.ts.
const EDITOR_PAGES = [/^\/songs\/(?:new|paste)$/, /^\/songs\/[^/]+\/[^/]+\/(?:edit|delete)$/]

function isReadOnly(method: string): boolean {
  return method === 'GET' || method === 'HEAD'
}

/**
 * Login is required everywhere except the login page. Viewers can read; every other request
 * method needs an editor, so new mutations are protected by default.
 */
export function accessControl(): Middleware {
  return (context, next) => {
    let path = context.url.pathname
    if (isPublic(path)) return next()

    let state = context.get(Auth)
    if (!state || !state.ok) {
      if (!isReadOnly(context.request.method)) {
        return new Response('Log in first.', { status: 401 })
      }
      let returnTo = path + context.url.search
      let href = routes.login.href()
      return redirect(returnTo === '/' ? href : `${href}?returnTo=${encodeURIComponent(returnTo)}`)
    }

    let user = state.identity as User
    let needsEditor = isReadOnly(context.request.method)
      ? EDITOR_PAGES.some((pattern) => pattern.test(path))
      : !isSelfService(path)
    if (needsEditor && user.role !== 'editor') {
      return new Response('Only editors can do that.', { status: 403 })
    }

    return next()
  }
}

/** Only local paths, so a login link can't send people to another site. */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return routes.home.href()
  }
  return value
}

/** The logged-in user for the current request, for use while rendering. */
export function currentUser(): User | null {
  let state = getContext().get(Auth)
  return state?.ok ? (state.identity as User) : null
}

export function canEdit(): boolean {
  return currentUser()?.role === 'editor'
}

// --- Login rate limiting -------------------------------------------------------------------

const MAX_FAILURES = 10
const WINDOW_MS = 15 * 60 * 1000

let failures = new Map<string, { count: number; resetAt: number }>()

function limiterKey(username: string): string {
  return username.normalize('NFC').trim().toLowerCase()
}

/** True while a username has had too many failed logins recently. In memory; resets on restart. */
export function isLoginBlocked(username: string, now = Date.now()): boolean {
  let entry = failures.get(limiterKey(username))
  if (!entry) return false
  if (entry.resetAt <= now) {
    failures.delete(limiterKey(username))
    return false
  }
  return entry.count >= MAX_FAILURES
}

export function recordLoginFailure(username: string, now = Date.now()): void {
  let key = limiterKey(username)
  let entry = failures.get(key)
  if (!entry || entry.resetAt <= now) entry = { count: 0, resetAt: now + WINDOW_MS }
  entry.count++
  failures.set(key, entry)
}

export function clearLoginFailures(username: string): void {
  failures.delete(limiterKey(username))
}
