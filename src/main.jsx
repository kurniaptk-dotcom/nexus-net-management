import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Register PWA service worker with auto-reload upon updates
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New content available, reloading...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('App ready to work offline.');
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    // Check for new deployments periodically and when the tab regains focus
    const check = () => registration.update().catch(() => {});
    setInterval(check, 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

