import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'
import { useLanguage } from '../contexts/LanguageContext'

type SessionRow = {
  id: string
  creator_id: string
  creator_name?: string
  title: string
  author: string
  created_at: string
}

type ChapterRow = { id: string; sort_order: number; label: string }

type MemberRow = { user_id: string; joined_at: string }

type PostRow = {
  id: string
  user_id: string
  body: string
  created_at: string
  edited_at: string | null
  is_spoiler: boolean
  spoiler_chapter_id: string | null
}

type ReactionRow = {
  id: string
  post_id: string
  user_id: string
  emoji: string
}

const QUICK_EMOJIS = ['👍', '❤️', '😄', '🤔', '🎉', '📚', '🔥', '✨']
const POST_PAGE = 40

function progressSetsFromRows(
  rows: { user_id: string; chapter_id: string }[],
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const r of rows) {
    let set = map.get(r.user_id)
    if (!set) {
      set = new Set()
      map.set(r.user_id, set)
    }
    set.add(r.chapter_id)
  }
  return map
}

function isUniqueViolation(err: unknown) {
  const e = err as { code?: string } | undefined
  return e?.code === '23505'
}

export function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()

  const [session, setSession] = useState<SessionRow | null>(null)
  const [chapters, setChapters] = useState<ChapterRow[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [profiles, setProfiles] = useState<Record<string, string>>({})
  const [isMember, setIsMember] = useState(false)
  const [progressByUser, setProgressByUser] = useState<Map<string, Set<string>>>(() => new Map())
  const [posts, setPosts] = useState<PostRow[]>([])
  const [postLimit, setPostLimit] = useState(POST_PAGE)
  const postLimitRef = useRef(postLimit)
  const prevSessionRef = useRef<string>('')
  const [hasMorePosts, setHasMorePosts] = useState(false)
  const [reactions, setReactions] = useState<ReactionRow[]>([])

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Discussion / Spoiler state
  const [postBody, setPostBody] = useState('')
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [spoilerChapterId, setSpoilerChapterId] = useState<string | null>(null)
  const [revealedPosts, setRevealedPosts] = useState<Set<string>>(new Set())

  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  const sessionId = id ?? ''

  const loadProfiles = useCallback(async (userIds: string[]) => {
    const unique = [...new Set(userIds)].filter(Boolean)
    if (unique.length === 0) return
    const { data } = await supabase.from('profiles').select('id, display_name').in('id', unique)
    const map: Record<string, string> = {}
    for (const row of data ?? []) {
      map[row.id] = row.display_name
    }
    setProfiles((prev) => ({ ...prev, ...map }))
  }, [])

  const fetchPostsPage = useCallback(
    async (limit: number) => {
      if (!sessionId) return { posts: [] as PostRow[], hasMore: false }
      const take = limit + 1
      const { data, error: psErr } = await supabase
        .from('discussion_posts')
        .select('id, user_id, body, created_at, edited_at, is_spoiler, spoiler_chapter_id')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(take)
      if (psErr) throw psErr
      const list = (data ?? []) as PostRow[]
      const hasMore = list.length > limit
      return { posts: hasMore ? list.slice(0, limit) : list, hasMore }
    },
    [sessionId],
  )

  const loadCore = useCallback(async () => {
    if (!sessionId || !user) return
    if (prevSessionRef.current !== sessionId) {
      prevSessionRef.current = sessionId
      postLimitRef.current = POST_PAGE
      setPostLimit(POST_PAGE)
      setEditingPostId(null)
      setEditDraft('')
    }
    setLoading(true)
    setError(null)
    try {
      const { data: s, error: sErr } = await supabase
        .from('reading_sessions')
        .select('*, profiles(display_name)')
        .eq('id', sessionId)
        .maybeSingle()
      if (sErr) throw sErr
      const sessionData = s as any
      setSession(
        sessionData
          ? {
              ...sessionData,
              creator_name: sessionData.profiles?.display_name ?? 'Reader',
            }
          : null,
      )

      const { data: ch, error: chErr } = await supabase
        .from('session_chapters')
        .select('id, sort_order, label')
        .eq('session_id', sessionId)
        .order('sort_order', { ascending: true })
      if (chErr) throw chErr
      setChapters((ch ?? []) as ChapterRow[])

      const { data: mem, error: mErr } = await supabase
        .from('session_members')
        .select('user_id, joined_at')
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true })
      if (mErr) throw mErr
      const memberRows = (mem ?? []) as MemberRow[]
      setMembers(memberRows)
      const member = memberRows.some((m) => m.user_id === user.id)
      setIsMember(member)

      await loadProfiles(memberRows.map((m) => m.user_id))

      if (member) {
        const { data: prog, error: pErr } = await supabase
          .from('member_chapter_progress')
          .select('user_id, chapter_id')
          .eq('session_id', sessionId)
        if (pErr) throw pErr
        setProgressByUser(progressSetsFromRows((prog ?? []) as { user_id: string; chapter_id: string }[]))

        const { posts: postRows, hasMore } = await fetchPostsPage(postLimitRef.current)
        setPosts(postRows)
        setHasMorePosts(hasMore)
        await loadProfiles([...memberRows.map((m) => m.user_id), ...postRows.map((p) => p.user_id)])

        if (postRows.length > 0) {
          const ids = postRows.map((p) => p.id)
          const { data: rx, error: rxErr } = await supabase
            .from('post_reactions')
            .select('id, post_id, user_id, emoji')
            .in('post_id', ids)
          if (rxErr) throw rxErr
          setReactions((rx ?? []) as ReactionRow[])
        } else {
          setReactions([])
        }
      } else {
        setProgressByUser(new Map())
        setPosts([])
        setHasMorePosts(false)
        setReactions([])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load session')
    } finally {
      setLoading(false)
    }
  }, [sessionId, user, loadProfiles, fetchPostsPage])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadCore()
    }, 0)
    return () => window.clearTimeout(t)
  }, [loadCore])

  const totalChapters = chapters.length

  const myCompleted = useMemo(() => {
    if (!user) return 0
    return progressByUser.get(user.id)?.size ?? 0
  }, [progressByUser, user])

  const myProgressPct =
    totalChapters === 0 ? 0 : Math.round((myCompleted / totalChapters) * 100)

  const groupProgressPct = useMemo(() => {
    if (!totalChapters || members.length === 0) return 0
    let sum = 0
    for (const m of members) {
      const n = progressByUser.get(m.user_id)?.size ?? 0
      sum += n / totalChapters
    }
    return Math.round((sum / members.length) * 100)
  }, [members, progressByUser, totalChapters])

  async function joinSession() {
    if (!user || !sessionId) return
    setBusy(true)
    setError(null)
    try {
      const { error: jErr } = await supabase.from('session_members').insert({
        session_id: sessionId,
        user_id: user.id,
      })
      const dup =
        jErr &&
        (isUniqueViolation(jErr) || (jErr.message ?? '').toLowerCase().includes('duplicate'))
      if (jErr && !dup) throw jErr
      await loadCore()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not join')
    } finally {
      setBusy(false)
    }
  }

  async function leaveSession() {
    if (!user || !sessionId) return
    if (!window.confirm(t('session_detail.leave_confirm'))) return
    setBusy(true)
    setError(null)
    try {
      const { error: dErr } = await supabase
        .from('session_members')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
      if (dErr) throw dErr
      navigate('/sessions', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not leave')
    } finally {
      setBusy(false)
    }
  }

  async function toggleChapter(chapterId: string) {
    if (!user || !sessionId) return
    const mine = progressByUser.get(user.id) ?? new Set()
    const on = mine.has(chapterId)
    setBusy(true)
    setError(null)
    try {
      if (on) {
        const { error: dErr } = await supabase
          .from('member_chapter_progress')
          .delete()
          .eq('session_id', sessionId)
          .eq('user_id', user.id)
          .eq('chapter_id', chapterId)
        if (dErr) throw dErr
        setProgressByUser((prev) => {
          const next = new Map(prev)
          const set = new Set(next.get(user.id) ?? [])
          set.delete(chapterId)
          next.set(user.id, set)
          return next
        })
      } else {
        const { error: iErr } = await supabase.from('member_chapter_progress').insert({
          session_id: sessionId,
          user_id: user.id,
          chapter_id: chapterId,
        })
        if (iErr) throw iErr
        setProgressByUser((prev) => {
          const next = new Map(prev)
          const set = new Set(next.get(user.id) ?? [])
          set.add(chapterId)
          next.set(user.id, set)
          return next
        })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update progress')
    } finally {
      setBusy(false)
    }
  }

  async function submitPost(e: FormEvent) {
    e.preventDefault()
    if (!user || !sessionId) return
    const body = postBody.trim()
    if (!body) return
    setBusy(true)
    setError(null)
    try {
      const { data, error: insErr } = await supabase
        .from('discussion_posts')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          body,
          is_spoiler: isSpoiler,
          spoiler_chapter_id: isSpoiler ? spoilerChapterId : null,
        })
        .select('id, user_id, body, created_at, edited_at, is_spoiler, spoiler_chapter_id')
        .single()
      if (insErr) throw insErr
      const row = data as PostRow
      setPosts((prev) => [...prev, row])
      setPostBody('')
      setIsSpoiler(false)
      setSpoilerChapterId(null)
      await loadProfiles([...posts.map((p) => p.user_id), user.id])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not post')
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit(postId: string) {
    if (!user || !sessionId) return
    const body = editDraft.trim()
    if (!body) return
    setBusy(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      const { data, error: uErr } = await supabase
        .from('discussion_posts')
        .update({ body, edited_at: now })
        .eq('id', postId)
        .eq('user_id', user.id)
        .select('id, user_id, body, created_at, edited_at, is_spoiler, spoiler_chapter_id')
        .single()
      if (uErr) throw uErr
      const row = data as PostRow
      setPosts((prev) => prev.map((p) => (p.id === postId ? row : p)))
      setEditingPostId(null)
      setEditDraft('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save edit')
    } finally {
      setBusy(false)
    }
  }

  async function deletePost(postId: string) {
    if (!window.confirm(t('session_detail.delete_confirm'))) return
    setBusy(true)
    setError(null)
    try {
      const { error: dErr } = await supabase.from('discussion_posts').delete().eq('id', postId)
      if (dErr) throw dErr
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      setReactions((prev) => prev.filter((r) => r.post_id !== postId))
      if (editingPostId === postId) {
        setEditingPostId(null)
        setEditDraft('')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete')
    } finally {
      setBusy(false)
    }
  }

  const reactionsByPost = useMemo(() => {
    const map = new Map<string, ReactionRow[]>()
    for (const r of reactions) {
      const list = map.get(r.post_id) ?? []
      list.push(r)
      map.set(r.post_id, list)
    }
    return map
  }, [reactions])

  async function toggleReaction(postId: string, emoji: string) {
    if (!user) return
    const mine = reactions.find((r) => r.post_id === postId && r.user_id === user.id && r.emoji === emoji)
    setBusy(true)
    setError(null)
    try {
      if (mine) {
        const { error: dErr } = await supabase.from('post_reactions').delete().eq('id', mine.id)
        if (dErr) throw dErr
        setReactions((prev) => prev.filter((r) => r.id !== mine.id))
      } else {
        const { data, error: iErr } = await supabase
          .from('post_reactions')
          .insert({ post_id: postId, user_id: user.id, emoji })
          .select('id, post_id, user_id, emoji')
          .single()
        if (iErr) throw iErr
        setReactions((prev) => [...prev, data as ReactionRow])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update reaction')
    } finally {
      setBusy(false)
    }
  }

  async function loadMorePosts() {
    const next = postLimit + POST_PAGE
    postLimitRef.current = next
    setPostLimit(next)
    setBusy(true)
    setError(null)
    try {
      const { posts: postRows, hasMore } = await fetchPostsPage(next)
      setPosts(postRows)
      setHasMorePosts(hasMore)
      if (postRows.length > 0) {
        const ids = postRows.map((p) => p.id)
        const { data: rx, error: rxErr } = await supabase
          .from('post_reactions')
          .select('id, post_id, user_id, emoji')
          .in('post_id', ids)
        if (rxErr) throw rxErr
        setReactions((rx ?? []) as ReactionRow[])
        await loadProfiles([...members.map((m) => m.user_id), ...postRows.map((p) => p.user_id)])
      } else {
        setReactions([])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load posts')
    } finally {
      setBusy(false)
    }
  }

  if (!user) {
    return null
  }

  if (!sessionId) {
    return (
      <div className="page narrow">
        <p className="muted">Missing session id.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page narrow">
        <p className="muted">{t('common.loading')}</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="page narrow">
        <p className="muted">Session not found.</p>
        <Link to="/sessions" className="text-link">
          ← {t('common.sessions')}
        </Link>
      </div>
    )
  }

  return (
    <div className="page session-page">
      <header className="session-hero card">
        <div className="session-hero-top">
          <Link to="/sessions" className="text-link">
            ← {t('common.sessions')}
          </Link>
          <span className="pill">Public</span>
        </div>
        <h1 className="session-hero-title">{session.title}</h1>
        <p className="session-hero-author">{session.author}</p>
        <p className="muted small">
          {t('sessions.started', { 
            date: new Date(session.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })
          })}
        </p>
        {isMember && totalChapters > 0 && members.length > 0 ? (
          <div className="group-progress" aria-label="Group reading progress">
            <p className="muted small">{t('session_detail.group_average')}</p>
            <div
              className="progress-track progress-track-compact"
              role="progressbar"
              aria-valuenow={groupProgressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="progress-fill progress-fill-soft" style={{ width: `${groupProgressPct}%` }} />
            </div>
            <p className="muted small">{t('session_detail.progress_across', { pct: groupProgressPct, count: members.length })}</p>
          </div>
        ) : null}
      </header>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="card" aria-labelledby="chapters-heading">
        <h2 id="chapters-heading" className="section-title">
          {t('session_detail.chapters')}
        </h2>
        <ol className="chapter-list-readonly">
          {chapters.map((ch) => (
            <li key={ch.id}>{ch.label}</li>
          ))}
        </ol>
      </section>

      <section className="card" aria-labelledby="members-heading">
        <h2 id="members-heading" className="section-title">
          {t('session_detail.members', { count: members.length })}
        </h2>
        <ul className="member-progress-list">
          {members.map((m) => {
            const done = progressByUser.get(m.user_id)?.size ?? 0
            const pct = totalChapters === 0 ? 0 : Math.round((done / totalChapters) * 100)
            return (
              <li key={m.user_id} className="member-progress-row">
                <div className="member-progress-head">
                  <span className="avatar-fallback" aria-hidden>
                    {(profiles[m.user_id] ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <div className="member-progress-name">
                      <span>{profiles[m.user_id] ?? 'Reader'}</span>
                      {m.user_id === session.creator_id ? <span className="mini-pill">Host</span> : null}
                      {m.user_id === user.id ? <span className="mini-pill mini-pill-you">You</span> : null}
                    </div>
                    <p className="muted small">
                      {t('session_detail.chapters_complete', { done, total: totalChapters })}
                    </p>
                  </div>
                </div>
                <div
                  className="progress-track progress-track-inline"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${profiles[m.user_id] ?? 'Reader'} progress`}
                >
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
        {!isMember ? (
          <div className="join-panel">
            <p className="muted">{t('session_detail.join_to_track')}</p>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void joinSession()}>
              {busy ? t('common.joining') : t('common.join')}
            </button>
          </div>
        ) : (
          <div className="join-panel join-panel-row">
            <button type="button" className="btn btn-danger-ghost" disabled={busy} onClick={() => void leaveSession()}>
              {t('common.leave')}
            </button>
          </div>
        )}
      </section>

      {isMember ? (
        <>
          <section className="card" aria-labelledby="your-progress-heading">
            <h2 id="your-progress-heading" className="section-title">
              {t('session_detail.your_progress')}
            </h2>
            <p className="muted small">
              {t('session_detail.chapters_complete', { done: myCompleted, total: totalChapters })}
            </p>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuenow={myProgressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="progress-fill" style={{ width: `${myProgressPct}%` }} />
            </div>
            <ul className="chapter-checklist">
              {chapters.map((ch) => {
                const done = progressByUser.get(user.id)?.has(ch.id) ?? false
                return (
                  <li key={ch.id}>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={done}
                        disabled={busy}
                        onChange={() => void toggleChapter(ch.id)}
                      />
                      <span>{ch.label}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="card discussion-card" aria-labelledby="discussion-heading">
            <h2 id="discussion-heading" className="section-title">
              {t('session_detail.discussion')}
            </h2>
            <p className="muted small">{t('session_detail.flat_thread_hint')}</p>
            <ul className="post-list">
              {posts.map((p) => {
                const rx = reactionsByPost.get(p.id) ?? []
                const grouped = new Map<string, { count: number; me: boolean }>()
                for (const r of rx) {
                  const cur = grouped.get(r.emoji) ?? { count: 0, me: false }
                  cur.count += 1
                  if (r.user_id === user.id) cur.me = true
                  grouped.set(r.emoji, cur)
                }
                const isOwn = p.user_id === user.id
                const isEditing = editingPostId === p.id

                // Spoiler Logic
                const myDone = progressByUser.get(user.id) ?? new Set()
                const isHiddenSpoiler =
                  p.is_spoiler &&
                  !isOwn &&
                  !revealedPosts.has(p.id) &&
                  (!p.spoiler_chapter_id || !myDone.has(p.spoiler_chapter_id))

                return (
                  <li key={p.id} className={isHiddenSpoiler ? 'post post-spoiler-hidden' : 'post'}>
                    <header className="post-meta">
                      <strong>{profiles[p.user_id] ?? 'Reader'}</strong>
                      <time dateTime={p.created_at}>
                        {new Date(p.created_at).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </time>
                      {p.edited_at ? <span className="muted small">· {t('session_detail.edited')}</span> : null}
                      {p.is_spoiler && <span className="spoiler-badge">SPOILER</span>}
                    </header>

                    {isHiddenSpoiler ? (
                      <div className="spoiler-overlay">
                        <p className="muted small">{t('session_detail.spoiler_warning')}</p>
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={() => setRevealedPosts((prev) => new Set(prev).add(p.id))}
                        >
                          {t('session_detail.reveal')}
                        </button>
                      </div>
                    ) : null}

                    <div className="post-content-wrap">
                      {isEditing ? (
                        <div className="post-edit">
                          <textarea
                            className="input textarea"
                            rows={3}
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            aria-label="Edit message"
                          />
                          <div className="post-edit-actions">
                            <button
                              type="button"
                              className="btn btn-primary btn-small"
                              disabled={busy}
                              onClick={() => void saveEdit(p.id)}
                            >
                              {t('common.save')}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-small"
                              disabled={busy}
                              onClick={() => {
                                setEditingPostId(null)
                                setEditDraft('')
                              }}
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="post-body">{p.body}</p>
                      )}
                    </div>
                    {isOwn && !isEditing ? (
                      <div className="post-own-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-small"
                          onClick={() => {
                            setEditingPostId(p.id)
                            setEditDraft(p.body)
                          }}
                        >
                          {t('common.edit')}
                        </button>
                        <button type="button" className="btn btn-ghost btn-small danger-text" disabled={busy} onClick={() => void deletePost(p.id)}>
                          {t('common.delete')}
                        </button>
                      </div>
                    ) : null}
                    {!isEditing ? (
                      <div className="reaction-bar">
                        <div className="reaction-counts">
                          {[...grouped.entries()].map(([emoji, info]) => (
                            <button
                              key={emoji}
                              type="button"
                              className={info.me ? 'rx rx-on' : 'rx'}
                              onClick={() => void toggleReaction(p.id, emoji)}
                              disabled={busy}
                              aria-pressed={info.me}
                              aria-label={`Toggle ${emoji} reaction`}
                            >
                              <span>{emoji}</span>
                              <span className="rx-count">{info.count}</span>
                            </button>
                          ))}
                        </div>
                        <div className="reaction-picker" aria-label="Add reaction">
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              className="emoji-suggestion"
                              disabled={busy}
                              onClick={() => void toggleReaction(p.id, emoji)}
                              aria-label={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
            {hasMorePosts ? (
              <div className="load-more-wrap">
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  disabled={busy}
                  onClick={() => void loadMorePosts()}
                >
                  Load more of the thread
                </button>
              </div>
            ) : null}
            <form className="composer" onSubmit={(e) => void submitPost(e)}>
              <label className="field">
                <span className="sr-only">Message</span>
                <textarea
                  className="input textarea"
                  rows={3}
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  placeholder={t('session_detail.post_placeholder')}
                />
              </label>

              <div className="composer-actions">
                <label className="spoiler-toggle">
                  <input
                    type="checkbox"
                    checked={isSpoiler}
                    onChange={(e) => setIsSpoiler(e.target.checked)}
                  />
                  <span>{t('session_detail.mark_as_spoiler')}</span>
                </label>

                {isSpoiler && (
                  <select
                    className="input select-small"
                    value={spoilerChapterId || ''}
                    onChange={(e) => setSpoilerChapterId(e.target.value || null)}
                  >
                    <option value="">{t('session_detail.select_chapter')}</option>
                    {chapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.label}
                      </option>
                    ))}
                  </select>
                )}

                <button type="submit" className="btn btn-primary" disabled={busy || !postBody.trim()}>
                  {t('session_detail.post_button')}
                </button>
              </div>
            </form>
          </section>
        </>
      ) : null}
    </div>
  )
}
