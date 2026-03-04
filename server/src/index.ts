import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { messagesRouter } from './routes/messages.js'
import { roomsRouter } from './routes/rooms.js'
import { presenceRouter } from './routes/presence.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(__dirname, '..', process.env.GOOGLE_APPLICATION_CREDENTIALS || 'serviceAccountKey.json')

let firebaseApp

if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8')) as ServiceAccount
    firebaseApp = initializeApp({
        credential: cert(serviceAccount),
    })
} else if (process.env.FIREBASE_PROJECT_ID) {
    firebaseApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
    })
} else {
    console.error('❌ No Firebase credentials found. Provide a serviceAccountKey.json or FIREBASE_PROJECT_ID env var.')
    process.exit(1)
}

export const db = getFirestore(firebaseApp)
export const adminAuth = getAuth(firebaseApp)

const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/messages', messagesRouter)
app.use('/api/rooms', roomsRouter)
app.use('/api/presence', presenceRouter)

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Chat Server running on http://localhost:${PORT}`)
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`)
    console.log(`🔥 Firebase Admin initialized\n`)
})

export default app
