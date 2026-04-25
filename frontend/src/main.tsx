import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root was not found in index.html')
}

const root = ReactDOM.createRoot(rootElement)

async function bootstrapApp() {
  try {
    const { default: App } = await import('./core/app/App.tsx')

    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>,
    )
  } catch (error) {
    console.error('App bootstrap failed:', error)

    root.render(
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          color: '#f8fafc',
          fontFamily: 'Segoe UI, sans-serif',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div>
          <h1 style={{ marginBottom: '12px', fontSize: '24px' }}>App Failed To Load</h1>
          <p style={{ opacity: 0.9, lineHeight: 1.6 }}>
            A startup error occurred. Open browser DevTools Console for the exact error details.
          </p>
        </div>
      </div>,
    )
  }
}

void bootstrapApp()

