import type { Handle } from 'remix/component'
import { css } from 'remix/component'

import type { SearchField, SearchResult } from '../data/search.ts'
import { songParams } from '../data/song-id.ts'
import type { StoredSong } from '../data/songs.ts'
import { routes } from '../routes.ts'
import { Layout } from '../ui/layout.tsx'
import { buttonStyle, cardListStyle, inputStyle, mutedStyle, primaryButtonStyle } from '../ui/styles.ts'

export interface HomePageProps {
  query: string
  field: SearchField
  songs: StoredSong[]
  results: SearchResult[]
}

const FIELD_LABELS: Record<SearchField, string> = {
  all: 'Everything',
  title: 'Title',
  artist: 'Artist',
  album: 'Album',
  lyrics: 'Lyrics',
}

export function HomePage(handle: Handle<HomePageProps>) {
  return () => {
    let { query, field, songs, results } = handle.props

    return (
      <Layout title={query ? `“${query}”` : undefined} query={query}>
        <form method="get" action={routes.home.href()} mix={searchFormStyle}>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Artist, title, album or a line of lyrics"
            aria-label="Search"
            mix={[inputStyle, css({ flex: '1 1 16rem' })]}
          />
          <select name="field" aria-label="Search in" mix={inputStyle}>
            {Object.entries(FIELD_LABELS).map(([value, label]) => (
              <option key={value} value={value} selected={value === field}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit" mix={[buttonStyle, primaryButtonStyle]}>
            Search
          </button>
        </form>

        {query ? <Results query={query} results={results} /> : <SongIndex songs={songs} />}
      </Layout>
    )
  }
}

function Results(handle: Handle<{ query: string; results: SearchResult[] }>) {
  return () => {
    let { query, results } = handle.props

    if (results.length === 0) {
      return <p mix={mutedStyle}>No songs match “{query}”.</p>
    }

    return (
      <section>
        <h2 mix={sectionTitleStyle}>
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </h2>
        <ul mix={cardListStyle}>
          {results.map(({ song, snippet }) => (
            <li key={song.slug}>
              <SongLink song={song} />
              {snippet && (
                <p mix={snippetStyle}>
                  {snippet.map((part, index) =>
                    part.match ? <mark key={index}>{part.text}</mark> : part.text,
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    )
  }
}

function SongIndex(handle: Handle<{ songs: StoredSong[] }>) {
  return () => {
    let { songs } = handle.props

    if (songs.length === 0) {
      return (
        <p mix={mutedStyle}>
          No songs yet. <a href={routes.songs.new.href()}>Add the first one</a>.
        </p>
      )
    }

    let byArtist = new Map<string, StoredSong[]>()
    for (let song of songs) {
      let artist = song.song.artist || 'Unknown artist'
      byArtist.set(artist, [...(byArtist.get(artist) ?? []), song])
    }

    return (
      <section>
        <h2 mix={sectionTitleStyle}>All songs ({songs.length})</h2>
        {[...byArtist].map(([artist, artistSongs]) => (
          <div key={artist} mix={artistGroupStyle}>
            <h3>{artist}</h3>
            <ul mix={cardListStyle}>
              {artistSongs.map((song) => (
                <li key={song.slug}>
                  <SongLink song={song} hideArtist />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    )
  }
}

function SongLink(handle: Handle<{ song: StoredSong; hideArtist?: boolean }>) {
  return () => {
    let { song: stored, hideArtist = false } = handle.props
    let { song } = stored
    let details = [hideArtist ? null : song.artist, song.album].filter(Boolean).join(' · ')

    return (
      <a href={routes.songs.show.href(songParams(stored.slug))} mix={songLinkStyle}>
        <strong>{song.title}</strong>
        {details && <span mix={mutedStyle}>{details}</span>}
      </a>
    )
  }
}

const searchFormStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginBottom: '1.5rem',
})

const sectionTitleStyle = css({
  fontSize: '1rem',
  fontWeight: 600,
  color: 'var(--muted)',
  margin: '0 0 0.75rem',
})

const artistGroupStyle = css({
  marginBottom: '1.25rem',
  '& h3': { margin: '0 0 0.4rem', fontSize: '1.05rem' },
})

const songLinkStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'baseline',
  gap: '0.25rem 0.75rem',
  textDecoration: 'none',
  '&:hover strong': { color: 'var(--accent)' },
})

const snippetStyle = css({
  margin: '0.25rem 0 0',
  color: 'var(--muted)',
  fontSize: '0.9rem',
  whiteSpace: 'pre-line',
  '& mark': {
    background: 'color-mix(in srgb, var(--accent) 22%, transparent)',
    color: 'var(--text)',
    borderRadius: '3px',
    padding: '0 0.1em',
  },
})
