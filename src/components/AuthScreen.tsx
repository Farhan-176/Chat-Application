import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { User } from '../types'
import './AuthScreen.css'
import { useEffect, useState } from 'react'

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void
}

export const AuthScreen = ({ onAuthSuccess }: AuthScreenProps) => {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        onAuthSuccess({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          email: firebaseUser.email,
        })
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [onAuthSuccess])

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      const result = await signInWithPopup(auth, googleProvider)
      onAuthSuccess({
        uid: result.user.uid,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        email: result.user.email,
      })
    } catch (error) {
      console.error('Authentication error:', error)
      alert('Failed to sign in. Please try again.')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="auth-container loading-state">
        <div className="auth-prism">
          <div className="prism-loader"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container fade-in">
      <div className="auth-prism">
        <div className="prism-content">
          <h1 className="prism-title">
            Real-Time <span className="text-gradient">Chat</span>
          </h1>
          <p className="prism-subtitle">
            Experience absolute clarity in communication. Powered by high-fidelity architecture.
          </p>

          <button className="google-btn" onClick={handleGoogleSignIn}>
            <div className="btn-shine"></div>
            <svg className="google-icon" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12 11.5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm0-1c1.4 0 2.5 1.1 2.5 2.5s-1.1 2.5-2.5 2.5-2.5-1.1-2.5-2.5 1.1-2.5 2.5-2.5m0-8C6.5 2.5 2.5 6.5 2.5 11.5 2.5 16.5 6.5 20.5 11.5 20.5s9-4 9-9-4-9-9-9m0 16c-3.9 0-7-3.1-7-7s3.1-7 7-7 7 3.1 7 7-3.1 7-7 7z"
              />
            </svg>
            <span className="btn-text">Authenticate via Google</span>
          </button>

          <div className="prism-footer">
            <span>Precision Core</span>
            <div className="footer-dot"></div>
            <span>End-to-End Fluidity</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export const logoutUser = async () => {
  try {
    await signOut(auth)
  } catch (error) {
    console.error('Logout error:', error)
  }
}
