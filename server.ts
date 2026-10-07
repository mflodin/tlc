import * as http from 'node:http'
import { createRequestListener } from 'remix/node-fetch-server'

import { migrateDatabase, openDatabase } from './app/db.ts'
import { createAppRouter } from './app/router.ts'

const sessionSecret = process.env.SESSION_SECRET
if (!sessionSecret && process.env.NODE_ENV === 'production') {
  throw new Error('Set SESSION_SECRET, e.g. dokku config:set tlc SESSION_SECRET=$(openssl rand -hex 32)')
}

const db = openDatabase()
await migrateDatabase(db)
const router = createAppRouter({ db, sessionSecret: sessionSecret ?? 'dev-only-session-secret' })

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 44100
const hmrProxyPort = process.env.HMR_PROXY_PORT
  ? Number.parseInt(process.env.HMR_PROXY_PORT, 10)
  : null
const isHmr = process.env.REMIX_NODE_HMR === '1'
// Behind Dokku's nginx, X-Forwarded-Proto says the request was https, which makes session
// cookies Secure. Only enable it when the app is reachable solely through that proxy.
const trustProxy = isHmr || process.env.TRUST_PROXY === '1'

const server = http.createServer(createRequestListener(router.fetch, { trustProxy }))

server.listen(port, () => {
  if (isHmr) {
    import('remix/node-hmr/runtime').then((nodeHmr) => nodeHmr.emitServerReady())
  }

  console.log(`Server listening on http://localhost:${hmrProxyPort ?? port}`)
})

let shuttingDown = false

function shutdown() {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  server.close(() => {
    Promise.resolve(db.close()).finally(() => process.exit(0))
  })
  server.closeAllConnections()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
