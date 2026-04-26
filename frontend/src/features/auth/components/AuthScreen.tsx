import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../../../core/shared/config'
import { trackAnalyticsEvent } from '../../../core/shared/api'
import { User } from '../../../core/shared/types'
import { motion } from 'framer-motion'
import { MessageSquare, Shield, Zap } from 'lucide-react'
import './AuthScreen.css'
import { FormEvent, useEffect, useState } from 'react'

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void
}

export const AuthScreen = ({ onAuthSuccess }: AuthScreenProps) => {
  const [initializing, setInitializing] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [resetMessage, setResetMessage] = useState('')

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
      setInitializing(false)
    })

    return () => unsubscribe()
  }, [onAuthSuccess])

  const parseFirebaseError = (errorCode?: string): string => {
    switch (errorCode) {
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Email or password is incorrect.'
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.'
      case 'auth/invalid-email':
        return 'Please enter a valid email address.'
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.'
      case 'auth/operation-not-allowed':
        return 'Email/password sign-up is not enabled. In Firebase Console, go to Authentication > Sign-in method and enable Email/Password.'
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.'
      case 'auth/popup-closed-by-user':
        return 'Google sign-in was canceled.'
      default:
        return 'Something went wrong. Please try again.'
    }
  }

  const validateEmail = (value: string): string => {
    if (!value.trim()) {
      return 'Email is required.'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) {
      return 'Enter a valid email address.'
    }

    return ''
  }

  const validatePassword = (value: string): string => {
    if (!value) {
      return 'Password is required.'
    }
    if (value.length < 6) {
      return 'Password must be at least 6 characters.'
    }
    return ''
  }

  const validateDisplayName = (value: string): string => {
    if (mode !== 'register') {
      return ''
    }
    if (!value.trim()) {
      return 'Display name is required.'
    }
    if (value.trim().length < 2) {
      return 'Display name must be at least 2 characters.'
    }
    return ''
  }

  const setFieldError = (field: string, message: string) => {
    setErrors((prev) => {
      const next = { ...prev }
      if (message) {
        next[field] = message
      } else {
        delete next[field]
      }
      return next
    })
  }

  const handleBlur = (field: 'email' | 'password' | 'displayName') => {
    setTouched((prev) => ({ ...prev, [field]: true }))

    if (field === 'email') {
      setFieldError('email', validateEmail(email))
    }
    if (field === 'password') {
      setFieldError('password', validatePassword(password))
    }
    if (field === 'displayName') {
      setFieldError('displayName', validateDisplayName(displayName))
    }
  }

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {}

    const emailError = validateEmail(email)
    if (emailError) {
      nextErrors.email = emailError
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      nextErrors.password = passwordError
    }

    if (mode === 'register') {
      const displayNameError = validateDisplayName(displayName)
      if (displayNameError) {
        nextErrors.displayName = displayNameError
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleGoogleSignIn = async () => {
    try {
      setErrors({})
      setResetMessage('')
      setIsSubmitting(true)
      const result = await signInWithPopup(auth, googleProvider)

      const userRef = doc(db, 'users', result.user.uid)
      const userSnapshot = await getDoc(userRef)
      const isFirstLogin = !userSnapshot.exists()

      await setDoc(userRef, {
        uid: result.user.uid,
        email: result.user.email || '',
        displayName: result.user.displayName || (result.user.email?.split('@')[0] ?? 'User'),
        photoURL: result.user.photoURL,
        workspaceIds: [],
        role: 'user',
        ...(isFirstLogin ? { createdAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      }, { merge: true })

      onAuthSuccess({
        uid: result.user.uid,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        email: result.user.email,
      })

      await trackAnalyticsEvent('user_signed_in', {
        method: 'google',
      })
    } catch (error: unknown) {
      const firebaseError = error as { code?: string }
      setErrors({ form: parseFirebaseError(firebaseError.code) })
      console.error('Authentication error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setResetMessage('')
    setTouched({ email: true, password: true, displayName: mode === 'register' })
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      if (mode === 'signin') {
        const result = await signInWithEmailAndPassword(auth, email.trim(), password)
        onAuthSuccess({
          uid: result.user.uid,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          email: result.user.email,
        })

        await trackAnalyticsEvent('user_signed_in', {
          method: 'password',
        })
      } else {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password)

        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email: email.trim(),
          displayName: displayName.trim(),
          photoURL: result.user.photoURL,
          workspaceIds: [],
          role: 'user',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true })

        onAuthSuccess({
          uid: result.user.uid,
          displayName: displayName.trim(),
          photoURL: result.user.photoURL,
          email: result.user.email,
        })

        await trackAnalyticsEvent('user_registered', {
          method: 'password',
        })
      }
    } catch (error: unknown) {
      const firebaseError = error as { code?: string }
      setErrors({ form: parseFirebaseError(firebaseError.code) })
      console.error('Authentication error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordReset = async () => {
    const emailError = validateEmail(email)
    if (emailError) {
      setTouched((prev) => ({ ...prev, email: true }))
      setFieldError('email', emailError)
      setResetMessage('')
      return
    }

    try {
      setIsSubmitting(true)
      setErrors({})
      await sendPasswordResetEmail(auth, email.trim())
      setResetMessage('Password reset email sent. Check your inbox.')
      await trackAnalyticsEvent('password_reset_requested')
    } catch (error: unknown) {
      const firebaseError = error as { code?: string }
      setErrors({ form: parseFirebaseError(firebaseError.code) })
      setResetMessage('')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (initializing) {
    return (
      <div className="auth-screen">
        <div className="auth-loader">
          <div className="loader-spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <div className="auth-bg-glow glow-1" />
      <div className="auth-bg-glow glow-2" />

      <div className="auth-layout">
        <motion.div
          className="auth-showcase"
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="showcase-content">
            <div className="showcase-eyebrow">Welcome to</div>
            <h2 className="showcase-headline">Enterprise Messaging Reimagined</h2>
            <p className="showcase-description">
              Real-time collaboration with military-grade security. Built for teams that move fast.
            </p>
            <div className="showcase-features">
              <div className="feature-card">
                <div className="feature-icon">💬</div>
                <div className="feature-text">
                  <div className="feature-title">Instant Messaging</div>
                  <div className="feature-detail">Sub-10ms latency for seamless conversation</div>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <div className="feature-text">
                  <div className="feature-title">End-to-End Encryption</div>
                  <div className="feature-detail">SOC-2 compliant with zero-knowledge architecture</div>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <div className="feature-text">
                  <div className="feature-title">AI-Powered</div>
                  <div className="feature-detail">Smart replies, translation, and insights</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="auth-card"
        >
          <div className="auth-brand" aria-label="App logo and name">
            <div className="auth-logo">
              <MessageSquare size={32} />
            </div>
            <h1 className="auth-title">FlameChat</h1>
            <p className="auth-subtitle">
              Sign in to your workspace
            </p>
          </div>

          <button
            className="auth-google-btn"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            aria-label="Continue with Google"
          >
            <svg viewBox="0 0 48 48" className="google-svg" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.08 24.08 0 0 0 0 21.56l7.98-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>{isSubmitting ? 'Authenticating...' : 'Continue with Google'}</span>
          </button>

          <div className="auth-divider">
            <span>or continue with email</span>
          </div>

          <form className="auth-form" onSubmit={handleEmailAuth} noValidate>
            {mode === 'register' && (
              <div className="auth-field">
                <label htmlFor="displayName">Display Name</label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  onBlur={() => handleBlur('displayName')}
                  className={errors.displayName && touched.displayName ? 'input-error' : ''}
                  placeholder="Enter your display name"
                />
                {errors.displayName && touched.displayName && (
                  <p className="auth-field-error" role="alert">{errors.displayName}</p>
                )}
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  const next = event.target.value
                  setEmail(next)
                  if (touched.email) {
                    setFieldError('email', validateEmail(next))
                  }
                }}
                onBlur={() => handleBlur('email')}
                className={errors.email && touched.email ? 'input-error' : ''}
                placeholder="you@company.com"
              />
              {errors.email && touched.email && (
                <p className="auth-field-error" role="alert">{errors.email}</p>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => {
                  const next = event.target.value
                  setPassword(next)
                  if (touched.password) {
                    setFieldError('password', validatePassword(next))
                  }
                }}
                onBlur={() => handleBlur('password')}
                className={errors.password && touched.password ? 'input-error' : ''}
                placeholder="Minimum 6 characters"
              />
              {errors.password && touched.password && (
                <p className="auth-field-error" role="alert">{errors.password}</p>
              )}

              {mode === 'signin' && (
                <button
                  type="button"
                  className="auth-helper-link"
                  onClick={handlePasswordReset}
                  disabled={isSubmitting}
                >
                  Forgot password?
                </button>
              )}
            </div>

            {errors.form && (
              <p className="auth-form-error" role="alert">{errors.form}</p>
            )}

            {resetMessage && <p className="auth-info-msg" role="status">{resetMessage}</p>}

            <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting && <span className="auth-inline-spinner" aria-hidden="true" />}
              <span>{mode === 'signin' ? 'Sign in' : 'Create account'}</span>
            </button>
          </form>

          <button
            className="auth-switch-mode"
            type="button"
            onClick={() => {
              setMode((prev) => (prev === 'signin' ? 'register' : 'signin'))
              setErrors({})
              setTouched({})
            }}
          >
            {mode === 'signin' ? 'Create account' : 'Already have an account? Sign in'}
          </button>

          <div className="auth-trust">
            <div className="trust-item">
              <Shield size={14} />
              <span>SOC-2 Ready</span>
            </div>
            <div className="trust-item">
              <Zap size={14} />
              <span>Sub-10ms Latency</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="auth-footer">
        (c) 2026 FlameChat | Privacy | Terms
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
