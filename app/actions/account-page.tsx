import type { Handle } from 'remix/component'
import { css } from 'remix/component'

import { MIN_PASSWORD_LENGTH } from '../data/passwords.ts'
import type { User } from '../data/users.ts'
import { routes } from '../routes.ts'
import { Layout } from '../ui/layout.tsx'
import { buttonStyle, inputStyle, mutedStyle, primaryButtonStyle } from '../ui/styles.ts'

export function AccountPage(handle: Handle<{ user: User; error?: string; saved?: boolean }>) {
  return () => {
    let { user, error, saved = false } = handle.props

    return (
      <Layout title="Account">
        <h1>{user.username}</h1>
        <p mix={mutedStyle}>{user.role === 'editor' ? 'Editor' : 'Viewer'}</p>

        <h2 mix={css({ fontSize: '1.1rem' })}>Change password</h2>
        {saved && <p role="status">Password changed. Other devices have been logged out.</p>}
        {error && (
          <p role="alert" mix={css({ color: 'var(--danger)' })}>
            {error}
          </p>
        )}
        <form method="post" action={routes.accountAction.href()} mix={formStyle}>
          <input type="text" name="username" value={user.username} autoComplete="username" hidden />
          <label mix={labelStyle}>
            <span>Current password</span>
            <input type="password" name="current" autoComplete="current-password" required mix={inputStyle} />
          </label>
          <label mix={labelStyle}>
            <span>
              New password <span mix={mutedStyle}>(at least {MIN_PASSWORD_LENGTH} characters)</span>
            </span>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
              mix={inputStyle}
            />
          </label>
          <div>
            <button type="submit" mix={[buttonStyle, primaryButtonStyle]}>
              Change password
            </button>
          </div>
        </form>
      </Layout>
    )
  }
}

const formStyle = css({ display: 'grid', gap: '0.9rem', maxWidth: '24rem' })

const labelStyle = css({
  display: 'grid',
  gap: '0.3rem',
  fontSize: '0.9rem',
  fontWeight: 600,
  '& input': { fontWeight: 400 },
})
