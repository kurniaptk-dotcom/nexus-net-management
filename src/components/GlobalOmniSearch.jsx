import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Wrench,
  UserCheck,
  Target,
  AlertTriangle,
  Network,
  ChevronRight,
  X,
  Command,
} from "lucide-react";
import {
  pekerjaanList,
  initialPelangganRadius,
  leadsList,
  daftarGangguanList,
  odpOdcList,
} from "../data/mockData";

function readLocal(keys, fallback) {
  const keyList = Array.isArray(keys) ? keys : [keys];
  for (const k of keyList) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        if (parsed && !Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
  }
  return fallback;
}

export default function GlobalOmniSearch({
  isOpen,
  onClose,
  initialQuery = "",
  standalone = false,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState(() => ({
    pekerjaan: readLocal("xnet_pekerjaan", pekerjaanList),
    pelanggan: readLocal("xnet_pelanggan_radius", initialPelangganRadius),
    leads: readLocal("xnet_leads", leadsList),
    gangguan: readLocal(["xnet_daftar_gangguan_v2", "xnet_gangguan"], daftarGangguanList),
    odpList: readLocal("xnet_odpodc", odpOdcList),
  }));

  useEffect(() => {
    if (isOpen || standalone) {
      setData({
        pekerjaan: readLocal("xnet_pekerjaan", pekerjaanList),
        pelanggan: readLocal("xnet_pelanggan_radius", initialPelangganRadius),
        leads: readLocal("xnet_leads", leadsList),
        gangguan: readLocal(["xnet_daftar_gangguan_v2", "xnet_gangguan"], daftarGangguanList),
        odpList: readLocal("xnet_odpodc", odpOdcList),
      });
    }
  }, [isOpen, standalone]);

  const { pekerjaan, pelanggan, leads, gangguan, odpList } = data;

  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return null;

    // 1. Pekerjaan Matches
    const matchingPekerjaan = (pekerjaan || [])
      .filter(
        (p) =>
          (p.pelanggan || "").toLowerCase().includes(q) ||
          (p.alamat || "").toLowerCase().includes(q) ||
          (p.odp || "").toLowerCase().includes(q) ||
          (p.spk_no || "").toLowerCase().includes(q) ||
          (p.tim || "").toLowerCase().includes(q)
      )
      .slice(0, 4);

    // 2. Pelanggan Radius Matches
    const matchingPelanggan = (pelanggan || [])
      .filter(
        (pl) =>
          (pl.nama || "").toLowerCase().includes(q) ||
          (pl.username || "").toLowerCase().includes(q) ||
          (pl.alamat || "").toLowerCase().includes(q) ||
          (pl.ip || "").toLowerCase().includes(q) ||
          (pl.telepon || "").includes(q)
      )
      .slice(0, 4);

    // 3. Leads Matches
    const matchingLeads = (leads || [])
      .filter(
        (l) =>
          (l.nama || "").toLowerCase().includes(q) ||
          (l.alamat || "").toLowerCase().includes(q) ||
          (l.telepon || "").includes(q) ||
          (l.odp_terdekat || "").toLowerCase().includes(q)
      )
      .slice(0, 3);

    // 4. Gangguan Matches
    const matchingGangguan = (gangguan || [])
      .filter(
        (g) =>
          (g.pelanggan || "").toLowerCase().includes(q) ||
          (g.alamat || "").toLowerCase().includes(q) ||
          (g.keluhan || "").toLowerCase().includes(q) ||
          (g.tiket_no || "").toLowerCase().includes(q)
      )
      .slice(0, 3);

    // 5. ODP / ODC Matches
    const matchingOdp = (odpList || [])
      .filter(
        (o) =>
          (o.nama || "").toLowerCase().includes(q) ||
          (o.odc || "").toLowerCase().includes(q) ||
          (o.keterangan || "").toLowerCase().includes(q)
      )
      .slice(0, 3);

    const totalCount =
      matchingPekerjaan.length +
      matchingPelanggan.length +
      matchingLeads.length +
      matchingGangguan.length +
      matchingOdp.length;

    return {
      pekerjaan: matchingPekerjaan,
      pelanggan: matchingPelanggan,
      leads: matchingLeads,
      gangguan: matchingGangguan,
      odp: matchingOdp,
      totalCount,
    };
  }, [query, pekerjaan, pelanggan, leads, gangguan, odpList]);

  const handleSelect = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  if (!isOpen && !standalone) return null;

  return (
    <div
      className={
        standalone
          ? "w-full"
          : "fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-3 sm:px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      }
      onClick={(e) => {
        if (!standalone && e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className={`w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col ${
          standalone ? "" : "animate-in zoom-in-95 duration-150 max-h-[82vh]"
        }`}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && onClose) onClose();
              if (e.key === "Enter" && query.trim()) {
                handleSelect(`/pekerjaan?search=${encodeURIComponent(query.trim())}`);
              }
            }}
            placeholder="Ketik nama pelanggan, SPK, alamat, no. HP, atau ODP..."
            className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {!standalone && (
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-lg shadow-2xs">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 no-scrollbar">
          {!query || query.trim().length < 2 ? (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <Command className="w-8 h-8 mx-auto opacity-30 text-blue-600" />
              <p className="text-xs font-semibold text-slate-500">
                Pencarian Cepat Seluruh Modul Sistem
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Ketik minimal 2 karakter untuk mencari otomatis di Pekerjaan, Pelanggan Radius, Leads, Gangguan, dan ODP.
              </p>
            </div>
          ) : searchResults?.totalCount === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-1">
              <p className="text-xs font-bold text-slate-700">Tidak ada hasil yang cocok</p>
              <p className="text-[11px] text-slate-400">
                Tidak ditemukan data yang sesuai dengan kata kunci &quot;{query}&quot;.
              </p>
            </div>
          ) : (
            <>
              {/* 1. Kategori: Pekerjaan */}
              {searchResults?.pekerjaan.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400 px-2">
                    <span className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-blue-600" />
                      Pekerjaan Lapangan ({searchResults.pekerjaan.length})
                    </span>
                    <button
                      onClick={() => handleSelect(`/pekerjaan?search=${encodeURIComponent(query)}`)}
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      Buka Semua →
                    </button>
                  </div>
                  <div className="divide-y divide-slate-50 bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                    {searchResults.pekerjaan.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(`/pekerjaan?search=${encodeURIComponent(item.pelanggan)}`)}
                        className="p-2.5 sm:p-3 hover:bg-white transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                              {item.pelanggan}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200/60">
                              {item.jenis}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {item.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {item.alamat || "Alamat belum diatur"} · Tim: {item.tim || "-"}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Kategori: Pelanggan Radius */}
              {searchResults?.pelanggan.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400 px-2">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Pelanggan Radius ({searchResults.pelanggan.length})
                    </span>
                    <button
                      onClick={() => handleSelect(`/pelanggan?search=${encodeURIComponent(query)}`)}
                      className="text-emerald-600 hover:underline cursor-pointer"
                    >
                      Buka Semua →
                    </button>
                  </div>
                  <div className="divide-y divide-slate-50 bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                    {searchResults.pelanggan.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(`/pelanggan?search=${encodeURIComponent(item.nama)}`)}
                        className="p-2.5 sm:p-3 hover:bg-white transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-600 transition-colors">
                              {item.nama}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              {item.paket || "Reguler"}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {item.ip || item.username || "-"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {item.alamat || "Alamat"} · {item.telepon || "-"}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Kategori: Leads */}
              {searchResults?.leads.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400 px-2">
                    <span className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-amber-600" />
                      Leads / Calon Pelanggan ({searchResults.leads.length})
                    </span>
                    <button
                      onClick={() => handleSelect(`/leads?search=${encodeURIComponent(query)}`)}
                      className="text-amber-600 hover:underline cursor-pointer"
                    >
                      Buka Semua →
                    </button>
                  </div>
                  <div className="divide-y divide-slate-50 bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                    {searchResults.leads.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(`/leads?search=${encodeURIComponent(item.nama)}`)}
                        className="p-2.5 sm:p-3 hover:bg-white transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-amber-600 transition-colors">
                              {item.nama}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                              {item.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {item.alamat || "Alamat"} · ODP: {item.odp_terdekat || "-"}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Kategori: Gangguan */}
              {searchResults?.gangguan.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400 px-2">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Tiket Gangguan ({searchResults.gangguan.length})
                    </span>
                    <button
                      onClick={() => handleSelect(`/gangguan?search=${encodeURIComponent(query)}`)}
                      className="text-rose-600 hover:underline cursor-pointer"
                    >
                      Buka Semua →
                    </button>
                  </div>
                  <div className="divide-y divide-slate-50 bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                    {searchResults.gangguan.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(`/gangguan?search=${encodeURIComponent(item.pelanggan)}`)}
                        className="p-2.5 sm:p-3 hover:bg-white transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-rose-600 transition-colors">
                              {item.pelanggan}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
                              {item.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            Keluhan: {item.keluhan || "-"}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Kategori: ODP / ODC */}
              {searchResults?.odp.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400 px-2">
                    <span className="flex items-center gap-1.5">
                      <Network className="w-3.5 h-3.5 text-indigo-600" />
                      Infrastruktur ODP / ODC ({searchResults.odp.length})
                    </span>
                    <button
                      onClick={() => handleSelect(`/odp?search=${encodeURIComponent(query)}`)}
                      className="text-indigo-600 hover:underline cursor-pointer"
                    >
                      Buka Semua →
                    </button>
                  </div>
                  <div className="divide-y divide-slate-50 bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                    {searchResults.odp.map((item) => (
                      <div
                        key={item.id || item.nama}
                        onClick={() => handleSelect(`/odp?search=${encodeURIComponent(item.nama)}`)}
                        className="p-2.5 sm:p-3 hover:bg-white transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {item.nama}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                              {item.total_port ? `${item.total_port} Port` : "ODP"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            Induk: {item.odc || "-"} · {item.keterangan || "-"}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Shortcut Info */}
        <div className="p-2.5 sm:p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            Tekan <kbd className="font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">Enter</kbd> untuk cari global di Pekerjaan
          </span>
          <span className="hidden sm:inline">
            Nexus Net Omnibox
          </span>
        </div>
      </div>
    </div>
  );
}
