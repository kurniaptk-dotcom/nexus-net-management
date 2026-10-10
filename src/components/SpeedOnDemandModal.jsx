import { useState } from "react";
import {
  X,
  Zap,
  Gauge,
  Clock,
  Sparkles,
  CheckCircle2,
  Coins,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { formatRupiah } from "../lib/billingTax";
import { showToast } from "../lib/toast";

const SOD_PACKAGES = [
  {
    id: "sod_6h_30m",
    name: "Turbo Boost 30 Mbps",
    boostSpeed: "30 Mbps",
    durationHours: 6,
    durationLabel: "6 Jam",
    price: 5000,
    desc: "Cocok untuk download update game besar atau backup data cepat.",
    icon: Flame,
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "sod_24h_50m",
    name: "Streaming HD 50 Mbps",
    boostSpeed: "50 Mbps",
    durationHours: 24,
    durationLabel: "24 Jam (1 Hari)",
    price: 15000,
    desc: "Ideal untuk nonton streaming 4K no-buffering dan webinar keluarga.",
    icon: Zap,
    color: "from-blue-600 to-cyan-600",
  },
  {
    id: "sod_48h_100m",
    name: "Ultra Gamer 100 Mbps",
    boostSpeed: "100 Mbps",
    durationHours: 48,
    durationLabel: "48 Jam (Weekend)",
    price: 25000,
    desc: "Kecepatan maksimal tanpa kompromi untuk turnamen e-sport & no lag.",
    icon: Sparkles,
    color: "from-purple-600 to-pink-600",
  },
];

export default function SpeedOnDemandModal({ isOpen, customer, onClose, onActivateBooster }) {
  const [selectedPkg, setSelectedPkg] = useState(SOD_PACKAGES[0]);
  const [isActivating, setIsActivating] = useState(false);

  if (!isOpen || !customer) return null;

  const handleActivate = () => {
    setIsActivating(true);
    setTimeout(() => {
      setIsActivating(false);
      if (onActivateBooster) {
        onActivateBooster(customer, selectedPkg);
      }
      showToast(
        `Booster ${selectedPkg.name} berhasil diaktifkan untuk ${customer.nama}! Kecepatan dinaikkan ke ${selectedPkg.boostSpeed} selama ${selectedPkg.durationLabel}.`,
        "success"
      );
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Speed on Demand (SOD) Booster</h3>
              <p className="text-[11px] text-slate-500">
                {customer.nama} • Paket Saat Ini: {customer.paket}
              </p>
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
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Kecepatan Reguler:</span>
              <span className="font-black text-slate-900">{customer.paket}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Status Booster:</span>
              <span className="font-bold text-slate-600">Standar (Tidak Aktif)</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">Pilih Paket Booster Kecepatan:</label>
            <div className="space-y-2.5">
              {SOD_PACKAGES.map((pkg) => {
                const Icon = pkg.icon;
                const isSelected = selectedPkg.id === pkg.id;

                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPkg(pkg)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "border-[#0D1B4A] bg-[#0D1B4A]/5 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${pkg.color} text-white flex items-center justify-center font-bold shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-xs text-slate-900">{pkg.name}</p>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md font-extrabold bg-amber-100 text-amber-800">
                            {pkg.durationLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{pkg.desc}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-black text-xs text-slate-900">{formatRupiah(pkg.price)}</p>
                      <span className="text-[10px] text-emerald-600 font-bold">Naik ke {pkg.boostSpeed}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 text-amber-900 text-xs">
            <p className="font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-700" />
              Otomatisasi Kembali ke Profil Awal:
            </p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Server RADIUS akan otomatis mengembalikan kecepatan pelanggan ke profil semula begitu durasi booster berakhir.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={isActivating}
              onClick={handleActivate}
              className="w-full py-3 rounded-2xl bg-[#0D1B4A] hover:bg-[#1a2e70] text-white font-extrabold text-xs shadow-lg shadow-indigo-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isActivating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menginjeksi Profil Kecepatan ke RADIUS...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Aktifkan {selectedPkg.name} ({formatRupiah(selectedPkg.price)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
