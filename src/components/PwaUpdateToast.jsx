import React, { useState, useEffect } from "react";
import { Sparkles, RefreshCw, X, ArrowUpCircle } from "lucide-react";

export default function PwaUpdateToast() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [updateAction, setUpdateAction] = useState(null);

  useEffect(() => {
    const handleUpdate = (e) => {
      setHasUpdate(true);
      if (e.detail?.update) {
        setUpdateAction(() => e.detail.update);
      }
    };

    window.addEventListener("xnet_pwa_update_available", handleUpdate);
    return () => window.removeEventListener("xnet_pwa_update_available", handleUpdate);
  }, []);

  if (!hasUpdate) return null;

  const handleApplyUpdate = async () => {
    setUpdating(true);
    try {
      if (updateAction) {
        await updateAction();
      } else if (window.__updateSW) {
        await window.__updateSW();
      } else {
        window.location.reload();
      }
    } catch (e) {
      console.warn("PWA update trigger fallback:", e);
      window.location.reload();
    }
  };

  // Jika di-minimize, tampilkan tombol pil ringkas
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-bounce">
        <button
          onClick={() => setMinimized(false)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-[#0D1B4A] text-amber-300 rounded-full shadow-lg border border-amber-400/30 text-xs font-bold hover:scale-105 transition-transform cursor-pointer"
          title="Klik untuk melihat pembaruan sistem"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Update Tersedia</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm w-full mx-auto p-4 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-[#0D1B4A] text-white rounded-2xl p-4 shadow-2xl border border-amber-400/20 backdrop-blur-md relative overflow-hidden">
        {/* Glow decorative background */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-400/30">
            <Sparkles className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-bold text-white">Versi Baru Tersedia</h4>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 uppercase tracking-wide">
                Update
              </span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed mb-3">
              Pembaruan sistem telah siap dipasang. Perbarui sekarang untuk fitur dan perbaikan terbaru.
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={handleApplyUpdate}
                disabled={updating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-[#0D1B4A] rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${updating ? "animate-spin" : ""}`} />
                {updating ? "Memasang..." : "Perbarui Sekarang"}
              </button>
              <button
                onClick={() => setMinimized(true)}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/15 text-white/80 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Nanti
              </button>
            </div>
          </div>

          <button
            onClick={() => setMinimized(true)}
            className="absolute top-3 right-3 text-white/40 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            title="Sembunyikan notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
