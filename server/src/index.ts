import 'dotenv/config'
import app from './app.js'

const PORT = parseInt(process.env.PORT || '3001', 10)

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Chat Server running on http://localhost:${PORT}`)
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`)
    console.log(`🔥 Firebase Admin initialized\n`)
})

export default app
