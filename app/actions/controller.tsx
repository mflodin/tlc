import { completeAuth } from 'remix/auth'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { assets } from '../assets.ts'
import { isSearchField, searchSongs } from '../data/search.ts'
import { listSongs } from '../data/songs.ts'
import { authenticate, setPassword } from '../data/users.ts'
import {
  clearLoginFailures,
  isLoginBlocked,
  recordLoginFailure,
  safeReturnTo,
  type AuthRecord,
} from '../middleware/auth.ts'
import { routes } from '../routes.ts'
import { AccountPage } from './account-page.tsx'
import { readText } from './form.ts'
import { HomePage } from './home-page.tsx'
import { LoginPage } from './login-page.tsx'

function readPassword(formData: FormData, name: string): string {
  let value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

export default createController(routes, {
  actions: {
    async assets(context) {
      return (await assets.fetch(context.request)) ?? new Response('Not Found', { status: 404 })
    },

    async home(context) {
      let query = context.url.searchParams.get('q')?.trim() ?? ''
      let fieldParam = context.url.searchParams.get('field') ?? 'all'
      let field = isSearchField(fieldParam) ? fieldParam : 'all'

      let [songs, results] = await Promise.all([
        query ? [] : listSongs(context.db),
        query ? searchSongs(context.db, query, field) : [],
      ])

      return context.render(<HomePage query={query} field={field} songs={songs} results={results} />)
    },

    login(context) {
      let returnTo = safeReturnTo(context.url.searchParams.get('returnTo'))
      if (context.auth.ok) return redirect(returnTo)
      return context.render(<LoginPage returnTo={returnTo} />)
    },

    async loginAction(context) {
      let username = readText(context.formData, 'username')
      let password = readPassword(context.formData, 'password')
      let returnTo = safeReturnTo(readText(context.formData, 'returnTo'))

      if (isLoginBlocked(username)) {
        return context.render(
          <LoginPage
            returnTo={returnTo}
            username={username}
            error="Too many failed attempts. Try again in a while."
          />,
          { status: 429 },
        )
      }

      let user = await authenticate(context.db, username, password)
      if (!user) {
        recordLoginFailure(username)
        return context.render(
          <LoginPage returnTo={returnTo} username={username} error="Wrong username or password." />,
          { status: 401 },
        )
      }

      clearLoginFailures(username)
      // completeAuth rotates the session id before the auth record is written.
      let record: AuthRecord = { userId: user.id, version: user.sessionVersion }
      completeAuth(context).set('auth', record)
      return redirect(returnTo, 303)
    },

    logout(context) {
      context.session.destroy()
      return redirect(routes.login.href(), 303)
    },

    account(context) {
      if (!context.auth.ok) return redirect(routes.login.href())
      return context.render(<AccountPage user={context.auth.identity} />)
    },

    async accountAction(context) {
      if (!context.auth.ok) return redirect(routes.login.href())
      let user = context.auth.identity

      let current = readPassword(context.formData, 'current')
      if (!(await authenticate(context.db, user.username, current))) {
        return context.render(<AccountPage user={user} error="Current password is wrong." />, {
          status: 400,
        })
      }

      let updated
      try {
        updated = await setPassword(context.db, user.id, readPassword(context.formData, 'password'))
      } catch (error) {
        return context.render(<AccountPage user={user} error={(error as Error).message} />, {
          status: 400,
        })
      }

      // The password change bumped the session version; keep this session logged in.
      let record: AuthRecord = { userId: updated.id, version: updated.sessionVersion }
      completeAuth(context).set('auth', record)
      return context.render(<AccountPage user={updated} saved />)
    },
  },
})
