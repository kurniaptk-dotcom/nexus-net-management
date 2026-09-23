import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Register PWA service worker with auto-reload upon updates
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New content available, reloading...');
  },
  onOfflineReady() {
    console.log('App ready to work offline.');
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

