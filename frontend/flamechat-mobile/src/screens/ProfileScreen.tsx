import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native'
import { updateProfile } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useAuthContext } from '../context/AuthContext'
import { useImagePicker } from '../hooks/useImagePicker'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001/api'

type IdentityState = {
  isProfileComplete: boolean
  requiresHandleUpdate: boolean
  reason?: 'invalid_handle' | 'handle_conflict'
  suggestedHandles: string[]
}

export function ProfileScreen() {
  const { user, logout } = useAuthContext()
  const { pickImage, loading: imagePicking } = useImagePicker()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [handle, setHandle] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [identity, setIdentity] = useState<IdentityState | null>(null)

  const canSave = useMemo(() => displayName.trim().length >= 2 && handle.trim().length >= 3 && !saving, [displayName, handle, saving])

  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error('Not authenticated')
    }

    const token = await currentUser.getIdToken()
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const error = new Error(payload.error || `Request failed (${response.status})`) as Error & { status?: number; payload?: any }
      error.status = response.status
      error.payload = payload
      throw error
    }

    return payload
  }

  const loadProfile = async () => {
    try {
      setLoading(true)
      const profile = await apiFetch('/users/me')
      setDisplayName(profile.displayName || user?.displayName || '')
      setHandle(profile.handle || '')
      setIdentity(profile.identity || null)
    } catch (error) {
      console.error('Failed to load identity profile:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile().catch((error) => {
      console.error('Profile bootstrap failed:', error)
    })
  }, [user?.uid])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign out failed.'
      Alert.alert('Sign out error', message)
    }
  }

  const handleSaveIdentity = async () => {
    if (!canSave) {
      return
    }

    try {
      setSaving(true)
      await apiFetch('/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          displayName: displayName.trim(),
          handle: handle.trim().toLowerCase(),
        }),
      })

      Alert.alert('Saved', 'Identity profile updated.')
      await loadProfile()
    } catch (error: any) {
      const suggestions = Array.isArray(error?.payload?.suggestedHandles)
        ? error.payload.suggestedHandles.join(', ')
        : ''

      if (error?.status === 409 && suggestions) {
        Alert.alert('Handle taken', `Try one of these: ${suggestions}`)
      } else if (error?.status === 409) {
        Alert.alert('Handle taken', 'Please choose another handle.')
      } else {
        Alert.alert('Save error', error instanceof Error ? error.message : 'Could not save profile.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleUploadPhoto = async () => {
    const image = await pickImage()
    if (!image) {
      return
    }

    try {
      setUploadingPhoto(true)
      const formData = new FormData()
      formData.append('file', {
        uri: image.uri,
        name: image.name,
        type: image.type,
      } as any)

      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('Not authenticated')
      }

      const token = await currentUser.getIdToken()
      const response = await fetch(`${API_BASE}/users/me/photo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(payload.error || 'Upload failed')
      }

      const data = await response.json()
      
      // Update Firebase profile
      if (currentUser && data.photoURL) {
        await updateProfile(currentUser, {
          photoURL: data.photoURL,
        })
      }

      Alert.alert('Success', 'Profile photo updated!')
      await loadProfile()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload photo'
      Alert.alert('Upload error', message)
    } finally {
      setUploadingPhoto(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {loading ? <Text style={styles.note}>Loading profile...</Text> : null}

      {identity && !identity.isProfileComplete ? (
        <Text style={styles.warning}>
          Identity needs updates ({identity.reason || 'incomplete_profile'}).
        </Text>
      ) : (
        <Text style={styles.ok}>Identity profile is complete.</Text>
      )}

      <View style={styles.photoSection}>
        <View style={styles.photoContainer}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Text style={styles.photoPlaceholderText}>📷</Text>
            </View>
          )}
        </View>
        <Pressable
          style={[styles.uploadButton, (uploadingPhoto || imagePicking) && styles.disabled]}
          onPress={handleUploadPhoto}
          disabled={uploadingPhoto || imagePicking}
        >
          {uploadingPhoto ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.uploadButtonText}>{imagePicking ? 'Picking...' : 'Change Photo'}</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Handle</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          value={handle}
          onChangeText={(value) => setHandle(value.toLowerCase())}
          placeholder="your_handle"
        />

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display name"
        />

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email || 'Unknown'}</Text>

        <Pressable style={[styles.saveButton, !canSave && styles.disabled]} onPress={handleSaveIdentity} disabled={!canSave}>
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save identity'}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </View>
  )
}
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save identity'}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoContainer: {
    marginBottom: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e2e8f0',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 48,
  },
  uploadButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 140,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 12,
  },
  note: {
    color: '#64748b',
    marginBottom: 8,
  },
  warning: {
    color: '#b45309',
    marginBottom: 8,
    fontWeight: '600',
  },
  ok: {
    color: '#15803d',
    marginBottom: 8,
    fontWeight: '600',
  },
  label: {
    color: '#64748b',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  value: {
    color: '#0f172a',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  saveButton: {
    marginTop: 6,
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
  logoutButton: {
    marginTop: 16,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ffffff',
    fontWeight: '700',
  },
})