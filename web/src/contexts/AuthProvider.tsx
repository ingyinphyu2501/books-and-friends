import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext, type AuthContextValue } from './auth-context'

async function ensureProfileRow(user: User) {
  const meta = user.user_metadata as { display_name?: string | undefined }
  const displayName =
    (typeof meta.display_name === 'string' && meta.display_name.trim()) ||
    user.email?.split('@')[0] ||
    'Reader'
  await supabase.from('profiles').upsert(
    { id: user.id, display_name: displayName },
    { onConflict: 'id' },
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session ?? null)
        if (data.session?.user) {
          void ensureProfileRow(data.session.user)
        }
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
      const u = next?.user
      if (u) {
        void ensureProfileRow(u)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signOut,
    }),
    [session, loading, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
