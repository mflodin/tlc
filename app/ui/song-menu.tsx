import type { Handle, RemixNode } from 'remix/component'
import { css } from 'remix/component'

import { normalizeSteps } from '../data/transpose.ts'
import { TransposeControls, transposeLabel, withMenuOpen } from './song-view.tsx'

export interface SongMenuProps {
  steps: number
  /** URL for n semitones of transposition; the menu flag is added automatically. */
  hrefFor: (steps: number) => string
  /** Render open, e.g. right after a transpose click. */
  open?: boolean
  /** Extra menu items below the transpose controls, such as Edit and Delete links. */
  children?: RemixNode
}

/**
 * The "⋯" menu in the upper right of a song. A native <details> element, so it works without
 * JavaScript. Shows the current transposition on the button when it isn't 0.
 */
export function SongMenu(handle: Handle<SongMenuProps>) {
  return () => {
    let { steps, hrefFor, open = false, children } = handle.props
    let transposed = normalizeSteps(steps) !== 0

    return (
      <details mix={menuStyle} open={open}>
        <summary mix={summaryStyle} aria-label="Song options" title="Song options">
          {transposed && <span mix={badgeStyle}>{transposeLabel(steps)}</span>}
          <span aria-hidden="true">⋯</span>
        </summary>
        <div mix={panelStyle}>
          <TransposeControls steps={steps} hrefFor={(n) => withMenuOpen(hrefFor(n))} />
          {children && <div mix={itemsStyle}>{children}</div>}
        </div>
      </details>
    )
  }
}

/** A full-width link inside a SongMenu. */
export const menuItemStyle = css({
  display: 'block',
  padding: '0.45rem 0.6rem',
  borderRadius: '6px',
  color: 'var(--text)',
  textDecoration: 'none',
  '&:hover': { background: 'var(--surface-2)', color: 'var(--accent)' },
})

export const dangerMenuItemStyle = css({
  color: 'var(--danger)',
  '&:hover': { color: 'var(--danger)' },
})

const menuStyle = css({
  position: 'relative',
  flex: '0 0 auto',
  '&[open] > summary': { borderColor: 'var(--accent)' },
})

const summaryStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  minWidth: '2.5rem',
  height: '2.25rem',
  justifyContent: 'center',
  padding: '0 0.6rem',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  fontSize: '1.2rem',
  lineHeight: 1,
  cursor: 'pointer',
  listStyle: 'none',
  userSelect: 'none',
  '&::-webkit-details-marker': { display: 'none' },
  '&:hover': { borderColor: 'var(--accent)' },
  '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: '2px' },
})

const badgeStyle = css({
  fontSize: '0.8rem',
  fontWeight: 700,
  color: 'var(--chord)',
  fontVariantNumeric: 'tabular-nums',
})

const panelStyle = css({
  position: 'absolute',
  right: 0,
  top: 'calc(100% + 0.4rem)',
  zIndex: 10,
  display: 'grid',
  gap: '0.6rem',
  minWidth: '15rem',
  padding: '0.75rem',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  background: 'var(--surface-1)',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.18)',
})

const itemsStyle = css({
  display: 'grid',
  paddingTop: '0.5rem',
  borderTop: '1px solid var(--border)',
})
