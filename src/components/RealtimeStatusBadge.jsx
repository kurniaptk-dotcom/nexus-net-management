import React, { useState, useRef, useEffect } from "react";
import { Radio, Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { useRealtimeStatus } from "../hooks/usePersistState";

export default function RealtimeStatusBadge() {
  const { isOnline, overallStatus, activeChannelsCount, tableStatuses } = useRealtimeStatus();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  // Close popover on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        dotClass: "bg-red-500",
        badgeBg: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
        label: "Offline",
        description: "Tidak ada koneksi internet",
        icon: WifiOff,
        ping: false,
      };
    }
    if (overallStatus === "CONNECTED") {
      return {
        dotClass: "bg-emerald-500",
        badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
        label: "Live",
        description: "Terhubung ke Supabase Realtime",
        icon: Radio,
        ping: true,
      };
    }
    if (overallStatus === "CONNECTING") {
      return {
        dotClass: "bg-amber-500",
        badgeBg: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
        label: "Menghubungkan",
        description: "Menghubungkan ke server realtime...",
        icon: RefreshCw,
        ping: false,
      };
    }
    return {
      dotClass: "bg-slate-400",
      badgeBg: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
      label: "Standby",
      description: "Siap sinkronisasi",
      icon: Wifi,
      ping: false,
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        type="button"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${config.badgeBg}`}
        title={`${config.label}: ${config.description}`}
      >
        <span className="relative flex h-2 w-2">
          {config.ping && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dotClass} opacity-75`} />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotClass}`} />
        </span>
        <span className="hidden sm:inline font-medium">{config.label}</span>
      </button>

      {/* Popover Detail Status */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-3.5 z-50 text-left animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${config.dotClass}`} />
              <h4 className="text-xs font-bold text-gray-800">Status Sinkronisasi</h4>
            </div>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              {config.label}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Status Jaringan */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50">
              <span className="text-gray-500 flex items-center gap-1.5">
                {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-red-500" />}
                Koneksi Internet
              </span>
              <span className={`font-semibold ${isOnline ? "text-emerald-700" : "text-red-600"}`}>
                {isOnline ? "Online" : "Terputus"}
              </span>
            </div>

            {/* Status Database */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#0D1B4A]" />
                Cloud Realtime
              </span>
              <span className="font-semibold text-gray-800">
                {activeChannelsCount > 0 ? `${activeChannelsCount} Kanal Aktif` : overallStatus === "CONNECTING" ? "Menyambung..." : "Standby"}
              </span>
            </div>

            {/* List kanal aktif jika ada */}
            {Object.keys(tableStatuses).length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Kanal Terdaftar</p>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {Object.entries(tableStatuses).map(([tbl, st]) => (
                    <div key={tbl} className="flex items-center justify-between px-2 py-1 rounded-lg bg-gray-50/70 text-[11px]">
                      <span className="text-gray-600 font-mono truncate max-w-[140px]">{tbl}</span>
                      <span className={`text-[10px] font-bold ${st === "SUBSCRIBED" ? "text-emerald-600" : "text-amber-600"}`}>
                        {st === "SUBSCRIBED" ? "Aktif" : st}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all cursor-pointer w-full justify-center"
            >
              <RefreshCw className="w-3 h-3" /> Segarkan Halaman
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
