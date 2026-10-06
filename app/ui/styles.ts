import { css } from 'remix/component'

export const buttonStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.45rem 0.85rem',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  font: 'inherit',
  fontSize: '0.9rem',
  textDecoration: 'none',
  cursor: 'pointer',
  '&:hover': { borderColor: 'var(--accent)' },
  '&:disabled': { opacity: 0.4, cursor: 'default' },
})

export const primaryButtonStyle = css({
  background: 'var(--accent)',
  borderColor: 'var(--accent)',
  color: 'var(--accent-text)',
  '&:hover': { filter: 'brightness(1.1)' },
})

export const dangerButtonStyle = css({
  color: 'var(--danger)',
  '&:hover': { borderColor: 'var(--danger)' },
})

export const inputStyle = css({
  padding: '0.5rem 0.65rem',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  background: 'var(--surface-1)',
  color: 'var(--text)',
  font: 'inherit',
  minWidth: 0,
})

export const rowStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.5rem',
})

export const mutedStyle = css({ color: 'var(--muted)' })

export const cardListStyle = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  gap: '0.4rem',
  '& > li': {
    padding: '0.6rem 0.8rem',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    background: 'var(--surface-1)',
  },
  '& a': { color: 'inherit' },
})
