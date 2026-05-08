import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigation } from '@react-navigation/native'

type SessionRow = {
  id: string
  title: string
  author: string
  created_at: string
  chapter_count: number
}

type ListMode = 'all' | 'mine'
const PAGE_SIZE = 20

export function SessionsListPage() {
  const { user } = useAuth()
  const navigation = useNavigation<any>()

  const [mode, setMode] = useState<ListMode>('all')
  const [rows, setRows] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const fetchChapterCounts = async (sessionIds: string[]) => {
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

  const loadSessions = useCallback(async (isInitial = true) => {
    if (!user) return

    if (isInitial) {
      setLoading(true)
      setOffset(0)
    } else {
      setLoadingMore(true)
    }

    try {
      const from = isInitial ? 0 : offset
      const to = from + PAGE_SIZE - 1

      let query = supabase
        .from('reading_sessions')
        .select('id, title, author, created_at')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (mode === 'mine') {
        const { data: memberRows } = await supabase
          .from('session_members')
          .select('session_id')
          .eq('user_id', user.id)
        
        const ids = (memberRows ?? []).map(r => r.session_id)
        if (ids.length === 0) {
          setRows([])
          setHasMore(false)
          return
        }
        query = query.in('id', ids)
      }

      const { data: sessions, error } = await query
      if (error) throw error

      const sessionIds = (sessions ?? []).map(s => s.id)
      const chapterMap = await fetchChapterCounts(sessionIds)

      const batch: SessionRow[] = (sessions ?? []).map(s => ({
        ...s,
        chapter_count: chapterMap[s.id] ?? 0,
      }))

      if (isInitial) {
        setRows(batch)
      } else {
        setRows(prev => [...prev, ...batch])
      }

      setOffset(from + batch.length)
      setHasMore(batch.length === PAGE_SIZE)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }, [user, mode, offset])

  useEffect(() => {
    loadSessions(true)
  }, [mode])

  const onRefresh = () => {
    setRefreshing(true)
    loadSessions(true)
  }

  const renderItem = ({ item }: { item: SessionRow }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('SessionDetail', { id: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.sessionTitle}>{item.title}</Text>
        <View style={styles.pill}><Text style={styles.pillText}>Public</Text></View>
      </View>
      <Text style={styles.author}>{item.author}</Text>
      <Text style={styles.muted}>{item.chapter_count} chapters</Text>
      <Text style={styles.muted}>
        Started {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, mode === 'all' && styles.tabActive]}
          onPress={() => setMode('all')}
        >
          <Text style={[styles.tabText, mode === 'all' && styles.tabTextActive]}>All Sessions</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, mode === 'mine' && styles.tabActive]}
          onPress={() => setMode('mine')}
        >
          <Text style={[styles.tabText, mode === 'mine' && styles.tabTextActive]}>My Sessions</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rows}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2f6f5e" />
        }
        onEndReached={() => hasMore && !loadingMore && loadSessions(false)}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No sessions found</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={{ margin: 20 }} color="#2f6f5e" /> : null
        }
      />
      
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('CreateSession')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f1ea' },
  tabs: { flexDirection: 'row', padding: 16, gap: 12 },
  tab: { flex: 1, padding: 10, borderRadius: 999, alignItems: 'center', backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#d7cbb9' },
  tabActive: { backgroundColor: '#e3f1ec', borderColor: '#2f6f5e' },
  tabText: { fontWeight: '600', color: '#5c5348' },
  tabTextActive: { color: '#0f3d32' },
  listContent: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#fffdf8', padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#d7cbb9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sessionTitle: { fontSize: 18, fontWeight: '600', color: '#1f1b16', flex: 1 },
  pill: { backgroundColor: '#e3f1ec', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '700', color: '#0f3d32' },
  author: { fontSize: 14, color: '#5c5348', marginVertical: 4 },
  muted: { fontSize: 12, color: '#5c5348' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#5c5348', fontSize: 16 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2f6f5e', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  fabText: { fontSize: 30, color: '#fff', lineHeight: 30 },
})
