import type { Handle, RemixNode } from 'remix/component'
import { css } from 'remix/component'

import { Document } from '../actions/document.tsx'
import { routes } from '../routes.ts'
import { inputStyle } from './styles.ts'

export interface LayoutProps {
  children?: RemixNode
  title?: string
  query?: string
  /** Hides the header for distraction-free play mode. */
  bare?: boolean
}

export function Layout(handle: Handle<LayoutProps>) {
  return () => {
    let { children, title, query = '', bare = false } = handle.props

    return (
      <Document title={title ? `${title} · Tlc` : 'Tlc'}>
        <div mix={themeStyle}>
          {!bare && (
            <header mix={headerStyle}>
              <a href={routes.home.href()} mix={brandStyle}>
                Tlc
              </a>
              <nav mix={navStyle}>
                <a href={routes.home.href()}>Songs</a>
                <a href={routes.setlists.index.href()}>Setlists</a>
                <a href={routes.songs.new.href()}>New song</a>
              </nav>
              <form method="get" action={routes.home.href()} role="search" mix={searchStyle}>
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search songs…"
                  aria-label="Search songs"
                  mix={inputStyle}
                />
              </form>
            </header>
          )}
          <main mix={bare ? bareMainStyle : mainStyle}>{children}</main>
        </div>
      </Document>
    )
  }
}

const themeStyle = css({
  '--bg': 'light-dark(#f6f5f2, #141414)',
  '--surface-1': 'light-dark(#ffffff, #1d1d1d)',
  '--surface-2': 'light-dark(#efede8, #262626)',
  '--border': 'light-dark(#d9d6cf, #363636)',
  '--text': 'light-dark(#1b1b1b, #ececec)',
  '--muted': 'light-dark(#6b6862, #9a9a9a)',
  '--accent': 'light-dark(#b4441c, #f08a5d)',
  '--accent-text': 'light-dark(#ffffff, #141414)',
  '--chord': 'light-dark(#b4441c, #f5a37c)',
  '--danger': 'light-dark(#b42318, #ff8a80)',
  minHeight: '100vh',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  lineHeight: 1.5,
  '& a': { color: 'var(--accent)' },
  '& h1, & h2, & h3': { lineHeight: 1.2 },
})

const headerStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.75rem 1.5rem',
  padding: '0.75rem clamp(1rem, 4vw, 2rem)',
  borderBottom: '1px solid var(--border)',
  background: 'var(--surface-1)',
})

const brandStyle = css({
  fontWeight: 800,
  fontSize: '1.2rem',
  letterSpacing: '-0.02em',
  textDecoration: 'none',
})

const navStyle = css({
  display: 'flex',
  gap: '1rem',
  '& a': { color: 'var(--text)', textDecoration: 'none' },
  '& a:hover': { color: 'var(--accent)' },
})

const searchStyle = css({
  marginLeft: 'auto',
  display: 'flex',
  flex: '1 1 14rem',
  maxWidth: '24rem',
  '& input': { flex: 1 },
})

const mainStyle = css({
  maxWidth: '60rem',
  margin: '0 auto',
  padding: '1.5rem clamp(1rem, 4vw, 2rem) 4rem',
})

const bareMainStyle = css({
  padding: '1rem clamp(1rem, 4vw, 2.5rem) 4rem',
})
