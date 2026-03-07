import dotenv from 'dotenv'
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const serviceAccountPath = path.resolve(
    __dirname,
    '..',
    '..',
    process.env.GOOGLE_APPLICATION_CREDENTIALS || 'serviceAccountKey.json'
)

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
