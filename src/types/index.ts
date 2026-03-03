export interface User {
  uid: string
  displayName: string | null
  photoURL: string | null
  email: string | null
}

export interface Message {
  id: string
  text: string
  uid: string
  displayName: string
  photoURL: string | null
  createdAt: Date
}

export interface ChatRoom {
  id: string
  name: string
  createdAt: Date
  description?: string
}
