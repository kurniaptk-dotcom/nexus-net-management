import React, { useMemo } from "react";
import { Gauge, CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from "lucide-react";

/**
 * Evaluasi standar kualitas redaman FTTH GPON (dBm)
 * Standard Telko GPON (ITU-T G.984):
 * - Prima (Lolos SOP): -15.00 s/d -23.99 dBm
 * - Waspada (Batas Toleransi): -24.00 s/d -26.99 dBm
 * - Kritis / Buruk: < -27.00 dBm (Redup/LOS) atau > -10.00 dBm (Overload)
 */
export function evaluateDbm(val) {
  if (val === null || val === undefined || val === "" || val === "N/A" || val === "-") {
    return {
      status: "EMPTY",
      num: null,
      label: "Belum Diukur",
      desc: "Masukkan hasil ukur dari Optical Power Meter (OPM)",
      color: "text-slate-500 bg-slate-50 border-slate-200",
      dot: "bg-slate-400",
      percent: 0,
      icon: HelpCircle,
    };
  }

  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  if (isNaN(num)) {
    return {
      status: "INVALID",
      num: null,
      label: "Format Tidak Valid",
      desc: "Contoh format benar: -19.5 atau -21",
      color: "text-slate-500 bg-slate-50 border-slate-200",
      dot: "bg-slate-400",
      percent: 0,
      icon: HelpCircle,
    };
  }

  // Standar nilai negatif redaman optic (Rx Power)
  const abs = Math.abs(num);

  // Hitung persentase gauge needle (rentang: 12 dBm sampai 32 dBm)
  // 15 dBm = 15%, 20 dBm = 50%, 25 dBm = 75%, 30 dBm = 95%
  const clampAbs = Math.min(Math.max(abs, 12), 32);
  const percent = Math.round(((clampAbs - 12) / (32 - 12)) * 100);

  if (abs >= 15 && abs <= 23.99) {
    return {
      status: "PRIMA",
      num,
      abs,
      label: "Prima (SOP Telko)",
      desc: "Kualitas sinyal optimal, bebas packet loss, dan lolos standar QC.",
      color: "text-emerald-700 bg-emerald-50 border-emerald-300",
      barColor: "bg-emerald-500",
      dot: "bg-emerald-500",
      percent,
      icon: CheckCircle2,
    };
  }

  if (abs >= 24 && abs <= 26.99) {
    return {
      status: "WASPADA",
      num,
      abs,
      label: "Waspada / Toleransi",
      desc: "Cukup online, namun rentan gangguan cuaca/hujan. Periksa tekukan dropcore.",
      color: "text-amber-800 bg-amber-50 border-amber-300",
      barColor: "bg-amber-500",
      dot: "bg-amber-500",
      percent,
      icon: AlertTriangle,
    };
  }

  return {
    status: "KRITIS",
    num,
    abs,
    label: abs < 12 ? "Overload (Terlalu Kuat)" : "Kritis / Redup (Resiko LOS)",
    desc: abs < 12
      ? "Sinyal optik terlalu kuat, berisiko merusak receiver laser ONT."
      : "Redaman terlalu tinggi. Segera kupas ulang fast connector atau periksa splitter ODP.",
    color: "text-rose-700 bg-rose-50 border-rose-300",
    barColor: "bg-rose-500",
    dot: "bg-rose-500",
    percent,
    icon: AlertCircle,
  };
}

export default function OpticalPowerGauge({ value, mode = "full", className = "" }) {
  const evalResult = useMemo(() => evaluateDbm(value), [value]);
  const Icon = evalResult.icon;

  if (mode === "badge") {
    if (!evalResult.num && evalResult.status === "EMPTY") return null;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${evalResult.color} ${className}`}
        title={`${evalResult.label}: ${evalResult.desc}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${evalResult.dot}`} />
        <span>{evalResult.num !== null ? `${evalResult.num} dBm` : value}</span>
        <span className="text-[10px] font-normal opacity-80">({evalResult.label.split(" ")[0]})</span>
      </span>
    );
  }

  return (
    <div className={`p-3 rounded-2xl border transition-all ${evalResult.color} ${className}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-white/80 border border-current flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wide uppercase">{evalResult.label}</span>
              {evalResult.num !== null && (
                <span className="text-xs font-mono font-black px-1.5 py-0.2 bg-white/90 rounded border border-current">
                  {evalResult.num} dBm
                </span>
              )}
            </div>
            <p className="text-[11px] opacity-90 leading-tight mt-0.5">{evalResult.desc}</p>
          </div>
        </div>
      </div>

      {/* Visual Barometer Gauge Meter */}
      <div className="space-y-1 pt-1">
        <div className="relative h-2.5 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
          {/* Zona Prima: -15 s/d -24 dBm */}
          <div className="h-full bg-emerald-500 flex-1" title="Zona Prima (-15 s/d -23.9 dBm)" />
          {/* Zona Waspada: -24 s/d -27 dBm */}
          <div className="h-full bg-amber-400 w-1/4" title="Zona Waspada (-24 s/d -26.9 dBm)" />
          {/* Zona Kritis: > -27 dBm */}
          <div className="h-full bg-rose-500 w-1/4" title="Zona Kritis (> -27 dBm / LOS)" />
        </div>

        {/* Labels Scale */}
        <div className="flex justify-between text-[9px] font-mono text-slate-500 px-0.5">
          <span className="text-emerald-700 font-bold">-15 dBm (Bagus)</span>
          <span className="text-amber-700 font-bold">-24 dBm (Batas)</span>
          <span className="text-rose-700 font-bold">-27 dBm (Kritis)</span>
        </div>
      </div>
    </div>
  );
}
