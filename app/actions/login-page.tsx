import type { Handle } from 'remix/component'
import { css } from 'remix/component'

import { routes } from '../routes.ts'
import { Layout } from '../ui/layout.tsx'
import { buttonStyle, inputStyle, primaryButtonStyle } from '../ui/styles.ts'

export function LoginPage(handle: Handle<{ returnTo: string; username?: string; error?: string }>) {
  return () => {
    let { returnTo, username = '', error } = handle.props

    return (
      <Layout title="Log in" bare>
        <div mix={boxStyle}>
          <h1>Tlc</h1>
          {error && (
            <p role="alert" mix={css({ color: 'var(--danger)' })}>
              {error}
            </p>
          )}
          <form method="post" action={routes.loginAction.href()} mix={formStyle}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <label mix={labelStyle}>
              <span>Username</span>
              <input
                name="username"
                defaultValue={username}
                autoComplete="username"
                autoCapitalize="none"
                required
                mix={inputStyle}
              />
            </label>
            <label mix={labelStyle}>
              <span>Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                mix={inputStyle}
              />
            </label>
            <button type="submit" mix={[buttonStyle, primaryButtonStyle, css({ justifyContent: 'center' })]}>
              Log in
            </button>
          </form>
        </div>
      </Layout>
    )
  }
}

const boxStyle = css({
  maxWidth: '22rem',
  margin: '12vh auto 0',
  padding: '1.5rem',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  background: 'var(--surface-1)',
  '& h1': { margin: '0 0 1rem', fontSize: '1.4rem' },
})

const formStyle = css({ display: 'grid', gap: '0.9rem' })

const labelStyle = css({
  display: 'grid',
  gap: '0.3rem',
  fontSize: '0.9rem',
  fontWeight: 600,
  '& input': { fontWeight: 400 },
})
