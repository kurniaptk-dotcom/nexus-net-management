import { useEffect } from "react";
import { AlertTriangle, Info, CheckCircle2, X } from "lucide-react";

/**
 * ConfirmModal - Modal dialog konfirmasi modern pengganti window.confirm()
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @param {() => void} onConfirm
 * @param {string} title
 * @param {string} message
 * @param {string} confirmText
 * @param {string} cancelText
 * @param {"danger" | "warning" | "info" | "success"} variant
 * @param {boolean} isLoading
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi Tindakan",
  message = "Apakah Anda yakin ingin melanjutkan tindakan ini?",
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  variant = "danger",
  isLoading = false,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: AlertTriangle,
      iconBg: "bg-rose-50 text-rose-600 ring-rose-100",
      btnBg: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200",
    },
    warning: {
      icon: AlertTriangle,
      iconBg: "bg-amber-50 text-amber-600 ring-amber-100",
      btnBg: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200",
    },
    info: {
      icon: Info,
      iconBg: "bg-blue-50 text-blue-600 ring-blue-100",
      btnBg: "bg-[#0D1B4A] hover:bg-[#152558] text-white shadow-blue-200",
    },
    success: {
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600 ring-emerald-100",
      btnBg: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200",
    },
  };

  const style = variantStyles[variant] || variantStyles.danger;
  const IconComponent = style.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => !isLoading && onClose()}
      />

      {/* Modal Dialog Box */}
      <div className="relative w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 transform transition-all animate-in zoom-in-95 duration-200">
        <button
          type="button"
          disabled={isLoading}
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ring-4 ${style.iconBg}`}>
            <IconComponent className="w-6 h-6 stroke-[2.2]" />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 active:scale-95 ${style.btnBg}`}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
