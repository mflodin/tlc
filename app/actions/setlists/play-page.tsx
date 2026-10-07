import type { Handle } from 'remix/component'
import { css } from 'remix/component'

import type { Song } from '../../data/chordpro.ts'
import type { Setlist } from '../../data/setlists.ts'
import { songParams } from '../../data/song-id.ts'
import { routes } from '../../routes.ts'
import { Layout } from '../../ui/layout.tsx'
import { menuItemStyle, SongMenu } from '../../ui/song-menu.tsx'
import { SongBody, SongHeader, withSteps } from '../../ui/song-view.tsx'
import { buttonStyle, mutedStyle, rowStyle } from '../../ui/styles.ts'
import { PlayKeys } from './public/play-keys.tsx'

export interface PlayPageProps {
  setlist: Setlist
  pos: number
  slug: string
  song: Song
  steps: number
  menuOpen?: boolean
}

export function PlayPage(handle: Handle<PlayPageProps>) {
  return () => {
    let { setlist, pos, slug, song, steps, menuOpen = false } = handle.props
    let total = setlist.songIds.length
    let playHref = (n: number) => routes.setlists.play.href({ id: setlist.id, pos: String(n) })
    let prevHref = pos > 1 ? playHref(pos - 1) : undefined
    let nextHref = pos < total ? playHref(pos + 1) : undefined

    return (
      <Layout title={`${song.title} · ${setlist.name}`} bare>
        <nav mix={[rowStyle, barStyle]} aria-label="Setlist navigation">
          <a href={routes.setlists.show.href({ id: setlist.id })} mix={buttonStyle}>
            ✕ {setlist.name}
          </a>
          <span mix={mutedStyle}>
            {pos} / {total}
          </span>
          <span mix={css({ flex: 1 })} />
          <SongMenu steps={steps} hrefFor={(n) => withSteps(playHref(pos), n)} open={menuOpen}>
            <a href={routes.songs.show.href(songParams(slug))} mix={menuItemStyle}>
              Song page
            </a>
          </SongMenu>
        </nav>

        <SongHeader song={song} />
        <SongBody song={song} large />

        <nav mix={[rowStyle, footerStyle]} aria-label="Previous and next song">
          {prevHref ? (
            <a href={prevHref} rel="prev" mix={buttonStyle}>
              ← Previous
            </a>
          ) : (
            <span />
          )}
          <span mix={css({ flex: 1 })} />
          {nextHref ? (
            <a href={nextHref} rel="next" mix={buttonStyle}>
              Next →
            </a>
          ) : (
            <span mix={mutedStyle}>End of setlist</span>
          )}
        </nav>
        <PlayKeys prevHref={prevHref} nextHref={nextHref} />
      </Layout>
    )
  }
}

const barStyle = css({
  marginBottom: '1.25rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid var(--border)',
})

const footerStyle = css({
  marginTop: '2.5rem',
  paddingTop: '1rem',
  borderTop: '1px solid var(--border)',
})
