import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export default function Toast({ message, type = "info", onClose }) {
  if (!message) return null;

  const bgStyles = {
    success: "bg-emerald-500 text-white shadow-emerald-500/20",
    error: "bg-rose-600 text-white shadow-rose-500/20",
    info: "bg-[#0D1B4A] text-white shadow-blue-900/20",
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 flex-shrink-0" />,
    info: <Info className="w-5 h-5 flex-shrink-0" />,
  };

  return (
    <div className="fixed bottom-5 right-5 z-[100] max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-xl ${
          bgStyles[type] || bgStyles.info
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {icons[type] || icons.info}
          <p className="text-sm font-medium leading-snug break-words">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white/80 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
