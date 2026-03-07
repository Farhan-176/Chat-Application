import express from 'express'
import cors, { type CorsOptions } from 'cors'
import { messagesRouter } from './routes/messages.js'
import { roomsRouter } from './routes/rooms.js'
import { presenceRouter } from './routes/presence.js'

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

app.use('/api/messages', messagesRouter)
app.use('/api/rooms', roomsRouter)
app.use('/api/presence', presenceRouter)

export default app
