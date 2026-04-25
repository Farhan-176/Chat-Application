export interface Room {
  id: string
  name: string
  description?: string
  createdAt?: unknown
  createdBy?: string
}

export interface Message {
  id: string
  text: string
  uid: string
  displayName: string
  photoURL?: string | null
  createdAt?: unknown
  edited?: boolean
  type?: 'text' | 'image' | 'system'
}