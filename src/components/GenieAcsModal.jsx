import { useState } from "react";
import {
  X,
  Wifi,
  Radio,
  Gauge,
  Smartphone,
  Laptop,
  Tv,
  RotateCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Cpu,
  Thermometer,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { showToast } from "../lib/toast";

export default function GenieAcsModal({ isOpen, customer, onClose }) {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "wifi" | "devices" | "diagnostics"
  const [ssidName, setSsidName] = useState(customer ? `${customer.nama.split(" ")[0]}_NexusNet_5G` : "NexusNet_WiFi");
  const [wifiPassword, setWifiPassword] = useState("nexus123456");
  const [isSavingWifi, setIsSavingWifi] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);

  if (!isOpen || !customer) return null;

  const rxPower = customer.redaman || "-19.4";
  const isOptimal = Number(rxPower) >= -22 && Number(rxPower) <= -15;

  const connectedDevices = [
    { name: "iPhone 15 Pro (User)", ip: "192.168.1.102", mac: "DC:A9:04:88:1A:2B", signal: "-52 dBm", type: "mobile", freq: "5 GHz" },
    { name: "Samsung Galaxy A54", ip: "192.168.1.105", mac: "88:2D:11:43:9C:10", signal: "-64 dBm", type: "mobile", freq: "2.4 GHz" },
    { name: "MacBook Air M2", ip: "192.168.1.110", mac: "F0:18:98:23:44:01", signal: "-48 dBm", type: "laptop", freq: "5 GHz" },
    { name: "Smart TV LG 4K (Living Room)", ip: "192.168.1.115", mac: "14:C0:3E:99:82:11", signal: "LAN 1", type: "tv", freq: "Ethernet" },
  ];

  const handleSaveWifi = (e) => {
    e.preventDefault();
    setIsSavingWifi(true);
    setTimeout(() => {
      setIsSavingWifi(false);
      showToast(`Parameter WiFi berhasil disinkronkan ke modem ONT pelanggan via TR-069!`, "success");
    }, 1000);
  };

  const handleReboot = () => {
    if (confirm(`Yakin ingin melakukan restart (reboot) modem ${customer.nama}? Koneksi akan terputus selama ±1 menit.`)) {
      setIsRebooting(true);
      setTimeout(() => {
        setIsRebooting(false);
        showToast("Perintah Reboot terkirim! Modem sedang memulai ulang.", "info");
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0D1B4A] text-white flex items-center justify-center font-bold shadow-md">
              <Radio className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">GenieACS TR-069 CPE Manager</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-100 text-cyan-800 border border-cyan-200">
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {customer.nama} • {customer.id_pelanggan || "PLG"} • ODP: {customer.odp || "-"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 gap-2 bg-slate-50/50">
          {[
            { id: "overview", label: "Status Optik & ONT", icon: Activity },
            { id: "wifi", label: "Kelola WiFi (SSID)", icon: Wifi },
            { id: "devices", label: `Perangkat Terhubung (${connectedDevices.length})`, icon: Smartphone },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? "border-[#0D1B4A] text-[#0D1B4A]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Device Header Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Model Modem:</span>
                  <p className="text-xs font-black text-slate-900 mt-0.5">ZTE F609 V5.3</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Serial Number:</span>
                  <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">{customer.sn_modem || "ZTEGC8891024"}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IP Address:</span>
                  <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">{customer.ip_address || "10.20.1.45"}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Uptime ONT:</span>
                  <p className="text-xs font-bold text-emerald-600 mt-0.5">14 Hari 6 Jam</p>
                </div>
              </div>

              {/* Optical Power Telemetry */}
              <div className="p-4.5 rounded-2xl bg-gradient-to-br from-slate-900 to-[#0D1B4A] text-white shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Activity className="w-4 h-4" />
                    Telemetri Rx Optical Power (Live)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Standar Prima
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black font-mono tracking-tight text-white">{rxPower}</span>
                  <span className="text-sm font-bold text-slate-300">dBm</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tx Power:</span>
                    <span className="font-mono font-bold text-slate-200">+2.4 dBm</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Laser Current:</span>
                    <span className="font-mono font-bold text-slate-200">14.8 mA</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Suhu ONT:</span>
                    <span className="font-mono font-bold text-amber-300">41.5 °C</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-slate-400">
                  Terakhir sinkronisasi: Baru saja • Protokol TR-069 v1.4
                </p>
                <button
                  type="button"
                  disabled={isRebooting}
                  onClick={handleReboot}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRebooting ? "animate-spin" : ""}`} />
                  <span>{isRebooting ? "Mereboot..." : "Reboot Modem Jarak Jauh"}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "wifi" && (
            <form onSubmit={handleSaveWifi} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900">
                <p className="font-bold flex items-center gap-1.5">
                  <Wifi className="w-4 h-4 text-blue-700" />
                  Ubah Parameter WiFi Tanpa Datang ke Lokasi
                </p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Pengaturan nama WiFi (SSID) dan password akan dikirim langsung ke ONT modem pelanggan melalui server TR-069.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama WiFi (SSID):</label>
                <input
                  type="text"
                  required
                  value={ssidName}
                  onChange={(e) => setSsidName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kata Sandi WiFi (WPA2-PSK):</label>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Minimal 8 karakter alfanumerik.</span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingWifi}
                  className="w-full py-2.5 rounded-xl bg-[#0D1B4A] hover:bg-[#1a2e70] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSavingWifi ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mengirim Parameter ke ONT...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Terapkan Perubahan WiFi via GenieACS</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === "devices" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Daftar smartphone, laptop, dan smart device yang saat ini sedang aktif terhubung ke router ONT:
              </p>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {connectedDevices.map((dev, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        {dev.type === "mobile" ? (
                          <Smartphone className="w-4 h-4" />
                        ) : dev.type === "laptop" ? (
                          <Laptop className="w-4 h-4" />
                        ) : (
                          <Tv className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{dev.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {dev.ip} • MAC: {dev.mac}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {dev.signal}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{dev.freq}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
