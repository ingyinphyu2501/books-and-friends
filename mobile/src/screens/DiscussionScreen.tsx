import React, { useState, useEffect, useRef } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Switch, ScrollView } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRoute } from '@react-navigation/native'

type PostRow = { 
  id: string; 
  user_id: string; 
  body: string; 
  created_at: string; 
  edited_at: string | null;
  is_spoiler: boolean;
  spoiler_chapter_id: string | null;
}
type ReactionRow = { id: string; post_id: string; user_id: string; emoji: string }

const QUICK_EMOJIS = ['👍', '❤️', '😄', '🤔', '🎉', '📚', '🔥', '✨']

export function DiscussionScreen() {
  const route = useRoute<any>()
  const { user } = useAuth()
  const { sessionId } = route.params

  const [posts, setPosts] = useState<PostRow[]>([])
  const [profiles, setProfiles] = useState<Record<string, string>>({})
  const [reactions, setReactions] = useState<ReactionRow[]>([])
  const [newPostBody, setNewPostBody] = useState('')
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [spoilerChapterId, setSpoilerChapterId] = useState<string | null>(null)
  const [chapters, setChapters] = useState<{ id: string; label: string }[]>([])
  const [revealedPosts, setRevealedPosts] = useState<Set<string>>(new Set())
  const [myProgress, setMyProgress] = useState<Set<string>>(new Set())

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const loadDiscussion = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const { data: p } = await supabase.from('discussion_posts').select('*').eq('session_id', sessionId).order('created_at', { ascending: true })
      setPosts((p as any) ?? [])

      // Load my progress for spoiler logic
      if (user) {
        const { data: prog } = await supabase.from('member_chapter_progress').select('chapter_id').eq('session_id', sessionId).eq('user_id', user.id)
        setMyProgress(new Set(prog?.map(pg => pg.chapter_id)))

        // Fetch chapters for the dropdown
        const { data: chs } = await supabase.from('session_chapters').select('id, label').eq('session_id', sessionId).order('sort_order', { ascending: true })
        setChapters(chs ?? [])
      }

      if (p && p.length > 0) {
        const userIds = [...new Set(p.map(post => post.user_id))]
        const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', userIds)
        const profMap: Record<string, string> = {}
        profs?.forEach(prof => profMap[prof.id] = prof.display_name)
        setProfiles(profMap)

        const postIds = p.map(post => post.id)
        const { data: rx } = await supabase.from('post_reactions').select('*').in('post_id', postIds)
        setReactions(rx ?? [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDiscussion()
  }, [sessionId])

  const submitPost = async () => {
    const body = newPostBody.trim()
    if (!body || !user) return
    setBusy(true)
    try {
      const { data, error } = await supabase
        .from('discussion_posts')
        .insert({ 
          session_id: sessionId, 
          user_id: user.id, 
          body,
          is_spoiler: isSpoiler,
          spoiler_chapter_id: isSpoiler ? spoilerChapterId : null
        } as any)
        .select()
        .single()
      if (error) throw error
      setPosts(prev => [...prev, data as any])
      setNewPostBody('')
      setIsSpoiler(false)
      setSpoilerChapterId(null)
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100)
    } catch (err) {
      Alert.alert('Error', 'Could not post message')
    } finally {
      setBusy(false)
    }
  }

  const toggleReaction = async (postId: string, emoji: string) => {
    if (!user) return
    const mine = reactions.find(r => r.post_id === postId && r.user_id === user.id && r.emoji === emoji)
    try {
      if (mine) {
        await supabase.from('post_reactions').delete().eq('id', mine.id)
        setReactions(prev => prev.filter(r => r.id !== mine.id))
      } else {
        const { data, error } = await supabase.from('post_reactions').insert({ post_id: postId, user_id: user.id, emoji }).select().single()
        if (error) throw error
        setReactions(prev => [...prev, data])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const renderPost = ({ item }: { item: PostRow }) => {
    const postReactions = reactions.filter(r => r.post_id === item.id)
    const grouped = new Map<string, { count: number; me: boolean }>()
    postReactions.forEach(r => {
      const cur = grouped.get(r.emoji) ?? { count: 0, me: false }
      cur.count += 1
      if (r.user_id === user?.id) cur.me = true
      grouped.set(r.emoji, cur)
    })

    const isOwn = item.user_id === user?.id
    const isHiddenSpoiler = 
      item.is_spoiler && 
      !isOwn && 
      !revealedPosts.has(item.id) && 
      (!item.spoiler_chapter_id || !myProgress.has(item.spoiler_chapter_id))

    return (
      <View style={styles.post}>
        <View style={styles.postHeader}>
          <Text style={styles.postAuthor}>{profiles[item.user_id] ?? 'Reader'}</Text>
          <Text style={styles.postDate}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          {item.is_spoiler && <View style={styles.spoilerBadge}><Text style={styles.spoilerBadgeText}>SPOILER</Text></View>}
        </View>

        {isHiddenSpoiler ? (
          <View style={styles.spoilerOverlay}>
            <Text style={styles.spoilerWarning}>This post contains spoilers!</Text>
            <TouchableOpacity 
              style={styles.revealButton} 
              onPress={() => setRevealedPosts(prev => new Set(prev).add(item.id))}
            >
              <Text style={styles.revealButtonText}>Reveal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.postBody}>{item.body}</Text>
        )}

        <View style={styles.reactionContainer}>
          {[...grouped.entries()].map(([emoji, info]) => (
            <TouchableOpacity 
              key={emoji} 
              style={[styles.reactionPill, info.me && styles.reactionPillActive]}
              onPress={() => toggleReaction(item.id, emoji)}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              <Text style={styles.reactionCount}>{info.count}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.quickEmojiList}>
            {QUICK_EMOJIS.slice(0, 4).map(emoji => (
              <TouchableOpacity key={emoji} onPress={() => toggleReaction(item.id, emoji)}>
                <Text style={styles.quickEmojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    )
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#2f6f5e" /></View>

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No messages yet. Be the first to start the discussion!</Text>}
      />
      <View style={styles.composer}>
        <View style={{ flex: 1 }}>
          <TextInput
            style={styles.input}
            value={newPostBody}
            onChangeText={setNewPostBody}
            placeholder="Write a message..."
            multiline
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14, color: '#5c5348' }}>Mark as spoiler</Text>
              <Switch
                value={isSpoiler}
                onValueChange={setIsSpoiler}
                trackColor={{ false: '#d7cbb9', true: '#2f6f5e' }}
              />
            </View>

            {isSpoiler && chapters.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {chapters.map(ch => (
                    <TouchableOpacity
                      key={ch.id}
                      onPress={() => setSpoilerChapterId(spoilerChapterId === ch.id ? null : ch.id)}
                      style={[
                        styles.chapterChip,
                        spoilerChapterId === ch.id && styles.chapterChipActive
                      ]}
                    >
                      <Text style={[
                        styles.chapterChipText,
                        spoilerChapterId === ch.id && styles.chapterChipTextActive
                      ]}>{ch.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.sendButton, (!newPostBody.trim() || busy) && styles.sendButtonDisabled]} 
          onPress={submitPost}
          disabled={!newPostBody.trim() || busy}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f1ea' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  post: { backgroundColor: '#fffdf8', padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#d7cbb9' },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  postAuthor: { fontWeight: '700', color: '#1f1b16' },
  postDate: { fontSize: 12, color: '#5c5348' },
  postBody: { fontSize: 16, color: '#1f1b16', lineHeight: 22 },
  reactionContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, alignItems: 'center', gap: 6 },
  reactionPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ebe2d6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  reactionPillActive: { backgroundColor: '#e3f1ec', borderColor: '#2f6f5e' },
  reactionEmoji: { fontSize: 12 },
  reactionCount: { fontSize: 10, fontWeight: '700', color: '#5c5348', marginLeft: 2 },
  quickEmojiList: { flexDirection: 'row', gap: 10, marginLeft: 10, opacity: 0.6 },
  quickEmojiText: { fontSize: 16 },
  composer: { flexDirection: 'row', padding: 12, backgroundColor: '#fffdf8', borderTopWidth: 1, borderTopColor: '#d7cbb9', alignItems: 'flex-end', gap: 10 },
  input: { flex: 1, backgroundColor: '#f6f1ea', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100, fontSize: 16 },
  sendButton: { backgroundColor: '#2f6f5e', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: '#fff', fontWeight: '700' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#5c5348', fontSize: 16, paddingHorizontal: 40 },
  spoilerBadge: { backgroundColor: '#d7cbb9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  spoilerBadgeText: { fontSize: 10, fontWeight: '800', color: '#1f1b16' },
  spoilerOverlay: { padding: 12, backgroundColor: '#ebe2d6', borderRadius: 8, alignItems: 'center', gap: 8, marginVertical: 4 },
  spoilerWarning: { fontSize: 14, color: '#a42033', fontWeight: '600' },
  revealButton: { backgroundColor: '#2f6f5e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  revealButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  chapterChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#d7cbb9' },
  chapterChipActive: { backgroundColor: '#2f6f5e', borderColor: '#2f6f5e' },
  chapterChipText: { fontSize: 12, color: '#5c5348' },
  chapterChipTextActive: { color: '#fff', fontWeight: '600' },
})
