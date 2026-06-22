import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// autoUpdate: when a new deployed version is found, the service worker activates
// and the page reloads automatically. We also poll periodically so a long-open
// session picks up updates without a manual refresh.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (registration) setInterval(() => void registration.update(), 60_000)
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
