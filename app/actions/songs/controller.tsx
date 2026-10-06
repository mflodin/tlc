import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import type { SongMeta } from '../../data/chordpro.ts'
import { addSongToSetlist, listSetlists, setlistsContaining } from '../../data/setlists.ts'
import { songId, songParams } from '../../data/song-id.ts'
import { createSong, deleteSong, getSong, updateSong } from '../../data/songs.ts'
import { transposeSong } from '../../data/transpose.ts'
import { routes } from '../../routes.ts'
import { readSteps } from '../../ui/song-view.tsx'
import { notFound, readText } from '../form.ts'
import { DeleteSongPage } from './delete-page.tsx'
import { SongFormPage, type SongFormValues } from './form-page.tsx'
import { SongPage } from './song-page.tsx'

function readSongForm(formData: FormData): SongFormValues {
  return {
    title: readText(formData, 'title'),
    artist: readText(formData, 'artist'),
    album: readText(formData, 'album'),
    key: readText(formData, 'key'),
    capo: readText(formData, 'capo'),
    body: (formData.get('body') as string | null) ?? '',
  }
}

function validate(values: SongFormValues): string[] {
  let errors: string[] = []
  if (!values.title) errors.push('Title is required.')
  if (!values.artist) errors.push('Artist is required.')
  // Directives use `}` as terminator, so it can't appear in metadata values.
  for (let name of ['title', 'artist', 'album', 'key', 'capo'] as const) {
    if (/[{}\n]/.test(values[name])) errors.push(`${name} can't contain { or }.`)
  }
  return errors
}

function toMeta(values: SongFormValues): SongMeta {
  return {
    title: values.title,
    artist: values.artist,
    album: values.album || undefined,
    key: values.key || undefined,
    capo: values.capo || undefined,
  }
}

export default createController(routes.songs, {
  actions: {
    new(context) {
      return context.render(<SongFormPage mode="create" />)
    },

    async create(context) {
      let values = readSongForm(context.formData)
      let errors = validate(values)
      if (errors.length > 0) {
        return context.render(<SongFormPage mode="create" values={values} errors={errors} />, {
          status: 400,
        })
      }
      let id = await createSong(context.db, toMeta(values), values.body)
      return redirect(routes.songs.show.href(songParams(id)), 303)
    },

    async show(context) {
      let stored = await getSong(context.db, songId(context.params))
      if (!stored) return notFound('Song')

      let steps = readSteps(context.url)
      let allSetlists = await listSetlists(context.db)
      let memberOf = allSetlists.filter((s) => s.songIds.includes(stored.slug))

      return context.render(
        <SongPage
          slug={stored.slug}
          song={transposeSong(stored.song, steps)}
          steps={steps}
          memberOf={memberOf}
          otherSetlists={allSetlists.filter((s) => !s.songIds.includes(stored.slug))}
        />,
      )
    },

    async edit(context) {
      let stored = await getSong(context.db, songId(context.params))
      if (!stored) return notFound('Song')

      let { song } = stored
      let values: SongFormValues = {
        title: song.title,
        artist: song.artist,
        album: song.album ?? '',
        key: song.key ?? '',
        capo: song.capo ?? '',
        body: stored.body,
      }
      return context.render(<SongFormPage mode="edit" slug={stored.slug} values={values} />)
    },

    async update(context) {
      let slug = songId(context.params)
      if (!(await getSong(context.db, slug))) return notFound('Song')

      let values = readSongForm(context.formData)
      let errors = validate(values)
      if (errors.length > 0) {
        return context.render(
          <SongFormPage mode="edit" slug={slug} values={values} errors={errors} />,
          { status: 400 },
        )
      }
      let newId = await updateSong(context.db, slug, toMeta(values), values.body)
      if (!newId) return notFound('Song')
      return redirect(routes.songs.show.href(songParams(newId)), 303)
    },

    async confirmDelete(context) {
      let stored = await getSong(context.db, songId(context.params))
      if (!stored) return notFound('Song')

      let memberOf = await setlistsContaining(context.db, stored.slug)
      return context.render(<DeleteSongPage slug={stored.slug} song={stored.song} memberOf={memberOf} />)
    },

    async destroy(context) {
      if (!(await deleteSong(context.db, songId(context.params)))) return notFound('Song')
      return redirect(routes.home.href(), 303)
    },

    async addToSetlist(context) {
      let slug = songId(context.params)
      if (!(await getSong(context.db, slug))) return notFound('Song')

      let setlistId = readText(context.formData, 'setlist')
      if (!(await addSongToSetlist(context.db, setlistId, slug))) return notFound('Setlist')
      return redirect(routes.songs.show.href(songParams(slug)), 303)
    },
  },
})
