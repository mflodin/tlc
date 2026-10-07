import type { Database } from 'remix/data-table'
import { asyncContext } from 'remix/middleware/async-context'
import { cop } from 'remix/middleware/cop'
import { formData } from 'remix/middleware/form-data'
import { render } from 'remix/middleware/render'
import { staticFiles } from 'remix/middleware/static'
import { createRouter, type MiddlewareContext } from 'remix/router'

import controller from './actions/controller.tsx'
import setlistsController from './actions/setlists/controller.tsx'
import songsController from './actions/songs/controller.tsx'
import { assets } from './assets.ts'
import { accessControl, loadAuth, loadSession } from './middleware/auth.ts'
import { loadDatabase } from './middleware/database.ts'
import { routes } from './routes.ts'

const formDataMiddleware = formData()
const renderMiddleware = render({ assets })
type AppContext = MiddlewareContext<
  [
    ReturnType<typeof loadSession>,
    ReturnType<typeof loadDatabase>,
    typeof formDataMiddleware,
    ReturnType<typeof loadAuth>,
    typeof renderMiddleware,
  ]
>

declare module 'remix' {
  interface RouterTypes {
    context: AppContext
  }
}

export interface AppRouterOptions {
  db: Database
  /** Signs the session cookie. Keep it secret and stable; changing it logs everyone out. */
  sessionSecret: string
}

/** Builds the app's router, so tests can pass an in-memory database. */
export function createAppRouter({ db, sessionSecret }: AppRouterOptions) {
  let router = createRouter<AppContext>({
    middleware: [
      staticFiles('./public', { index: false }),
      asyncContext(),
      // Rejects form posts from other sites, since the session cookie authenticates them.
      cop(),
      loadSession(sessionSecret),
      loadDatabase(db),
      formDataMiddleware,
      loadAuth(db),
      renderMiddleware,
      accessControl(),
    ],
  })

  router.map(routes, controller)
  router.map(routes.songs, songsController)
  router.map(routes.setlists, setlistsController)

  return router
}
