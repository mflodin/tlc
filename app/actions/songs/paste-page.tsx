import type { Handle } from 'remix/component'
import { css } from 'remix/component'

import { routes } from '../../routes.ts'
import { Layout } from '../../ui/layout.tsx'
import { buttonStyle, inputStyle, mutedStyle, primaryButtonStyle, rowStyle } from '../../ui/styles.ts'

const PLACEHOLDER = `Artist - Title

[Verse 1]
G             D
Chords on the line above
Em            C
the lyrics they belong to`

export function PastePage(handle: Handle<{ text?: string; error?: string }>) {
  return () => {
    let { text = '', error } = handle.props

    return (
      <Layout title="Paste a song">
        <h1>Paste a song</h1>
        <p mix={mutedStyle}>
          Paste chords and lyrics in the usual “chords above the lyrics” format, or upload a text
          file. It's converted to ChordPro and opened in the song form so you can check it before
          saving. ChordPro is accepted as-is.
        </p>
        {error && (
          <p role="alert" mix={css({ color: 'var(--danger)' })}>
            {error}
          </p>
        )}
        <form
          method="post"
          action={routes.songs.convert.href()}
          encType="multipart/form-data"
          mix={formStyle}
        >
          <textarea
            name="text"
            rows={24}
            spellCheck={false}
            placeholder={PLACEHOLDER}
            defaultValue={text}
            aria-label="Song text"
            mix={[inputStyle, textStyle]}
          />
          <label mix={rowStyle}>
            <span>Or upload a file:</span>
            <input type="file" name="file" accept=".txt,.cho,.crd,.chopro,.pro,text/plain" />
          </label>
          <div mix={rowStyle}>
            <button type="submit" mix={[buttonStyle, primaryButtonStyle]}>
              Convert
            </button>
            <a href={routes.songs.new.href()} mix={buttonStyle}>
              Cancel
            </a>
          </div>
        </form>
      </Layout>
    )
  }
}

const formStyle = css({ display: 'grid', gap: '1rem' })

const textStyle = css({
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontSize: '0.9rem',
  lineHeight: 1.45,
  resize: 'vertical',
})
