import { clientEntry, type Handle } from 'remix/component'

interface PlayKeysProps {
  prevHref?: string
  nextHref?: string
}

// Hydrates on its own and renders nothing; it only maps ←/→ to the prev/next links.
export const PlayKeys = clientEntry(import.meta.url, function PlayKeys(handle: Handle<PlayKeysProps>) {
  if (typeof document !== 'undefined') {
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
        let target = event.target as HTMLElement | null
        if (target?.closest('input, textarea, select, [contenteditable]')) return

        let href =
          event.key === 'ArrowLeft'
            ? handle.props.prevHref
            : event.key === 'ArrowRight'
              ? handle.props.nextHref
              : undefined
        if (href) {
          event.preventDefault()
          window.location.assign(href)
        }
      },
      { signal: handle.signal },
    )
  }

  return () => null
})
