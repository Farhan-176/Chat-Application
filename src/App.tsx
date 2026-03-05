import { useState, useCallback } from 'react'
import { AuthScreen, logoutUser } from './components/AuthScreen'
import { ChatRoom } from './components/ChatRoom'
import { RoomSidebar } from './components/RoomSidebar'
import { User } from './types'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [activeRoomId, setActiveRoomId] = useState('general')

  const handleAuthSuccess = useCallback((authenticatedUser: User) => {
    setUser(authenticatedUser)
  }, [])

  const handleLogout = useCallback(async () => {
    await logoutUser()
    setUser(null)
    setActiveRoomId('general')
  }, [])

  const handleSelectRoom = useCallback((roomId: string) => {
    setActiveRoomId(roomId)
  }, [])

  return (
    <>
      {user ? (
        <div className="app-layout">
          <RoomSidebar
            activeRoomId={activeRoomId}
            onSelectRoom={handleSelectRoom}
            userPhotoURL={user.photoURL}
            userDisplayName={user.displayName}
            onLogout={handleLogout}
          />
          <ChatRoom
            key={activeRoomId}
            user={user}
            roomId={activeRoomId}
          />
        </div>
      ) : (
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      )}
    </>
  )
}

export default App
