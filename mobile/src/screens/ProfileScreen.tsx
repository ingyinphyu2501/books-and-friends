import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function ProfileScreen() {
  const { user, signOut } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadProfile = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase.from('profiles').select('display_name, bio').eq('id', user.id).single()
      if (error) throw error
      setDisplayName(data.display_name ?? '')
      setBio(data.bio ?? '')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [user])

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({ display_name: displayName, bio }).eq('id', user.id)
      if (error) throw error
      Alert.alert('Success', 'Profile updated!')
    } catch (err) {
      Alert.alert('Error', 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#2f6f5e" /></View>

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Your Profile</Text>
        <Text style={styles.subtitle}>Manage your profile details and settings</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email (Read Only)</Text>
            <TextInput style={[styles.input, styles.inputDisabled]} value={user?.email} editable={false} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput 
              style={styles.input} 
              value={displayName} 
              onChangeText={setDisplayName} 
              placeholder="Your name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Bio</Text>
            <TextInput 
              style={[styles.input, styles.textarea]} 
              value={bio} 
              onChangeText={setBio} 
              placeholder="Tell others about what you like to read..."
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.buttonDisabled]} 
            onPress={saveProfile} 
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f1ea' },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fffdf8', padding: 24, borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: '#d7cbb9' },
  title: { fontSize: 24, fontWeight: '700', color: '#1f1b16', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#5c5348', marginBottom: 24 },
  form: { gap: 16 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#3a342c' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d7cbb9', borderRadius: 10, padding: 12, fontSize: 16, color: '#1f1b16' },
  inputDisabled: { backgroundColor: '#ebe2d6', color: '#5c5348' },
  textarea: { height: 100, textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#2f6f5e', padding: 16, borderRadius: 999, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  buttonDisabled: { opacity: 0.5 },
  signOutButton: { padding: 16, alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: '#a42033' },
  signOutText: { color: '#a42033', fontWeight: '700', fontSize: 16 },
})
