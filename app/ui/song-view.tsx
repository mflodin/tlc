import type { Handle } from 'remix/component'
import { css } from 'remix/component'

import { isChordOnly, type Block, type Song } from '../data/chordpro.ts'
import { normalizeSteps } from '../data/transpose.ts'
import { buttonStyle, mutedStyle, rowStyle } from './styles.ts'

export function SongBody(handle: Handle<{ song: Song; large?: boolean }>) {
  return () => {
    let { song, large = false } = handle.props

    return (
      <div mix={[bodyStyle, large ? largeStyle : null]}>
        {song.blocks.map((block, index) => (
          <SongBlock key={index} block={block} />
        ))}
      </div>
    )
  }
}

function SongBlock(handle: Handle<{ block: Block }>) {
  return () => {
    let { block } = handle.props

    switch (block.type) {
      case 'heading':
        return <h3 mix={headingStyle}>{block.text}</h3>
      case 'empty':
        return <div mix={emptyStyle} />
      case 'tab':
        return <pre mix={tabStyle}>{block.text}</pre>
      case 'line': {
        if (isChordOnly(block.segments)) {
          // No words to sit above, so the chords stay in place between bar lines and repeats.
          let last = block.segments.length - 1
          return (
            <div mix={[chordOnlyLineStyle, block.chorus ? chorusStyle : null]}>
              {block.segments.map((segment, index) => (
                <span key={index}>
                  {segment.chord && <span mix={inlineChordStyle}>{segment.chord}</span>}
                  {segment.lyric || (segment.chord && index < last ? ' ' : '')}
                </span>
              ))}
            </div>
          )
        }

        let hasChords = block.segments.some((segment) => segment.chord)
        return (
          <div mix={[lineStyle, block.chorus ? chorusStyle : null]}>
            {block.segments.map((segment, index) => (
              <span key={index} mix={segmentStyle}>
                {hasChords && <span mix={chordStyle}>{segment.chord ?? ''}</span>}
                <span mix={lyricStyle}>{segment.lyric || (segment.chord ? ' ' : '')}</span>
              </span>
            ))}
          </div>
        )
      }
    }
  }
}

export function SongHeader(handle: Handle<{ song: Song }>) {
  return () => {
    let { song } = handle.props
    return (
      <header mix={songHeaderStyle}>
        <h1>{song.title}</h1>
        <p mix={mutedStyle}>
          {[song.artist, song.album].filter(Boolean).join(' · ')}
          {song.key && <> · Key {song.key}</>}
          {song.capo && <> · Capo {song.capo}</>}
        </p>
      </header>
    )
  }
}

/** Plain links so transposing works without JavaScript. `hrefFor(n)` builds the URL for n steps. */
export function TransposeControls(handle: Handle<{ steps: number; hrefFor: (steps: number) => string }>) {
  return () => {
    let { steps, hrefFor } = handle.props
    let normalized = normalizeSteps(steps)
    let label = transposeLabel(steps)

    return (
      <div mix={rowStyle} aria-label="Transpose">
        <span mix={mutedStyle}>Transpose</span>
        <a href={hrefFor(steps - 1)} mix={buttonStyle} aria-label="Transpose down a semitone">
          −
        </a>
        <span mix={transposeValueStyle}>{label}</span>
        <a href={hrefFor(steps + 1)} mix={buttonStyle} aria-label="Transpose up a semitone">
          +
        </a>
        {normalized !== 0 && (
          <a href={hrefFor(0)} mix={buttonStyle}>
            Reset
          </a>
        )}
      </div>
    )
  }
}

/** "+2", "−3" or "0" for a number of semitones. */
export function transposeLabel(steps: number): string {
  let normalized = normalizeSteps(steps)
  return normalized === 0 ? '0' : normalized <= 6 ? `+${normalized}` : `−${12 - normalized}`
}

/** Reads `?t=` from a URL, kept within one octave. */
export function readSteps(url: URL): number {
  let steps = Number.parseInt(url.searchParams.get('t') ?? '0', 10)
  if (!Number.isFinite(steps)) return 0
  let normalized = normalizeSteps(steps)
  return normalized > 6 ? normalized - 12 : normalized
}

export function withSteps(href: string, steps: number): string {
  let normalized = normalizeSteps(steps)
  if (normalized === 0) return href
  return `${href}?t=${normalized > 6 ? normalized - 12 : normalized}`
}

/**
 * Adds `menu=1` so the song menu renders open again after the page reloads, letting someone
 * click "+" several times without reopening it.
 */
export function withMenuOpen(href: string): string {
  return `${href}${href.includes('?') ? '&' : '?'}menu=1`
}

export function readMenuOpen(url: URL): boolean {
  return url.searchParams.has('menu')
}

const songHeaderStyle = css({
  marginBottom: '1rem',
  '& h1': { margin: '0 0 0.25rem' },
  '& p': { margin: 0 },
})

const bodyStyle = css({
  fontSize: '1.05rem',
})

const largeStyle = css({
  fontSize: 'clamp(1.15rem, 2.2vw, 1.6rem)',
})

const headingStyle = css({
  margin: '1.2em 0 0.3em',
  fontSize: '0.85em',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--muted)',
})

const emptyStyle = css({ height: '0.9em' })

const lineStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  minHeight: '1.5em',
})

const chorusStyle = css({
  paddingLeft: '1em',
  borderLeft: '3px solid var(--border)',
})

const segmentStyle = css({
  display: 'inline-flex',
  flexDirection: 'column',
})

const chordStyle = css({
  minHeight: '1.3em',
  paddingRight: '0.6ch',
  color: 'var(--chord)',
  fontWeight: 700,
  fontSize: '0.92em',
  whiteSpace: 'pre',
})

// Monospace so bar lines in consecutive rows line up as written.
const chordOnlyLineStyle = css({
  minHeight: '1.5em',
  whiteSpace: 'pre',
  overflowX: 'auto',
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontSize: '0.92em',
  color: 'var(--muted)',
})

const inlineChordStyle = css({
  color: 'var(--chord)',
  fontWeight: 700,
})

const lyricStyle = css({
  whiteSpace: 'pre',
})

const tabStyle = css({
  margin: '0.5em 0',
  padding: '0.75em 1em',
  overflowX: 'auto',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  background: 'var(--surface-1)',
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontSize: '0.85em',
  lineHeight: 1.35,
})

const transposeValueStyle = css({
  minWidth: '2.5ch',
  textAlign: 'center',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 600,
})
