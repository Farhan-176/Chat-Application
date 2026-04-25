import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { User } from '../shared/types'

interface ProtectedRouteProps {
  user: User | null
  children: ReactNode
}

export const ProtectedRoute = ({ user, children }: ProtectedRouteProps) => {
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
