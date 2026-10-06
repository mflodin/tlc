import type { Database } from 'remix/data-table'
import { createRouter, type MiddlewareContext } from 'remix/router'
import { formData } from 'remix/middleware/form-data'
import { render } from 'remix/middleware/render'
import { staticFiles } from 'remix/middleware/static'

import controller from './actions/controller.tsx'
import setlistsController from './actions/setlists/controller.tsx'
import songsController from './actions/songs/controller.tsx'
import { assets } from './assets.ts'
import { loadDatabase } from './middleware/database.ts'
import { routes } from './routes.ts'

const formDataMiddleware = formData()
const renderMiddleware = render({ assets })
type AppContext = MiddlewareContext<
  [ReturnType<typeof loadDatabase>, typeof formDataMiddleware, typeof renderMiddleware]
>

declare module 'remix' {
  interface RouterTypes {
    context: AppContext
  }
}

/** Builds the app's router around a database, so tests can pass an in-memory one. */
export function createAppRouter({ db }: { db: Database }) {
  let router = createRouter<AppContext>({
    middleware: [
      staticFiles('./public', { index: false }),
      loadDatabase(db),
      formDataMiddleware,
      renderMiddleware,
    ],
  })

  router.map(routes, controller)
  router.map(routes.songs, songsController)
  router.map(routes.setlists, setlistsController)

  return router
}
