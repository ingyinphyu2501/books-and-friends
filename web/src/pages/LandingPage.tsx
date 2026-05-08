import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { useLanguage } from '../contexts/LanguageContext'

export function LandingPage() {
  const { user, loading } = useAuth()
  const { t } = useLanguage()

  return (
    <div className="page landing">
      <section className="hero-card card">
        <p className="eyebrow">{t('common.app_name')}</p>
        <h1 className="hero-title">{t('landing.title')}</h1>
        <p className="lede">
          {t('landing.subtitle')}
        </p>
        <div className="hero-actions">
          {loading ? (
            <span className="muted">{t('common.loading')}</span>
          ) : user ? (
            <Link to="/sessions" className="btn btn-primary">
              {t('landing.browse_sessions')}
            </Link>
          ) : (
            <>
              <Link to="/auth" className="btn btn-primary">
                {t('landing.get_started')}
              </Link>
              <Link to="/auth" className="btn btn-secondary">
                {t('nav.sign_in')}
              </Link>
            </>
          )}
        </div>
      </section>
      <section className="feature-grid">
        <article className="card feature">
          <h2>{t('landing.feature_chapters_title')}</h2>
          <p>{t('landing.feature_chapters_desc')}</p>
        </article>
        <article className="card feature">
          <h2>{t('landing.feature_thread_title')}</h2>
          <p>{t('landing.feature_thread_desc')}</p>
        </article>
        <article className="card feature">
          <h2>{t('landing.feature_reactions_title')}</h2>
          <p>{t('landing.feature_reactions_desc')}</p>
        </article>
      </section>
    </div>
  )
}
