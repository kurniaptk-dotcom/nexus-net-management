import { useState, useEffect } from "react";
import {
  X,
  QrCode,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { formatRupiah } from "../lib/billingTax";

export default function PaymentQrisModal({ isOpen, invoice, onClose, onConfirmPayment }) {
  const [countdown, setCountdown] = useState(900); // 15 menit
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(900);
      setIsProcessing(false);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen || !invoice) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      if (onConfirmPayment) {
        onConfirmPayment(invoice, "QRIS Instant");
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Pembayaran QRIS Realtime</h3>
              <p className="text-[11px] text-slate-500 font-mono">{invoice.nomor_invoice}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-4">
          {/* Merchant Info */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>NEXUS NET INDONESIA (QRIS Duitku)</span>
            </div>
            <p className="text-xs text-slate-500">NMID: ID1024388192019 • Tagihan: {invoice.pelanggan}</p>
            <h2 className="text-2xl font-black text-slate-900 mt-1 font-mono">{formatRupiah(invoice.total)}</h2>
          </div>

          {/* QR Code Container */}
          <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-inner inline-block relative group">
            {/* Mockup QRIS image / SVG */}
            <div className="w-52 h-52 bg-white flex flex-col items-center justify-center relative p-2 border border-slate-100 rounded-xl">
              <div className="absolute top-2 inset-x-0 flex justify-center">
                <span className="text-[9px] font-black tracking-widest text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  QRIS STANDAR NASIONAL
                </span>
              </div>
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=00020101021226590014ID.LINKAJA.WWW0118936009143881920195204581253033605802ID5914NEXUSNETWIFI6009PONTIANAK6304A8F2"
                alt="QRIS Barcode"
                className="w-40 h-40 object-contain my-auto"
              />
              <div className="absolute bottom-2 inset-x-0 flex justify-center">
                <span className="text-[9px] font-mono font-bold text-slate-500">
                  REF: {invoice.id_pelanggan}
                </span>
              </div>
            </div>

            {/* Countdown Badge */}
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 py-1 rounded-lg border border-amber-200">
              <Clock className="w-3.5 h-3.5" />
              <span>Berlaku hingga: {timeFormatted}</span>
            </div>
          </div>

          {/* Isolir Alert info */}
          {invoice.status === "ISOLIR" && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-left flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-rose-900">Fitur Auto-Unisolir 24 Jam:</span>
                <p className="text-rose-700 text-[11px] mt-0.5">
                  Layanan internet pelanggan yang terisolir akan <strong>langsung aktif kembali otomatis</strong> dalam hitungan detik setelah QRIS sukses terbayar.
                </p>
              </div>
            </div>
          )}

          {/* Payment Partner Logos */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2">Mendukung Semua Pembayaran:</p>
            <div className="flex flex-wrap justify-center items-center gap-2 text-[10px] font-bold text-slate-600">
              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">BCA Mobile</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">Mandiri Livin</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">GoPay</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">OVO</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">Dana</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">ShopeePay</span>
            </div>
          </div>

          {/* Action Simulation Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSimulatePayment}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi Pembayaran...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>Simulasi Scan QRIS & Bayar Sekarang</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Tombol ini mensimulasikan webhook Payment Gateway Duitku menerima dana secara realtime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
