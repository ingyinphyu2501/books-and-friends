import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface AvatarProps {
  uid: string
  url: string | null
  onUpload: (url: string | null) => void
  size?: number
}

export function Avatar({ uid, url, onUpload, size = 150 }: AvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (url) {
      downloadImage(url)
    } else {
      setAvatarUrl(null)
    }
  }, [url])

  async function downloadImage(path: string) {
    try {
      const { data, error } = await supabase.storage.from('avatars').download(path)
      if (error) {
        throw error
      }
      const url = URL.createObjectURL(data)
      setAvatarUrl(url)
    } catch (error) {
      console.log('Error downloading image: ', error)
    }
  }

  async function uploadAvatar(event: any) {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${uid}/${fileName}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
        upsert: true
      })

      if (uploadError) {
        throw uploadError
      }

      onUpload(filePath)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error uploading avatar!')
    } finally {
      setUploading(false)
    }
  }

  async function removeAvatar() {
        try {
            setUploading(true)

            // 1. Remove from storage
            if (url) {
            const { error: storageError } = await supabase.storage
                .from('avatars')
                .remove([url])

            if (storageError) throw storageError
            }

            // 2. Clear DB reference (IMPORTANT FIX)
            const { error: dbError } = await supabase
            .from('profiles')
            .update({ avatar_url: null })
            .eq('id', uid)

            if (dbError) throw dbError

            // 3. Update UI immediately
            onUpload(null)
            setAvatarUrl(null)

        } catch (error) {
            alert(error instanceof Error ? error.message : 'Error removing avatar!')
        } finally {
            setUploading(false)
        }
    }

  return (
    <div className="avatar-upload-container">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Avatar"
          className="avatar"
          style={{ height: size, width: size }}
        />
      ) : (
        <div
          className="avatar no-image"
          style={{ height: size, width: size }}
        >
          ?
        </div>
      )}
      <div className="stack" style={{ width: size, gap: '0.5rem' }}>
        <label className="btn btn-secondary" style={{ display: 'block', textAlign: 'center', cursor: 'pointer', margin: 0 }}>
          {uploading ? 'Uploading ...' : 'Upload Avatar'}
          <input
            style={{
              visibility: 'hidden',
              position: 'absolute',
            }}
            type="file"
            id="single"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading}
          />
        </label>

        {url && (
          <button
            type="button"
            className="btn btn-danger-ghost btn-small"
            onClick={removeAvatar}
            disabled={uploading}
            style={{ width: '100%' }}
          >
            Remove Avatar
          </button>
        )}
      </div>
    </div>
  )
}
