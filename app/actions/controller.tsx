import { createController } from 'remix/router'

import { assets } from '../assets.ts'
import { isSearchField, searchSongs } from '../data/search.ts'
import { listSongs } from '../data/songs.ts'
import { routes } from '../routes.ts'
import { HomePage } from './home-page.tsx'

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
  },
})
