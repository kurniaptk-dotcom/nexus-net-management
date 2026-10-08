import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

const bgStyles = {
  success: "bg-emerald-600 text-white shadow-xl shadow-emerald-950/20 border border-emerald-500/30",
  error: "bg-rose-600 text-white shadow-xl shadow-rose-950/20 border border-rose-500/30",
  warning: "bg-amber-500 text-slate-950 shadow-xl shadow-amber-950/20 border border-amber-400/30",
  info: "bg-[#0D1B4A] text-white shadow-xl shadow-slate-950/30 border border-white/10",
};

const icons = {
  success: <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />,
  error: <AlertCircle className="w-5 h-5 shrink-0 text-white" />,
  warning: <AlertTriangle className="w-5 h-5 shrink-0 text-slate-950" />,
  info: <Info className="w-5 h-5 shrink-0 text-amber-400" />,
};

/**
 * Global Toast Container - pasang di Layout utama
 */
export function GlobalToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const { id, message, type = "info", duration = 3500 } = e.detail || {};
      if (!message) return;

      const toastId = id || Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id: toastId, message, type }]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toastId));
        }, duration);
      }
    };

    window.addEventListener("xnet_show_toast", handleToast);
    return () => window.removeEventListener("xnet_show_toast", handleToast);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 sm:top-5 sm:right-5 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl backdrop-blur-md animate-in slide-in-from-top-3 fade-in duration-200 ${
            bgStyles[t.type] || bgStyles.info
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {icons[t.type] || icons.info}
            <p className="text-xs sm:text-sm font-semibold leading-snug break-words">
              {t.message}
            </p>
          </div>
          <button
            onClick={() => removeToast(t.id)}
            type="button"
            className="p-1 rounded-lg hover:bg-black/10 transition-colors opacity-70 hover:opacity-100 cursor-pointer shrink-0"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Backward compatibility: Single Toast component jika ada file lama yang masih me-render langsung
 */
export default function Toast({ message, type = "info", onClose }) {
  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 sm:top-5 sm:right-5 z-[100] max-w-sm w-[calc(100vw-2rem)] sm:w-full animate-in fade-in slide-in-from-top-3 duration-200">
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md ${
          bgStyles[type] || bgStyles.info
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icons[type] || icons.info}
          <p className="text-xs sm:text-sm font-semibold leading-snug break-words">{message}</p>
        </div>
        <button
          onClick={onClose}
          type="button"
          className="p-1 rounded-lg hover:bg-black/10 transition-colors opacity-70 hover:opacity-100 cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
