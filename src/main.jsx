import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Register PWA service worker with auto-update / prompt
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] Versi baru aplikasi tersedia.');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('xnet_pwa_update_available', {
          detail: {
            update: () => updateSW(true),
          },
        })
      );
    }
  },
  onOfflineReady() {
    console.log('[PWA] Aplikasi siap bekerja secara offline.');
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    // Check for new deployments periodically (setiap 60 detik) dan saat tab aktif kembali
    const check = () => registration.update().catch(() => {});
    setInterval(check, 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  },
})

// Simpan referensi global agar bisa diakses langsung jika dibutuhkan
if (typeof window !== 'undefined') {
  window.__updateSW = () => updateSW(true);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
