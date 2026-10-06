import type { Handle } from 'remix/component'
import { css } from 'remix/component'

import { songParams } from '../../data/song-id.ts'
import { routes } from '../../routes.ts'
import { Layout } from '../../ui/layout.tsx'
import { buttonStyle, inputStyle, mutedStyle, primaryButtonStyle, rowStyle } from '../../ui/styles.ts'

export interface SongFormValues {
  title: string
  artist: string
  album: string
  key: string
  capo: string
  body: string
}

export interface SongFormPageProps {
  mode: 'create' | 'edit'
  slug?: string
  values?: SongFormValues
  errors?: string[]
  /** Shown above the form, e.g. after converting pasted text. */
  notice?: string
}

const EMPTY: SongFormValues = { title: '', artist: '', album: '', key: '', capo: '', body: '' }

const BODY_PLACEHOLDER = `{comment: Verse 1}
[G]Chords go in [D]brackets right be[Em]fore the syllable
[C]Empty lines separate stanzas

{start_of_chorus}
[G]Chorus lines are marked like this
{end_of_chorus}

{start_of_tab}
e|-----0-----|
B|---1---1---|
{end_of_tab}`

export function SongFormPage(handle: Handle<SongFormPageProps>) {
  return () => {
    let { mode, slug, values = EMPTY, errors = [], notice } = handle.props
    let editSlug = mode === 'edit' ? slug : undefined
    let isEdit = editSlug !== undefined
    let action = editSlug ? routes.songs.update.href(songParams(editSlug)) : routes.songs.create.href()
    let cancelHref = editSlug ? routes.songs.show.href(songParams(editSlug)) : routes.home.href()
    let heading = isEdit ? `Edit ${values.title}` : 'New song'

    return (
      <Layout title={heading}>
        <h1>{heading}</h1>
        {!isEdit && !notice && (
          <p mix={mutedStyle}>
            Have chords and lyrics in another format?{' '}
            <a href={routes.songs.paste.href()}>Paste or upload them</a> and they'll be converted.
          </p>
        )}
        {notice && (
          <p role="status" mix={noticeStyle}>
            {notice}
          </p>
        )}
        {errors.length > 0 && (
          <ul role="alert" mix={errorStyle}>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
        <form method="post" action={action} mix={formStyle}>
          <div mix={fieldsStyle}>
            <Field label="Title" name="title" value={values.title} required />
            <Field label="Artist" name="artist" value={values.artist} required />
            <Field label="Album" name="album" value={values.album} />
            <Field label="Key" name="key" value={values.key} placeholder="e.g. G or Em" />
            <Field label="Capo" name="capo" value={values.capo} placeholder="e.g. 2" />
          </div>
          <label mix={labelStyle}>
            <span>
              Chords, lyrics and tabs <span mix={mutedStyle}>(ChordPro)</span>
            </span>
            <textarea
              name="body"
              rows={24}
              spellCheck={false}
              placeholder={BODY_PLACEHOLDER}
              defaultValue={values.body}
              mix={[inputStyle, bodyInputStyle]}
            />
          </label>
          <div mix={rowStyle}>
            <button type="submit" mix={[buttonStyle, primaryButtonStyle]}>
              {isEdit ? 'Save changes' : 'Add song'}
            </button>
            <a href={cancelHref} mix={buttonStyle}>
              Cancel
            </a>
          </div>
        </form>
      </Layout>
    )
  }
}

function Field(
  handle: Handle<{
    label: string
    name: string
    value: string
    required?: boolean
    placeholder?: string
  }>,
) {
  return () => {
    let { label, name, value, required = false, placeholder } = handle.props
    return (
      <label mix={labelStyle}>
        <span>{label}</span>
        <input
          name={name}
          defaultValue={value}
          required={required}
          placeholder={placeholder}
          mix={inputStyle}
        />
      </label>
    )
  }
}

const formStyle = css({ display: 'grid', gap: '1rem' })

const fieldsStyle = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
  gap: '0.75rem',
})

const labelStyle = css({
  display: 'grid',
  gap: '0.3rem',
  fontSize: '0.9rem',
  fontWeight: 600,
  '& input, & textarea': { fontWeight: 400 },
})

const bodyInputStyle = css({
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontSize: '0.9rem',
  lineHeight: 1.45,
  resize: 'vertical',
})

const noticeStyle = css({
  padding: '0.75rem 1rem',
  border: '1px solid var(--border)',
  borderLeft: '4px solid var(--accent)',
  borderRadius: '8px',
  background: 'var(--surface-1)',
})

const errorStyle = css({
  padding: '0.75rem 1rem 0.75rem 2rem',
  border: '1px solid var(--danger)',
  borderRadius: '8px',
  color: 'var(--danger)',
})
