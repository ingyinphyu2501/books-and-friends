import { type FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'
import { useLanguage } from '../contexts/LanguageContext'

export function AuthPage() {
  const { user, loading } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signup') {
        const { error: signErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim() || undefined,
            },
          },
        })
        if (signErr) throw signErr
      } else {
        const { error: inErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (inErr) throw inErr
      }
      navigate('/sessions', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="page narrow">
        <p className="muted">{t('common.loading')}</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/sessions" replace />
  }

  return (
    <div className="page narrow">
      <div className="card auth-card">
        <h1 className="page-title">{mode === 'signup' ? t('auth.sign_up_title') : t('auth.sign_in_title')}</h1>
        <p className="muted">
          {mode === 'signup' ? t('landing.subtitle') : t('auth.switch_to_sign_in')}
        </p>
        <div className="segmented" role="tablist" aria-label="Auth mode">
          <button
            type="button"
            className={mode === 'signin' ? 'seg active' : 'seg'}
            onClick={() => setMode('signin')}
          >
            {t('nav.sign_in')}
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'seg active' : 'seg'}
            onClick={() => setMode('signup')}
          >
            {t('auth.sign_up_button')}
          </button>
        </div>
        <form className="stack-form" onSubmit={(e) => void onSubmit(e)}>
          {mode === 'signup' ? (
            <label className="field">
              <span>{t('auth.display_name')}</span>
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="nickname"
                placeholder="River"
              />
            </label>
          ) : null}
          <label className="field">
            <span>{t('auth.email')}</span>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <label className="field">
            <span>{t('auth.password')}</span>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="••••••••"
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t('common.loading') : mode === 'signup' ? t('auth.sign_up_button') : t('nav.sign_in')}
          </button>
        </form>
        <p className="muted small">
          Check your inbox and confirm your email before sign in.
        </p>
        <Link to="/" className="text-link">
          ← {t('common.back')}
        </Link>
      </div>
    </div>
  )
}
