import { useState, useEffect } from "react";
import { Download, X, Smartphone, WifiOff } from "lucide-react";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Monitor online/offline state
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user previously dismissed in this session
      const dismissed = sessionStorage.getItem("pwa_install_dismissed");
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Listen for app installed
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    // Expose global trigger
    window.__showPwaInstallPrompt = () => {
      setShowPrompt(true);
    };

    return () => {
      delete window.__showPwaInstallPrompt;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert(
        "Panduan Memasang Aplikasi:\n\n" +
        "• Android / Chrome: Klik menu titik tiga (⋮) di browser -> pilih 'Pasang aplikasi' atau 'Tambahkan ke Layar Utama'.\n" +
        "• iPhone / Safari: Ketuk tombol 'Share' (ikon kotak panah ke atas) -> pilih 'Add to Home Screen' (Tambahkan ke Layar Utama).\n" +
        "• Komputer / Laptop: Klik tombol 'Install' di address bar kanan atas browser."
      );
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("pwa_install_dismissed", "true");
  };

  return (
    <>
      {/* Offline banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2 shadow-md">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Mode Offline: Anda tetap dapat membuka aplikasi dan data tersimpan di perangkat.</span>
        </div>
      )}

      {/* Install Prompt Popup */}
      {showPrompt && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] bg-white border border-gray-100 shadow-2xl rounded-2xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#0D1B4A] flex items-center justify-center flex-shrink-0 shadow-md">
              <img src="/LogoNexusputihoren.png" alt="Nexus Net" className="w-8 h-8 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900 text-sm">Pasang Aplikasi</h4>
                <button
                  onClick={handleDismiss}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Install <b>Nexus Net Management</b> ke layar utama untuk akses instan & mode offline di lapangan.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0D1B4A] hover:bg-[#1a237e] text-white rounded-xl text-xs font-semibold hover:shadow-lg hover:shadow-blue-950/20 active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install Sekarang
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Nanti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
