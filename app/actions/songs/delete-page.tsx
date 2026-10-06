import type { Handle } from 'remix/component'

import type { Song } from '../../data/chordpro.ts'
import type { Setlist } from '../../data/setlists.ts'
import { songParams } from '../../data/song-id.ts'
import { routes } from '../../routes.ts'
import { Layout } from '../../ui/layout.tsx'
import { buttonStyle, dangerButtonStyle, rowStyle } from '../../ui/styles.ts'

export function DeleteSongPage(handle: Handle<{ slug: string; song: Song; memberOf: Setlist[] }>) {
  return () => {
    let { slug, song, memberOf } = handle.props

    return (
      <Layout title={`Delete ${song.title}`}>
        <h1>Delete “{song.title}”?</h1>
        <p>This removes the song file permanently.</p>
        {memberOf.length > 0 && (
          <p>It will also be removed from: {memberOf.map((s) => s.name).join(', ')}.</p>
        )}
        <form method="post" action={routes.songs.destroy.href(songParams(slug))} mix={rowStyle}>
          <button type="submit" mix={[buttonStyle, dangerButtonStyle]}>
            Delete song
          </button>
          <a href={routes.songs.show.href(songParams(slug))} mix={buttonStyle}>
            Cancel
          </a>
        </form>
      </Layout>
    )
  }
}
