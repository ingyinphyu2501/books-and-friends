import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { useLanguage } from '../contexts/LanguageContext'
import { LanguageSwitcher } from './LanguageSwitcher'

export function Shell() {
  const { user, signOut } = useAuth()
  const { t } = useLanguage()

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="top-nav">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden>
            📚
          </span>
          <span className="brand-text">{t('common.app_name')}</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <LanguageSwitcher />

          <nav className="nav-links" aria-label="Main">
            {user ? (
              <>
                <NavLink to="/sessions" className="nav-link">
                  {t('common.sessions')}
                </NavLink>
                <NavLink to="/profile" className="nav-link">
                  {t('nav.my_profile')}
                </NavLink>
                <NavLink to="/sessions/new" className="nav-link nav-link-accent">
                  {t('sessions.new_session')}
                </NavLink>
                <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
                  {t('nav.sign_out')}
                </button>
              </>
            ) : (
              <>
                <NavLink to="/auth" className="nav-link">
                  {t('nav.sign_in')}
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main-content" className="main-area" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>Read together. One thread, many voices.</p>
      </footer>
    </div>
  )
}
