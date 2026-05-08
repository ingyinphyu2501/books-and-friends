import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'
import { Avatar } from '../components/Avatar'
import { useLanguage } from '../contexts/LanguageContext'

export function ProfilePage() {
  const { user } = useAuth()
  const { t } = useLanguage()

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    setEmail(user.email ?? '')

    const { data, error: qErr } = await supabase
      .from('profiles')
      .select('display_name, bio, avatar_url')
      .eq('id', user.id)
      .maybeSingle()

    if (qErr) {
      setError(qErr.message)
    } else {
      setDisplayName(data?.display_name ?? '')
      setBio(data?.bio ?? '')
      setAvatarUrl(data?.avatar_url ?? null)
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(t)
  }, [load])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()

    if (!user) return

    const name = displayName.trim()

    if (!name) {
      setError(t('auth.display_name') + ' is required.')
      return
    }

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const { error: uErr } = await supabase
        .from('profiles')
        .update({
          display_name: name,
          bio: bio.trim() ? bio.trim() : null,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id)

      if (uErr) throw uErr

      setSaved(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="page narrow">
      <header className="page-header stack">
        <div>
          <h1 className="page-title">{t('profile.title')}</h1>
          <p className="muted">{t('profile.subtitle')}</p>
        </div>

        <Link to="/sessions" className="text-link">
          ← {t('common.sessions')}
        </Link>
      </header>

      {loading ? (
        <p className="muted">{t('common.loading')}</p>
      ) : (
        <div className="stack" style={{ gap: '2rem' }}>
          <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Avatar
              uid={user.id}
              url={avatarUrl}
              onUpload={(url) => {
                setAvatarUrl(url)
              }}
            />
          </div>

          <form className="card stack-form" onSubmit={(e) => void onSubmit(e)}>
            <label className="field">
              <span>{t('auth.email')}</span>
              <input
                className="input"
                type="email"
                value={email}
                disabled
                readOnly
              />
            </label>

            <label className="field">
              <span>{t('auth.display_name')}</span>
              <input
                className="input"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="nickname"
              />
            </label>

            <label className="field">
              <span>{t('profile.bio')}</span>
              <textarea
                className="input textarea"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('profile.bio_placeholder')}
              />
            </label>

            {error ? <p className="form-error">{error}</p> : null}
            {saved ? <p className="form-success">{t('profile.saved')}</p> : null}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? t('common.saving') : t('profile.save_profile')}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}