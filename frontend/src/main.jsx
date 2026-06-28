import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import { SessionProvider } from './context/SessionContext'
import { ThemeProvider } from './context/ThemeContext'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => null)
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <SessionProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: 'rgba(10, 14, 28, 0.88)',
                color: '#f4f7ff',
                border: '1px solid rgba(120, 140, 220, 0.18)',
                borderRadius: '16px',
                backdropFilter: 'blur(18px)',
              },
            }}
          />
        </SessionProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
