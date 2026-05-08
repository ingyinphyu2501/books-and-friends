import { type FormEvent, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'
import { useLanguage } from '../contexts/LanguageContext'

interface GoogleBookItem {
  id: string
  volumeInfo: {
    title: string
    authors?: string[]
    imageLinks?: {
      thumbnail: string
    }
  }
}

function normalizeChapters(raw: string[]): string[] {
  return raw.map((c) => c.trim()).filter((c) => c.length > 0)
}

export function CreateSessionPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [externalId, setExternalId] = useState<string | null>(null)
  const [chapterLines, setChapterLines] = useState<string[]>(['', ''])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Book Search State
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GoogleBookItem[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 2) {
        searchBooks(query)
      } else {
        setResults([])
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [query])

  async function searchBooks(q: string) {
    setSearching(true)
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5${apiKey ? `&key=${apiKey}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      setResults(data.items || [])
      setShowResults(true)
    } catch (err) {
      console.error('Book search failed', err)
    } finally {
      setSearching(false)
    }
  }

  function selectBook(book: GoogleBookItem) {
    setTitle(book.volumeInfo.title)
    setAuthor(book.volumeInfo.authors?.join(', ') || '')
    setCoverUrl(book.volumeInfo.imageLinks?.thumbnail || null)
    setExternalId(book.id)
    setShowResults(false)
    setQuery('')
  }

  function addChapterRow() {
    setChapterLines((prev) => [...prev, ''])
  }

  function updateChapter(i: number, value: string) {
    setChapterLines((prev) => prev.map((c, idx) => (idx === i ? value : c)))
  }

  function removeChapter(i: number) {
    setChapterLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    const chapters = normalizeChapters(chapterLines)
    if (!title.trim() || !author.trim()) {
      setError(t('create_session.book_title') + ' & ' + t('create_session.author') + ' are required.')
      return
    }
    if (chapters.length === 0) {
      setError(t('create_session.chapters_hint'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { data: session, error: sErr } = await supabase
        .from('reading_sessions')
        .insert({
          creator_id: user.id,
          title: title.trim(),
          author: author.trim(),
          cover_url: coverUrl,
          external_id: externalId,
        })
        .select('id')
        .single()
      if (sErr) throw sErr
      if (!session) throw new Error('No session returned')

      const chapterRows = chapters.map((label, sort_order) => ({
        session_id: session.id,
        sort_order,
        label,
      }))

      const { error: cErr } = await supabase.from('session_chapters').insert(chapterRows)
      if (cErr) throw cErr

      navigate(`/sessions/${session.id}`, { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page narrow">
      <header className="page-header stack">
        <div>
          <h1 className="page-title">{t('create_session.title')}</h1>
          <p className="muted">{t('create_session.subtitle')}</p>
        </div>
        <Link to="/sessions" className="text-link">
          ← {t('sessions.all_sessions')}
        </Link>
      </header>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <label className="field">
          <span>{t('create_session.search_book')}</span>
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('create_session.search_placeholder')}
          />
          {searching && <p className="muted small">{t('common.loading')}</p>}
        </label>

        {showResults && results.length > 0 && (
          <ul className="search-results-list">
            {results.map((book) => (
              <li key={book.id}>
                <button type="button" className="search-result-item" onClick={() => selectBook(book)}>
                  {book.volumeInfo.imageLinks?.thumbnail && (
                    <img src={book.volumeInfo.imageLinks.thumbnail} alt="" className="search-result-cover" />
                  )}
                  <div className="search-result-info">
                    <strong>{book.volumeInfo.title}</strong>
                    <p className="muted small">{book.volumeInfo.authors?.join(', ')}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form className="card stack-form" onSubmit={(e) => void onSubmit(e)}>
        {coverUrl && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <img src={coverUrl} alt="Cover" style={{ width: 60, borderRadius: 4 }} />
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setCoverUrl(null)}>
              {t('common.remove')}
            </button>
          </div>
        )}

        <label className="field">
          <span>{t('create_session.book_title')}</span>
          <input
            className="input"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The Left Hand of Darkness"
          />
        </label>
        <label className="field">
          <span>{t('create_session.author')}</span>
          <input
            className="input"
            required
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Ursula K. Le Guin"
          />
        </label>

        <fieldset className="fieldset">
          <legend>{t('create_session.chapters_legend')}</legend>
          <p className="muted small">{t('create_session.chapters_hint')}</p>
          <div className="chapter-editor">
            {chapterLines.map((line, i) => (
              <div className="chapter-row" key={i}>
                <span className="chapter-index" aria-hidden>
                  {i + 1}.
                </span>
                <input
                  className="input"
                  value={line}
                  onChange={(e) => updateChapter(i, e.target.value)}
                  placeholder="Chapter title"
                  aria-label={`Chapter ${i + 1}`}
                />
                <button
                  type="button"
                  className="btn btn-ghost icon-btn"
                  onClick={() => removeChapter(i)}
                  aria-label={`Remove chapter ${i + 1}`}
                  disabled={chapterLines.length <= 1}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-secondary btn-small" onClick={addChapterRow}>
            {t('create_session.add_row')}
          </button>
        </fieldset>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? t('common.loading') : t('create_session.create_button')}
        </button>
      </form>
    </div>
  )
}
