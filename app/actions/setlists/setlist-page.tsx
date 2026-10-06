import type { Handle } from 'remix/component'
import { css } from 'remix/component'

import type { Setlist } from '../../data/setlists.ts'
import { songParams } from '../../data/song-id.ts'
import { routes } from '../../routes.ts'
import { Layout } from '../../ui/layout.tsx'
import {
  buttonStyle,
  dangerButtonStyle,
  inputStyle,
  mutedStyle,
  primaryButtonStyle,
  rowStyle,
} from '../../ui/styles.ts'

interface SongEntry {
  slug: string
  title: string
  artist: string
}

export interface SetlistPageProps {
  setlist: Setlist
  entries: SongEntry[]
  available: SongEntry[]
}

export function SetlistPage(handle: Handle<SetlistPageProps>) {
  return () => {
    let { setlist, entries, available } = handle.props
    let updateHref = routes.setlists.update.href({ id: setlist.id })

    return (
      <Layout title={setlist.name}>
        <div mix={[rowStyle, headerStyle]}>
          <h1>{setlist.name}</h1>
          <span mix={css({ flex: 1 })} />
          {entries.length > 0 && (
            <a
              href={routes.setlists.play.href({ id: setlist.id, pos: '1' })}
              mix={[buttonStyle, primaryButtonStyle]}
            >
              ▶ Play
            </a>
          )}
        </div>

        {entries.length === 0 ? (
          <p mix={mutedStyle}>This setlist is empty. Add songs below or from a song's page.</p>
        ) : (
          <ol mix={listStyle}>
            {entries.map((entry, index) => (
              <li key={entry.slug}>
                <span mix={positionStyle}>{index + 1}</span>
                <a href={routes.songs.show.href(songParams(entry.slug))} mix={titleStyle}>
                  <strong>{entry.title}</strong>
                  {entry.artist && <span mix={mutedStyle}>{entry.artist}</span>}
                </a>
                <form method="post" action={updateHref} mix={rowStyle}>
                  <input type="hidden" name="index" value={String(index)} />
                  <button
                    type="submit"
                    name="intent"
                    value="up"
                    disabled={index === 0}
                    aria-label={`Move ${entry.title} up`}
                    mix={buttonStyle}
                  >
                    ↑
                  </button>
                  <button
                    type="submit"
                    name="intent"
                    value="down"
                    disabled={index === entries.length - 1}
                    aria-label={`Move ${entry.title} down`}
                    mix={buttonStyle}
                  >
                    ↓
                  </button>
                  <button
                    type="submit"
                    name="intent"
                    value="remove"
                    aria-label={`Remove ${entry.title}`}
                    mix={[buttonStyle, dangerButtonStyle]}
                  >
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ol>
        )}

        {available.length > 0 && (
          <form method="post" action={updateHref} mix={[rowStyle, sectionStyle]}>
            <input type="hidden" name="intent" value="add" />
            <select name="song" aria-label="Song to add" mix={[inputStyle, css({ flex: '1 1 16rem' })]}>
              {available.map((song) => (
                <option key={song.slug} value={song.slug}>
                  {song.title}
                  {song.artist ? ` — ${song.artist}` : ''}
                </option>
              ))}
            </select>
            <button type="submit" mix={buttonStyle}>
              Add song
            </button>
          </form>
        )}

        <details mix={sectionStyle}>
          <summary>Rename or delete setlist</summary>
          <div mix={settingsStyle}>
            <form method="post" action={updateHref} mix={rowStyle}>
              <input type="hidden" name="intent" value="rename" />
              <input
                name="name"
                defaultValue={setlist.name}
                aria-label="Setlist name"
                required
                mix={inputStyle}
              />
              <button type="submit" mix={buttonStyle}>
                Rename
              </button>
            </form>
            <form method="post" action={routes.setlists.destroy.href({ id: setlist.id })}>
              <button type="submit" mix={[buttonStyle, dangerButtonStyle]}>
                Delete setlist
              </button>
            </form>
            <p mix={mutedStyle}>Deleting a setlist keeps its songs.</p>
          </div>
        </details>
      </Layout>
    )
  }
}

const headerStyle = css({ '& h1': { margin: 0 }, marginBottom: '1.25rem' })

const listStyle = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  gap: '0.4rem',
  '& > li': {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.5rem 0.75rem',
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    background: 'var(--surface-1)',
  },
})

const positionStyle = css({
  minWidth: '1.5rem',
  color: 'var(--muted)',
  fontVariantNumeric: 'tabular-nums',
})

const titleStyle = css({
  flex: '1 1 12rem',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0 0.75rem',
  alignItems: 'baseline',
  textDecoration: 'none',
  color: 'inherit',
})

const sectionStyle = css({ marginTop: '1.5rem' })

const settingsStyle = css({
  display: 'grid',
  gap: '0.75rem',
  marginTop: '0.75rem',
  '& p': { margin: 0 },
})
