import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// The service worker keeps a copy of the app on the phone so it opens
// offline. When a new version is published it installs in the background,
// and this reloads the page once it takes over, so nobody is stuck on an old
// copy. An installed app is often only paused in the background, never
// reopened, so we also look for a new version each time it comes back on screen.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update().catch(() => {})
    })
  },
})

// HashRouter keeps the page path after a "#" (e.g. /#/topics), so the app
// works on any static host without extra server setup.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
