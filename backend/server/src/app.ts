import express from 'express'
import cors, { type CorsOptions } from 'cors'
import { messagesRouter } from './modules/chat/routes/messages.js'
import { roomsRouter } from './modules/chat/routes/rooms.js'
import { presenceRouter } from './modules/chat/routes/presence.js'
import workspacesRouter from './modules/workspaces/routes/workspaces.js'
import usersRouter from './modules/users/routes/users.js'
import vaultRouter from './modules/users/routes/vault.js'
import invitationsRouter from './modules/workspaces/routes/invitations.js'
import voiceVideoRouter from './modules/chat/routes/voiceVideo.js'
import aiIntelligenceRouter from './modules/chat/routes/aiIntelligence.js'
import e2eEncryptionRouter from './modules/chat/routes/e2eEncryption.js'
import web3AuthRouter from './modules/auth/routes/web3Auth.js'

const app = express()

const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

const localhostOriginRegex = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/

const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser clients (no Origin header) and local frontend dev servers.
        if (!origin || localhostOriginRegex.test(origin) || configuredOrigins.includes(origin)) {
            callback(null, true)
            return
        }

        callback(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/messages', messagesRouter)
app.use('/api/rooms', roomsRouter)
app.use('/api/presence', presenceRouter)
app.use('/api/workspaces', workspacesRouter)
app.use('/api/users', usersRouter)
app.use('/api/users/me/vault', vaultRouter)
app.use('/api/invitations', invitationsRouter)

// New Features: Voice/Video, AI, Privacy, Web3
app.use('/api/calls', voiceVideoRouter)
app.use('/api/ai', aiIntelligenceRouter)
app.use('/api/encryption', e2eEncryptionRouter)
app.use('/auth/web3', web3AuthRouter)

export default app
