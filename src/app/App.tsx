import { useState, useCallback } from 'react'
import { AuthScreen, logoutUser } from '../features/auth'
import { ChatRoom } from '../features/chat'
import { RoomSidebar } from '../features/rooms'
import { User } from '../shared/types'
import './App.css'
import { SideNav } from '../features/navigation'

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
          <SideNav onLogout={handleLogout} />

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
