import type { Handle } from 'remix/component'
import { css } from 'remix/component'

import type { Song } from '../../data/chordpro.ts'
import type { Setlist } from '../../data/setlists.ts'
import { songParams } from '../../data/song-id.ts'
import { canEdit } from '../../middleware/auth.ts'
import { routes } from '../../routes.ts'
import { Layout } from '../../ui/layout.tsx'
import { dangerMenuItemStyle, menuItemStyle, SongMenu } from '../../ui/song-menu.tsx'
import { SongBody, SongHeader, withSteps } from '../../ui/song-view.tsx'
import { buttonStyle, inputStyle, mutedStyle, rowStyle } from '../../ui/styles.ts'

export interface SongPageProps {
  slug: string
  song: Song
  steps: number
  memberOf: Setlist[]
  otherSetlists: Setlist[]
  menuOpen?: boolean
}

export function SongPage(handle: Handle<SongPageProps>) {
  return () => {
    let { slug, song, steps, memberOf, otherSetlists, menuOpen = false } = handle.props
    let showHref = routes.songs.show.href(songParams(slug))
    let editable = canEdit()

    return (
      <Layout title={song.title}>
        <div mix={headerRowStyle}>
          <SongHeader song={song} />
          <SongMenu steps={steps} hrefFor={(n) => withSteps(showHref, n)} open={menuOpen}>
            {editable && (
              <>
                <a href={routes.songs.edit.href(songParams(slug))} mix={menuItemStyle}>
                  Edit
                </a>
                <a
                  href={routes.songs.confirmDelete.href(songParams(slug))}
                  mix={[menuItemStyle, dangerMenuItemStyle]}
                >
                  Delete
                </a>
              </>
            )}
          </SongMenu>
        </div>

        <SongBody song={song} />

        <aside mix={setlistBoxStyle}>
          <h2>Setlists</h2>
          {memberOf.length > 0 ? (
            <ul mix={[rowStyle, memberListStyle]}>
              {memberOf.map((setlist) => (
                <li key={setlist.id}>
                  <a href={routes.setlists.show.href({ id: setlist.id })}>{setlist.name}</a>
                </li>
              ))}
            </ul>
          ) : (
            <p mix={mutedStyle}>Not in any setlist yet.</p>
          )}
          {!editable ? null : otherSetlists.length > 0 ? (
            <form method="post" action={routes.songs.addToSetlist.href(songParams(slug))} mix={rowStyle}>
              <select name="setlist" aria-label="Setlist" mix={inputStyle}>
                {otherSetlists.map((setlist) => (
                  <option key={setlist.id} value={setlist.id}>
                    {setlist.name}
                  </option>
                ))}
              </select>
              <button type="submit" mix={buttonStyle}>
                Add to setlist
              </button>
            </form>
          ) : (
            <p mix={mutedStyle}>
              <a href={routes.setlists.index.href()}>Create a setlist</a> to add this song to it.
            </p>
          )}
        </aside>
      </Layout>
    )
  }
}

const headerRowStyle = css({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '1rem',
  marginBottom: '1.25rem',
  borderBottom: '1px solid var(--border)',
  '& > header': { flex: '1 1 auto', minWidth: 0 },
})

const memberListStyle = css({
  listStyle: 'none',
  margin: '0 0 0.75rem',
  padding: 0,
  '& li': {
    padding: '0.15rem 0.6rem',
    border: '1px solid var(--border)',
    borderRadius: '999px',
    background: 'var(--surface-1)',
  },
  '& a': { textDecoration: 'none' },
})

const setlistBoxStyle = css({
  marginTop: '3rem',
  paddingTop: '1rem',
  borderTop: '1px solid var(--border)',
  '& h2': { fontSize: '1rem', margin: '0 0 0.5rem' },
  '& p': { margin: '0 0 0.75rem' },
})
