import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthScreen, logoutUser } from '../../features/auth'
import { ChatRoom } from '../../features/chat'
import { RoomSidebar } from '../../features/rooms'
import { backfillRoomReadState } from '../shared/api'
import { fetchCurrentUserProfile } from '../shared/api'
import { User, UserProfile, VibeType } from '../shared/types'
import { ProfileModal } from '../shared/components/ProfileModal'
import { LandingPage } from '../../features/marketing/LandingPage'
import { ProtectedRoute } from './ProtectedRoute'
import { SideNav } from './SideNav'
import { CommandPalette } from '../../features/navigation/components/CommandPalette'
import { loadBaseVibeCss, initializeVibe } from '../../features/chat/utils/vibeUtils'
import './App.css'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [activeRoomId, setActiveRoomId] = useState('general')
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [identityNotice, setIdentityNotice] = useState('')
  const [activeRoomVibe, setActiveRoomVibe] = useState<VibeType>('default')
  const [activeRoomExpiresAt, setActiveRoomExpiresAt] = useState<Date | null>(null)
  const roomDirectory = useMemo(
    () => [
      { id: 'general', name: 'General' },
      { id: 'tech', name: 'Engineering' },
      { id: 'design', name: 'Design Lab' },
    ],
    []
  )
  const activeRoomLabel = roomDirectory.find((room) => room.id === activeRoomId)?.name ?? activeRoomId

  const handleAuthSuccess = useCallback((authenticatedUser: User) => {
    setUser(authenticatedUser)
    navigate('/chat', { replace: true })
    
    setProfile({
      uid: authenticatedUser.uid,
      displayName: authenticatedUser.displayName || 'User',
      email: authenticatedUser.email || '',
      photoURL: authenticatedUser.photoURL,
      status: 'online',
      workspaceIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    })

    fetchCurrentUserProfile()
      .then((serverProfile) => {
        setProfile((prev) => {
          const base = prev || {
            uid: authenticatedUser.uid,
            displayName: authenticatedUser.displayName || 'User',
            email: authenticatedUser.email || '',
            photoURL: authenticatedUser.photoURL,
            workspaceIds: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          return {
            ...base,
            displayName: serverProfile.displayName || base.displayName,
            email: serverProfile.email || base.email,
            handle: serverProfile.handle || base.handle,
            photoURL: serverProfile.photoURL ?? base.photoURL,
            bio: serverProfile.bio ?? base.bio,
            status: serverProfile.status ?? base.status,
            workspaceIds: Array.isArray(serverProfile.workspaceIds) ? serverProfile.workspaceIds : base.workspaceIds,
            updatedAt: new Date(),
          }
        })

        const identity = serverProfile.identity
        if (identity && !identity.isProfileComplete) {
          setIdentityNotice('Please complete your identity profile before continuing.')
          setIsProfileOpen(true)
        } else {
          setIdentityNotice('')
        }
      })
      .catch((error) => {
        console.warn('Profile hydration skipped:', error)
      })
  }, [navigate])

  const handleLogout = useCallback(async () => {
    await logoutUser()
    setUser(null)
    setProfile(null)
    setActiveRoomId('general')
    setIsProfileOpen(false)
    navigate('/login', { replace: true })
  }, [navigate])

  const handleProfileSaved = useCallback((updated: Partial<User> & Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) {
        return prev
      }

      return {
        ...prev,
        displayName: updated.displayName ?? prev.displayName,
        photoURL: updated.photoURL ?? prev.photoURL,
      }
    })

    setProfile((prev) => {
      if (!prev) {
        return prev
      }

      return {
        ...prev,
        displayName: updated.displayName ?? prev.displayName,
        handle: updated.handle ?? prev.handle,
        photoURL: updated.photoURL ?? prev.photoURL,
        status: updated.status ?? prev.status,
        bio: updated.bio ?? prev.bio,
        updatedAt: new Date(),
      }
    })

    setIdentityNotice('')
  }, [])

  useEffect(() => {
    // Initialize vibe system on app startup
    loadBaseVibeCss()
    initializeVibe()
  }, [])

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false)
      }
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [])

  useEffect(() => {
    if (!user?.uid) {
      return
    }

    backfillRoomReadState().catch((error) => {
      console.warn('Room read-state backfill skipped:', error)
    })
  }, [user?.uid])

  useEffect(() => {
    const root = document.getElementById('root')
    const isLandingRoute = location.pathname === '/'

    document.documentElement.style.overflow = isLandingRoute ? 'auto' : 'hidden'
    document.body.style.overflow = isLandingRoute ? 'auto' : 'hidden'

    if (root) {
      root.style.overflow = isLandingRoute ? 'auto' : 'hidden'
    }

    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      if (root) {
        root.style.overflow = ''
      }
    }
  }, [location.pathname])

  return (
    <Routes>
      <Route path="/" element={<LandingPage onGetStarted={() => navigate('/login')} />} />

      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/chat" replace />
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <AuthScreen onAuthSuccess={handleAuthSuccess} />
              </motion.div>
            </AnimatePresence>
          )
        }
      />

      <Route
        path="/chat"
        element={
          <ProtectedRoute user={user}>
            <div className="app-shell">
              <header className="app-topbar">
                <div className="app-brand">
                  <div className="app-brand-mark">FC</div>
                  <div className="app-brand-copy">
                    <span className="app-brand-kicker">FlameChat</span>
                    <strong>Workspace Command Center</strong>
                  </div>
                </div>

                <div className="app-topbar-meta">
                  <span className="app-topbar-pill">Room · {activeRoomLabel}</span>
                  <span className="app-topbar-pill app-topbar-pill--accent">Live</span>
                  <span className="app-topbar-pill">Signed in · {user?.displayName || 'User'}</span>
                </div>
              </header>

              <div className="app-layout">
                <SideNav onLogout={handleLogout} />

                <RoomSidebar
                  activeRoomId={activeRoomId}
                  onSelectRoom={setActiveRoomId}
                  userPhotoURL={user?.photoURL || null}
                  userDisplayName={user?.displayName || null}
                  onLogout={handleLogout}
                  onOpenProfile={() => setIsProfileOpen(true)}
                  onRoomVibeChange={(vibe, expiresAt) => {
                    setActiveRoomVibe(vibe)
                    setActiveRoomExpiresAt(expiresAt)
                  }}
                />

                <main className="chat-canvas">
                  {user && (
                    <ChatRoom
                      key={activeRoomId}
                      user={user}
                      roomId={activeRoomId}
                      vibe={activeRoomVibe}
                      expiresAt={activeRoomExpiresAt}
                    />
                  )}
                </main>
              </div>

              <CommandPalette
                rooms={roomDirectory}
                onSelectRoom={setActiveRoomId}
              />
            </div>

            {user && (
              <ProfileModal
                isOpen={isProfileOpen}
                user={user}
                profile={profile}
                identityNotice={identityNotice}
                onClose={() => setIsProfileOpen(false)}
                onProfileSaved={handleProfileSaved}
                onLogout={handleLogout}
              />
            )}
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={user ? '/chat' : '/login'} replace />} />
    </Routes>
  )
}

export default App
