import React, { createContext, useContext, useMemo } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase/config'
import { useAuth } from '../hooks/useAuth'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001/api'

const ensureServerProfile = async () => {
  const currentUser = auth.currentUser
  if (!currentUser) {
    return
  }

  const token = await currentUser.getIdToken()
  await fetch(`${API_BASE}/users/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
}

type AuthContextValue = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password)
        await ensureServerProfile()
      },
      register: async (email: string, password: string) => {
        await createUserWithEmailAndPassword(auth, email, password)
        await ensureServerProfile()
      },
      signInWithGoogle: async () => {
        await signInWithPopup(auth, googleProvider)
        await ensureServerProfile()
      },
      logout: async () => {
        await signOut(auth)
      },
    }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuthContext must be used inside AuthProvider')
  }
  return ctx
}