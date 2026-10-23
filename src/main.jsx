import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Auto-Migration & Data Sync: Muat dataset utuh 10 bulan (Januari - Oktober 2026)
const CURRENT_DATA_VERSION = "20261023_v5_full_10_months_2026";
if (typeof localStorage !== "undefined") {
  try {
    const savedVersion = localStorage.getItem("xnet_data_version");
    if (savedVersion !== CURRENT_DATA_VERSION) {
      console.log("🧹 [CLEANUP] Mengosongkan data lama di browser...");
      const keysToReset = [
        "xnet_pekerjaan",
        "xnet_leads",
        "xnet_gangguan",
        "xnet_daftar_gangguan_v2",
        "xnet_pengajuan_pemutusan",
        "xnet_pelanggan_radius",
        "xnet_fu_pelanggan",
        "xnet_redaman_tinggi"
      ];
      keysToReset.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem("xnet_data_version", CURRENT_DATA_VERSION);
    }
  } catch (err) {
    console.warn("[MIGRATION ERROR]", err);
  }
}

// Unregister Service Worker caches jika ada versi lawas yang terkunci
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.update().catch(() => {});
    }
  });
}

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
