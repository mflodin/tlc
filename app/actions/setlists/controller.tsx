import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import {
  addSongToSetlist,
  createSetlist,
  deleteSetlist,
  getSetlist,
  listSetlists,
  moveSong,
  removeSongAt,
  renameSetlist,
} from '../../data/setlists.ts'
import { getSong, listSongs } from '../../data/songs.ts'
import { transposeSong } from '../../data/transpose.ts'
import { routes } from '../../routes.ts'
import { readSteps } from '../../ui/song-view.tsx'
import { notFound, readInt, readText } from '../form.ts'
import { SetlistsPage } from './index-page.tsx'
import { PlayPage } from './play-page.tsx'
import { SetlistPage } from './setlist-page.tsx'

export default createController(routes.setlists, {
  actions: {
    async index(context) {
      return context.render(<SetlistsPage setlists={await listSetlists(context.db)} />)
    },

    async create(context) {
      let name = readText(context.formData, 'name')
      if (!name) {
        return context.render(
          <SetlistsPage setlists={await listSetlists(context.db)} error="Give the setlist a name." />,
          { status: 400 },
        )
      }
      let id = await createSetlist(context.db, name)
      return redirect(routes.setlists.show.href({ id }), 303)
    },

    async show(context) {
      let setlist = await getSetlist(context.db, context.params.id)
      if (!setlist) return notFound('Setlist')

      let songs = await listSongs(context.db)
      let bySlug = new Map(songs.map((song) => [song.slug, song]))

      return context.render(
        <SetlistPage
          setlist={setlist}
          entries={setlist.songIds.map((slug) => {
            let song = bySlug.get(slug)
            return { slug, title: song?.title ?? slug, artist: song?.artist ?? '' }
          })}
          available={songs
            .filter((song) => !setlist.songIds.includes(song.slug))
            .map((song) => ({ slug: song.slug, title: song.title, artist: song.artist }))}
        />,
      )
    },

    async update(context) {
      let { db } = context
      let { id } = context.params
      let form = context.formData
      let index = readInt(readText(form, 'index'), -1)
      let ok: boolean

      switch (readText(form, 'intent')) {
        case 'rename': {
          let name = readText(form, 'name')
          ok = name ? await renameSetlist(db, id, name) : Boolean(await getSetlist(db, id))
          break
        }
        case 'add': {
          let slug = readText(form, 'song')
          if (!(await getSong(db, slug))) return notFound('Song')
          ok = await addSongToSetlist(db, id, slug)
          break
        }
        case 'remove':
          ok = await removeSongAt(db, id, index)
          break
        case 'up':
          ok = await moveSong(db, id, index, -1)
          break
        case 'down':
          ok = await moveSong(db, id, index, 1)
          break
        default:
          return new Response('Unknown intent', { status: 400 })
      }

      if (!ok) return notFound('Setlist')
      return redirect(routes.setlists.show.href({ id }), 303)
    },

    async destroy(context) {
      if (!(await deleteSetlist(context.db, context.params.id))) return notFound('Setlist')
      return redirect(routes.setlists.index.href(), 303)
    },

    async play(context) {
      let { id } = context.params
      let setlist = await getSetlist(context.db, id)
      if (!setlist) return notFound('Setlist')

      let pos = readInt(context.params.pos)
      let slug = setlist.songIds[pos - 1]
      if (!slug) return notFound('Song in setlist')

      let stored = await getSong(context.db, slug)
      if (!stored) return notFound('Song')

      let steps = readSteps(context.url)
      return context.render(
        <PlayPage
          setlist={setlist}
          pos={pos}
          slug={slug}
          song={transposeSong(stored.song, steps)}
          steps={steps}
        />,
      )
    },
  },
})
