import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'
import { useLanguage } from '../contexts/LanguageContext'

type SessionRow = {
  id: string
  title: string
  author: string
  created_at: string
  chapter_count: number
  creator_name: string
  cover_url: string | null
}

type ListMode = 'all' | 'mine'

const PAGE_SIZE = 20

export function SessionsListPage() {
  const { user } = useAuth()
  const { t } = useLanguage()

  const [mode, setMode] = useState<ListMode>('all')
  const [rows, setRows] = useState<SessionRow[]>([])
  const [mineFull, setMineFull] = useState<SessionRow[] | null>(null)

  const [mineVisible, setMineVisible] = useState(PAGE_SIZE)
  const [allOffset, setAllOffset] = useState(0)

  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  // ----------------------------
  // HELPERS
  // ----------------------------
  async function fetchChapterCounts(sessionIds: string[]) {
    const { data } = await supabase
      .from('session_chapters')
      .select('session_id')
      .in('session_id', sessionIds)

    const map: Record<string, number> = {}

    for (const c of data ?? []) {
      map[c.session_id] = (map[c.session_id] ?? 0) + 1
    }

    return map
  }

  // ----------------------------
  // LOAD ALL (INITIAL)
  // ----------------------------
  const loadAllInitial = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)
    setAllOffset(0)

    try {
      const to = PAGE_SIZE - 1

      const { data, error: qErr } = await supabase
        .from('reading_sessions')
        .select('id, title, author, created_at, cover_url, profiles(display_name)')
        .order('created_at', { ascending: false })
        .range(0, to)

      if (qErr) throw qErr
      const sessions = data as any[]

      const sessionIds = (sessions ?? []).map(s => s.id)
      const chapterMap = await fetchChapterCounts(sessionIds)

      const batch: SessionRow[] = (sessions ?? []).map(s => {
        const p = s.profiles as any
        return {
          id: s.id,
          title: s.title,
          author: s.author,
          created_at: s.created_at,
          chapter_count: chapterMap[s.id] ?? 0,
          creator_name: p?.display_name ?? 'Reader',
          cover_url: s.cover_url,
        }
      })

      setRows(batch)
      setHasMore(batch.length === PAGE_SIZE)
      setAllOffset(batch.length)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [user])

  // ----------------------------
  // LOAD MINE (INITIAL)
  // ----------------------------
  const loadMineInitial = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)
    setMineVisible(PAGE_SIZE)

    try {
      const [{ data: memberRows, error: mErr }, { data: createdRows, error: cErr }] =
        await Promise.all([
          supabase.from('session_members').select('session_id').eq('user_id', user.id),
          supabase.from('reading_sessions').select('id').eq('creator_id', user.id),
        ])

      if (mErr) throw mErr
      if (cErr) throw cErr

      const ids = new Set<string>()

      for (const r of memberRows ?? []) ids.add(r.session_id)
      for (const r of createdRows ?? []) ids.add(r.id)

      const idList = [...ids]

      if (idList.length === 0) {
        setMineFull([])
        setRows([])
        setHasMore(false)
        return
      }

      const { data, error: qErr } = await supabase
        .from('reading_sessions')
        .select('id, title, author, created_at, cover_url, profiles(display_name)')
        .in('id', idList)
        .order('created_at', { ascending: false })

      if (qErr) throw qErr
      const sessions = data as any[]

      const chapterMap = await fetchChapterCounts(idList)

      const full: SessionRow[] = (sessions ?? []).map(s => {
        const p = s.profiles as any
        return {
          id: s.id,
          title: s.title,
          author: s.author,
          created_at: s.created_at,
          chapter_count: chapterMap[s.id] ?? 0,
          creator_name: p?.display_name ?? 'Reader',
          cover_url: s.cover_url,
        }
      })

      setMineFull(full)
      setRows(full.slice(0, PAGE_SIZE))
      setHasMore(full.length > PAGE_SIZE)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [user])

  // ----------------------------
  // REFRESH
  // ----------------------------
  const refresh = useCallback(async () => {
    if (mode === 'all') await loadAllInitial()
    else await loadMineInitial()
  }, [mode, loadAllInitial, loadMineInitial])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refresh()
    }, 0)

    return () => window.clearTimeout(t)
  }, [refresh])

  // ----------------------------
  // LOAD MORE ALL
  // ----------------------------
  async function loadMoreAll() {
    if (!user) return

    setLoadingMore(true)
    setError(null)

    try {
      const from = allOffset
      const to = from + PAGE_SIZE - 1

      const { data, error: qErr } = await supabase
        .from('reading_sessions')
        .select('id, title, author, created_at, cover_url, profiles(display_name)')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (qErr) throw qErr
      const sessions = data as any[]

      const sessionIds = (sessions ?? []).map(s => s.id)
      const chapterMap = await fetchChapterCounts(sessionIds)

      const batch: SessionRow[] = (sessions ?? []).map(s => {
        const p = s.profiles as any
        return {
          id: s.id,
          title: s.title,
          author: s.author,
          created_at: s.created_at,
          chapter_count: chapterMap[s.id] ?? 0,
          creator_name: p?.display_name ?? 'Reader',
          cover_url: s.cover_url,
        }
      })

      setRows(prev => [...prev, ...batch])
      setAllOffset(prev => prev + batch.length)
      setHasMore(batch.length === PAGE_SIZE)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load more')
    } finally {
      setLoadingMore(false)
    }
  }

  // ----------------------------
  // LOAD MORE MINE
  // ----------------------------
  function loadMoreMine() {
    if (!mineFull) return

    const next = mineVisible + PAGE_SIZE
    setRows(mineFull.slice(0, next))
    setMineVisible(next)
    setHasMore(next < mineFull.length)
  }

  async function onLoadMore() {
    if (mode === 'all') await loadMoreAll()
    else loadMoreMine()
  }

  if (!user) return null

  // ----------------------------
  // UI
  // ----------------------------
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('sessions.title')}</h1>
          <p className="muted">
            {t('sessions.subtitle')}
          </p>
        </div>

        <Link to="/sessions/new" className="btn btn-primary">
          {t('sessions.new_session')}
        </Link>
      </header>

      <div className="tabs">
        <button
          className={mode === 'all' ? 'tab tab-active' : 'tab'}
          onClick={() => setMode('all')}
        >
          {t('sessions.all_sessions')}
        </button>

        <button
          className={mode === 'mine' ? 'tab tab-active' : 'tab'}
          onClick={() => setMode('mine')}
        >
          {t('sessions.my_sessions')}
        </button>
      </div>

      {loading ? <p className="muted">{t('common.loading')}</p> : null}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && rows.length === 0 ? (
        <div className="card empty-state">
          <h2>{t('sessions.no_sessions')}</h2>
          <p className="muted">
            {mode === 'mine'
              ? t('sessions.join_or_create')
              : t('sessions.be_first')}
          </p>

          <Link to="/sessions/new" className="btn btn-secondary">
            {t('sessions.create_session')}
          </Link>
        </div>
      ) : null}

      <ul className="session-list">
        {rows.map(s => (
          <li key={s.id}>
            <Link to={`/sessions/${s.id}`} className="session-card card">
              <div style={{ display: 'flex', gap: '1rem' }}>
                {s.cover_url && (
                  <img
                    src={s.cover_url}
                    alt=""
                    style={{ width: 60, height: 90, objectFit: 'cover', borderRadius: 4 }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div className="session-card-top">
                    <h2 className="session-title">{s.title}</h2>
                    <span className="pill">Public</span>
                  </div>

                  <p className="session-author">{s.author}</p>

                  <p className="muted small">
                    {t('sessions.chapters_count', { count: s.chapter_count })}
                  </p>

                  <p className="muted small">
                    {t('sessions.host', { name: s.creator_name })}
                  </p>

                  <p className="muted small">
                    {t('sessions.started', {
                      date: new Date(s.created_at).toLocaleDateString(undefined, {
                        dateStyle: 'medium',
                      }),
                    })}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {hasMore && rows.length > 0 ? (
        <div className="load-more-wrap">
          <button
            className="btn btn-secondary"
            disabled={loadingMore}
            onClick={() => void onLoadMore()}
          >
            {loadingMore ? t('common.loading') : t('common.load_more')}
          </button>
        </div>
      ) : null}
    </div>
  )
}