import { useEffect, useMemo, useRef, useState } from 'react'
import { deleteUser, updateProfile } from 'firebase/auth'
import { deleteDoc, doc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { auth, db, storage } from '../config'
import { ApiError, checkHandleAvailability, updateCurrentUserProfile } from '../api'
import { User, UserProfile } from '../types'
import './ProfileModal.css'

interface ProfileModalProps {
  isOpen: boolean
  user: User
  profile: UserProfile | null
  identityNotice?: string
  onClose: () => void
  onProfileSaved: (next: Partial<User> & Partial<UserProfile>) => void
  onLogout: () => Promise<void>
}

const STATUS_OPTIONS: Array<{ value: 'online' | 'away' | 'offline'; label: string }> = [
  { value: 'online', label: 'Online' },
  { value: 'away', label: 'Away' },
  { value: 'offline', label: 'Offline' },
]
const HANDLE_REGEX = /^[a-z0-9_]{3,24}$/

type HandleValidationState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export const ProfileModal = ({
  isOpen,
  user,
  profile,
  identityNotice,
  onClose,
  onProfileSaved,
  onLogout,
}: ProfileModalProps) => {
  const [displayName, setDisplayName] = useState(user.displayName || '')
  const [handle, setHandle] = useState(profile?.handle || '')
  const [status, setStatus] = useState<'online' | 'away' | 'offline'>(profile?.status || 'online')
  const [bio, setBio] = useState(profile?.bio || '')
  const [photoURL, setPhotoURL] = useState(user.photoURL || profile?.photoURL || null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const [handleValidation, setHandleValidation] = useState<HandleValidationState>('idle')
  const [handleHelperText, setHandleHelperText] = useState('Choose a unique handle for mentions and identity.')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setDisplayName(user.displayName || '')
    setHandle(profile?.handle || '')
    setStatus(profile?.status || 'online')
    setBio(profile?.bio || '')
    setPhotoURL(user.photoURL || profile?.photoURL || null)
    setAvatarFile(null)
    setError('')
    setHandleValidation('idle')
    setHandleHelperText('Choose a unique handle for mentions and identity.')
    setShowDeleteConfirm(false)
  }, [isOpen, profile?.bio, profile?.handle, profile?.photoURL, profile?.status, user.displayName, user.photoURL])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const normalizedHandle = handle.trim().toLowerCase()
    if (!normalizedHandle) {
      setHandleValidation('invalid')
      setHandleHelperText('Handle is required.')
      return
    }

    if (!HANDLE_REGEX.test(normalizedHandle)) {
      setHandleValidation('invalid')
      setHandleHelperText('Use 3-24 lowercase letters, numbers, or underscore.')
      return
    }

    if ((profile?.handle || '').toLowerCase() === normalizedHandle) {
      setHandleValidation('available')
      setHandleHelperText('This is your current handle.')
      return
    }

    setHandleValidation('checking')
    setHandleHelperText('Checking availability...')

    let cancelled = false
    const debounceTimer = window.setTimeout(async () => {
      try {
        const result = await checkHandleAvailability(normalizedHandle)
        if (cancelled) {
          return
        }

        if (result.available) {
          setHandleValidation('available')
          setHandleHelperText('Handle is available.')
        } else {
          setHandleValidation('taken')
          setHandleHelperText(result.reason || 'Handle is already taken.')
        }
      } catch {
        if (cancelled) {
          return
        }
        setHandleValidation('idle')
        setHandleHelperText('Could not validate handle right now. You can still try to save.')
      }
    }, 360)

    return () => {
      cancelled = true
      window.clearTimeout(debounceTimer)
    }
  }, [handle, isOpen, profile?.handle])

  const avatarPreview = useMemo(() => {
    if (!avatarFile) {
      return photoURL
    }
    return URL.createObjectURL(avatarFile)
  }, [avatarFile, photoURL])

  useEffect(() => {
    return () => {
      if (avatarFile && avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarFile, avatarPreview])

  const handleSave = async () => {
    const nextDisplayName = displayName.trim()
    if (nextDisplayName.length < 2) {
      setError('Display name must be at least 2 characters.')
      return
    }

    if (bio.length > 160) {
      setError('Bio cannot exceed 160 characters.')
      return
    }

    const normalizedHandle = handle.trim().toLowerCase()
    if (!normalizedHandle) {
      setError('Handle is required.')
      return
    }

    if (!HANDLE_REGEX.test(normalizedHandle)) {
      setError('Handle format is invalid. Use 3-24 lowercase letters, numbers, or underscore.')
      return
    }

    if (handleValidation === 'taken' || handleValidation === 'checking') {
      setError('Please choose an available handle before saving.')
      return
    }

    const currentUser = auth.currentUser
    if (!currentUser) {
      setError('Session expired. Please sign in again.')
      return
    }

    setError('')
    setIsSaving(true)

    try {
      let nextPhotoURL = photoURL
      if (avatarFile) {
        const avatarPath = `avatars/${currentUser.uid}/${Date.now()}_${avatarFile.name}`
        const avatarRef = ref(storage, avatarPath)
        const snapshot = await uploadBytes(avatarRef, avatarFile)
        nextPhotoURL = await getDownloadURL(snapshot.ref)
      }

      await updateProfile(currentUser, {
        displayName: nextDisplayName,
        photoURL: nextPhotoURL,
      })

      await updateCurrentUserProfile({
        displayName: nextDisplayName,
        bio: bio.trim(),
        photoURL: nextPhotoURL,
        handle: normalizedHandle,
      })

      onProfileSaved({
        displayName: nextDisplayName,
        handle: normalizedHandle,
        photoURL: nextPhotoURL,
        status,
        bio: bio.trim(),
      })
      onClose()
    } catch (saveError: unknown) {
      console.error('Failed to save profile:', saveError)
      if (saveError instanceof ApiError && saveError.status === 409) {
        const suggested = Array.isArray(saveError.payload?.suggestedHandles)
          ? saveError.payload.suggestedHandles
          : []
        setError(
          suggested.length > 0
            ? `Handle already taken. Try: ${suggested.join(', ')}`
            : 'Handle already taken. Please choose another one.'
        )
      } else {
        setError('Could not save profile. Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      setError('Session expired. Please sign in again.')
      return
    }

    setIsDeleting(true)
    setError('')
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid))
      await deleteUser(currentUser)
      await onLogout()
      onClose()
    } catch (deleteError: unknown) {
      console.error('Account deletion failed:', deleteError)
      const code = (deleteError as { code?: string })?.code
      if (code === 'auth/requires-recent-login') {
        setError('For security, sign in again before deleting your account.')
      } else {
        setError('Account deletion failed. Please try again.')
      }
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="profile-overlay" role="presentation" onClick={onClose}>
      <div
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        aria-label="User profile"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="profile-header">
          <h2>User Profile</h2>
          <button type="button" className="profile-close" onClick={onClose} aria-label="Close profile modal">
            ×
          </button>
        </header>

        <div className="profile-avatar-section">
          <button
            type="button"
            className="profile-avatar-button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change avatar"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Profile avatar" className="profile-avatar-image" />
            ) : (
              <span className="profile-avatar-fallback">{(displayName || user.email || 'U')[0]?.toUpperCase()}</span>
            )}
            <span className="profile-avatar-edit">Change</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
            className="profile-file-input"
          />
        </div>

        <div className="profile-fields">
          {identityNotice && <p className="profile-error">{identityNotice}</p>}

          <label htmlFor="profileHandle">Handle</label>
          <input
            id="profileHandle"
            value={handle}
            onChange={(event) => setHandle(event.target.value.toLowerCase())}
            placeholder="your_handle"
            autoComplete="off"
            spellCheck={false}
          />
          <p className={`profile-handle-helper ${handleValidation}`}>{handleHelperText}</p>

          <label htmlFor="profileDisplayName">Display Name</label>
          <input
            id="profileDisplayName"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Your display name"
          />

          <label htmlFor="profileStatus">Status</label>
          <select
            id="profileStatus"
            value={status}
            onChange={(event) => setStatus(event.target.value as 'online' | 'away' | 'offline')}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label htmlFor="profileBio">Bio</label>
          <textarea
            id="profileBio"
            value={bio}
            onChange={(event) => setBio(event.target.value.slice(0, 160))}
            placeholder="Tell your team a bit about yourself"
            rows={3}
            maxLength={160}
          />
          <div className="profile-bio-counter">{bio.length}/160</div>
        </div>

        {error && <p className="profile-error">{error}</p>}

        <div className="profile-actions">
          <button type="button" className="profile-signout" onClick={onLogout}>
            Sign out
          </button>
          <button type="button" className="profile-save" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>

        <div className="profile-danger-zone">
          <button
            type="button"
            className="profile-delete-trigger"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
          >
            Delete account
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="profile-delete-confirm" role="alertdialog" aria-modal="true">
            <p>This action permanently removes your account. Continue?</p>
            <div>
              <button type="button" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="danger" onClick={handleDeleteAccount} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
