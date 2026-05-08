import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, FlatList } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigation } from '@react-navigation/native'

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

export function CreateSessionScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<any>()
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [externalId, setExternalId] = useState<string | null>(null)
  const [chapterLines, setChapterLines] = useState<string[]>(['', ''])
  const [busy, setBusy] = useState(false)

  // Book Search State
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GoogleBookItem[]>([])
  const [searching, setSearching] = useState(false)

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
      // Note: In a real mobile app, you might want to use a proxy or secure your API keys differently
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5`
      const res = await fetch(url)
      const data = await res.json()
      setResults(data.items || [])
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
    setResults([])
    setQuery('')
  }

  const addChapterRow = () => setChapterLines(prev => [...prev, ''])
  const updateChapter = (i: number, val: string) => setChapterLines(prev => prev.map((c, idx) => idx === i ? val : c))
  const removeChapter = (i: number) => setChapterLines(prev => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i))

  const onSubmit = async () => {
    if (!user) return
    const chapters = chapterLines.map(c => c.trim()).filter(c => c.length > 0)
    
    if (!title.trim() || !author.trim()) {
      Alert.alert('Error', 'Title and author are required.')
      return
    }
    if (chapters.length === 0) {
      Alert.alert('Error', 'Add at least one chapter name.')
      return
    }

    setBusy(true)
    try {
      const { data: session, error: sErr } = await supabase
        .from('reading_sessions')
        .insert({ 
          creator_id: user.id, 
          title: title.trim(), 
          author: author.trim(),
          cover_url: coverUrl,
          external_id: externalId
        } as any)
        .select('id')
        .single()
      
      if (sErr) throw sErr

      const chapterRows = chapters.map((label, sort_order) => ({
        session_id: session.id,
        sort_order,
        label,
      }))

      const { error: cErr } = await supabase.from('session_chapters').insert(chapterRows)
      if (cErr) throw cErr

      navigation.replace('SessionDetail', { id: session.id })
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create session')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.label}>Search for a book</Text>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Enter title or author..."
        />
        {searching && <ActivityIndicator size="small" color="#2f6f5e" style={{ marginBottom: 10 }} />}
        
        {results.length > 0 && (
          <View style={styles.resultsContainer}>
            {results.map(book => (
              <TouchableOpacity key={book.id} style={styles.resultItem} onPress={() => selectBook(book)}>
                {book.volumeInfo.imageLinks?.thumbnail && (
                  <Image source={{ uri: book.volumeInfo.imageLinks.thumbnail }} style={styles.resultCover} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTitle} numberOfLines={1}>{book.volumeInfo.title}</Text>
                  <Text style={styles.resultAuthor} numberOfLines={1}>{book.volumeInfo.authors?.join(', ')}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {coverUrl && (
          <View style={styles.coverPreviewContainer}>
            <Image source={{ uri: coverUrl }} style={styles.coverPreview} />
            <TouchableOpacity onPress={() => setCoverUrl(null)}>
              <Text style={{ color: '#a42033', marginLeft: 10 }}>Remove Cover</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Book Title</Text>
        <TextInput 
          style={styles.input} 
          value={title} 
          onChangeText={setTitle} 
          placeholder="e.g. The Left Hand of Darkness"
        />

        <Text style={styles.label}>Author</Text>
        <TextInput 
          style={styles.input} 
          value={author} 
          onChangeText={setAuthor} 
          placeholder="e.g. Ursula K. Le Guin"
        />

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Chapters</Text>
        <Text style={styles.subtitle}>Enter chapter names in order.</Text>

        {chapterLines.map((line, i) => (
          <View key={i} style={styles.chapterRow}>
            <Text style={styles.chapterIndex}>{i + 1}.</Text>
            <TextInput 
              style={[styles.input, { flex: 1 }]} 
              value={line} 
              onChangeText={(val) => updateChapter(i, val)} 
              placeholder="Chapter title"
            />
            <TouchableOpacity 
              style={styles.removeBtn} 
              onPress={() => removeChapter(i)}
              disabled={chapterLines.length <= 1}
            >
              <Text style={styles.removeBtnText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={addChapterRow}>
          <Text style={styles.addBtnText}>+ Add Chapter Row</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.submitBtn, busy && styles.btnDisabled]} 
          onPress={onSubmit}
          disabled={busy}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Session</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f1ea' },
  content: { padding: 16 },
  card: { backgroundColor: '#fffdf8', padding: 20, borderRadius: 14, borderWidth: 1, borderColor: '#d7cbb9' },
  label: { fontSize: 14, fontWeight: '600', color: '#3a342c', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d7cbb9', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#ebe2d6', marginVertical: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1f1b16', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#5c5348', marginBottom: 16 },
  chapterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  chapterIndex: { fontSize: 14, color: '#5c5348', width: 20 },
  removeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ebe2d6', justifyContent: 'center', alignItems: 'center' },
  removeBtnText: { fontSize: 20, color: '#a42033', lineHeight: 20 },
  addBtn: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2f6f5e', alignItems: 'center', marginBottom: 24 },
  addBtnText: { color: '#2f6f5e', fontWeight: '600' },
  submitBtn: { backgroundColor: '#2f6f5e', padding: 16, borderRadius: 999, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnDisabled: { opacity: 0.5 },
  resultsContainer: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#ebe2d6' },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  resultCover: { width: 40, height: 60, borderRadius: 4 },
  resultTitle: { fontWeight: '600', color: '#1f1b16' },
  resultAuthor: { fontSize: 12, color: '#5c5348' },
  coverPreviewContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  coverPreview: { width: 60, height: 90, borderRadius: 4 },
})
