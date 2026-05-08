import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, FlatList } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRoute, useNavigation } from '@react-navigation/native'

type SessionRow = { id: string; creator_id: string; title: string; author: string; created_at: string }
type ChapterRow = { id: string; sort_order: number; label: string }
type MemberRow = { user_id: string; joined_at: string }
type PostRow = { id: string; user_id: string; body: string; created_at: string; edited_at: string | null }

export function SessionDetailScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation<any>()
  const { user } = useAuth()
  const { id: sessionId } = route.params

  const [session, setSession] = useState<SessionRow | null>(null)
  const [chapters, setChapters] = useState<ChapterRow[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [profiles, setProfiles] = useState<Record<string, string>>({})
  const [isMember, setIsMember] = useState(false)
  const [progress, setProgress] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const loadData = useCallback(async () => {
    if (!user || !sessionId) return
    setLoading(true)
    try {
      const { data: s } = await supabase.from('reading_sessions').select('*').eq('id', sessionId).single()
      setSession(s)

      const { data: ch } = await supabase.from('session_chapters').select('*').eq('session_id', sessionId).order('sort_order', { ascending: true })
      setChapters(ch ?? [])

      const { data: mem } = await supabase.from('session_members').select('*').eq('session_id', sessionId)
      setMembers(mem ?? [])
      setIsMember((mem ?? []).some(m => m.user_id === user.id))

      const userIds = (mem ?? []).map(m => m.user_id)
      const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', userIds)
      const profMap: Record<string, string> = {}
      profs?.forEach(p => profMap[p.id] = p.display_name)
      setProfiles(profMap)

      if (isMember) {
        const { data: prog } = await supabase.from('member_chapter_progress').select('chapter_id').eq('session_id', sessionId).eq('user_id', user.id)
        setProgress(new Set(prog?.map(p => p.chapter_id)))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [sessionId, user, isMember])

  useEffect(() => {
    loadData()
  }, [loadData])

  const joinSession = async () => {
    setBusy(true)
    try {
      await supabase.from('session_members').insert({ session_id: sessionId, user_id: user?.id })
      await loadData()
    } catch (err) {
      Alert.alert('Error', 'Could not join session')
    } finally {
      setBusy(false)
    }
  }

  const toggleChapter = async (chapterId: string) => {
    const done = progress.has(chapterId)
    setBusy(true)
    try {
      if (done) {
        await supabase.from('member_chapter_progress').delete().eq('session_id', sessionId).eq('user_id', user?.id).eq('chapter_id', chapterId)
        setProgress(prev => { const n = new Set(prev); n.delete(chapterId); return n })
      } else {
        await supabase.from('member_chapter_progress').insert({ session_id: sessionId, user_id: user?.id, chapter_id: chapterId })
        setProgress(prev => { const n = new Set(prev); n.add(chapterId); return n })
      }
    } catch (err) {
      Alert.alert('Error', 'Could not update progress')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#2f6f5e" /></View>
  if (!session) return <View style={styles.centered}><Text>Session not found</Text></View>

  const progressPct = chapters.length > 0 ? (progress.size / chapters.length) : 0

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{session.title}</Text>
        <Text style={styles.author}>{session.author}</Text>
        <Text style={styles.muted}>Started {new Date(session.created_at).toLocaleDateString()}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chapters</Text>
        {chapters.map((ch, idx) => (
          <TouchableOpacity 
            key={ch.id} 
            style={styles.chapterRow}
            onPress={() => isMember && toggleChapter(ch.id)}
            disabled={!isMember || busy}
          >
            <View style={[styles.checkbox, progress.has(ch.id) && styles.checkboxChecked]}>
              {progress.has(ch.id) && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={[styles.chapterLabel, !isMember && styles.disabledText]}>{idx + 1}. {ch.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!isMember ? (
        <TouchableOpacity style={styles.joinButton} onPress={joinSession} disabled={busy}>
          <Text style={styles.joinButtonText}>{busy ? 'Joining...' : 'Join Session to Track Progress'}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Your Progress ({Math.round(progressPct * 100)}%)</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
          </View>
        </View>
      )}

      <TouchableOpacity 
        style={styles.discussionButton}
        onPress={() => navigation.navigate('Discussion', { sessionId })}
      >
        <Text style={styles.discussionButtonText}>Go to Discussion Thread</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f1ea' },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fffdf8', padding: 20, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: '#d7cbb9' },
  title: { fontSize: 24, fontWeight: '700', color: '#1f1b16', marginBottom: 4 },
  author: { fontSize: 18, color: '#5c5348', marginBottom: 8 },
  muted: { fontSize: 14, color: '#5c5348' },
  section: { backgroundColor: '#fffdf8', padding: 16, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: '#d7cbb9' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1f1b16', marginBottom: 12 },
  chapterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#ebe2d6' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#2f6f5e', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#2f6f5e' },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  chapterLabel: { fontSize: 16, color: '#1f1b16', flex: 1 },
  disabledText: { color: '#5c5348', opacity: 0.6 },
  joinButton: { backgroundColor: '#2f6f5e', padding: 16, borderRadius: 999, alignItems: 'center', marginBottom: 16 },
  joinButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  progressSection: { marginBottom: 16 },
  progressBar: { height: 12, backgroundColor: '#ebe2d6', borderRadius: 6, overflow: 'hidden', marginVertical: 8 },
  progressFill: { height: '100%', backgroundColor: '#2f6f5e' },
  discussionButton: { backgroundColor: '#fffdf8', padding: 16, borderRadius: 999, alignItems: 'center', borderWidth: 1, borderColor: '#2f6f5e' },
  discussionButtonText: { color: '#2f6f5e', fontWeight: '700', fontSize: 16 },
})
