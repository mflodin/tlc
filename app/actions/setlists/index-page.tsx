import type { Handle } from 'remix/component'
import { css } from 'remix/component'

import type { Setlist } from '../../data/setlists.ts'
import { routes } from '../../routes.ts'
import { Layout } from '../../ui/layout.tsx'
import {
  buttonStyle,
  cardListStyle,
  inputStyle,
  mutedStyle,
  primaryButtonStyle,
  rowStyle,
} from '../../ui/styles.ts'

export function SetlistsPage(handle: Handle<{ setlists: Setlist[]; error?: string }>) {
  return () => {
    let { setlists, error } = handle.props

    return (
      <Layout title="Setlists">
        <h1>Setlists</h1>

        <form method="post" action={routes.setlists.create.href()} mix={[rowStyle, formStyle]}>
          <input
            name="name"
            placeholder="New setlist name"
            aria-label="New setlist name"
            required
            mix={[inputStyle, css({ flex: '1 1 14rem' })]}
          />
          <button type="submit" mix={[buttonStyle, primaryButtonStyle]}>
            Create setlist
          </button>
        </form>
        {error && (
          <p role="alert" mix={css({ color: 'var(--danger)' })}>
            {error}
          </p>
        )}

        {setlists.length === 0 ? (
          <p mix={mutedStyle}>No setlists yet.</p>
        ) : (
          <ul mix={cardListStyle}>
            {setlists.map((setlist) => (
              <li key={setlist.id} mix={rowStyle}>
                <a href={routes.setlists.show.href({ id: setlist.id })}>
                  <strong>{setlist.name}</strong>
                </a>
                <span mix={mutedStyle}>
                  {setlist.songIds.length} {setlist.songIds.length === 1 ? 'song' : 'songs'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Layout>
    )
  }
}

const formStyle = css({ marginBottom: '1.5rem' })
