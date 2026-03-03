import { useState, useCallback } from 'react'
import { AuthScreen, logoutUser } from './components/AuthScreen'
import { ChatRoom } from './components/ChatRoom'
import { User } from './types'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)

  const handleAuthSuccess = useCallback((authenticatedUser: User) => {
    setUser(authenticatedUser)
  }, [])

  const handleLogout = useCallback(async () => {
    await logoutUser()
    setUser(null)
  }, [])

  return (
    <>
      {user ? (
        <ChatRoom user={user} onLogout={handleLogout} />
      ) : (
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      )}
    </>
  )
}

export default App
