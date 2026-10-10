import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Network,
  Wifi,
  WifiOff,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  Wrench,
  CheckCircle2,
  Layers,
  MapPin,
  Filter,
  Globe,
  Target,
  ArrowLeft,
  Users,
  AlertTriangle,
} from "lucide-react";
import { odpOdcList, odcMasterList, initialPelangganRadius } from "../data/mockData";
import unifiedOdpOdc from "../data/unifiedOdpOdc.json";
import { usePersistState } from "../hooks/usePersistState";
import { enrichOdpWithPortUtilization, calculateNetworkPortStats } from "../lib/odpUtilization";
import Toast from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import OdpGoogleEarthMap from "../components/OdpGoogleEarthMap";

export default function ODP() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramCoverage = searchParams.get("coverage");
  const paramLeadId = searchParams.get("leadId");
  const paramLat = searchParams.get("lat");
  const paramLng = searchParams.get("lng");
  const paramAlamat = searchParams.get("alamat");
  const paramNama = searchParams.get("nama");

  const [data, setData] = usePersistState("xnet_odpodc", odpOdcList);
  const [odcList, setOdcList] = usePersistState("xnet_odc_list", odcMasterList);
  const [pelangganList] = usePersistState("xnet_pelanggan_radius", initialPelangganRadius);

  const [viewMode, setViewMode] = useState(paramCoverage ? "earth" : "table"); // 'table' | 'earth'
  const [focusedNode, setFocusedNode] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterOdc, setFilterOdc] = useState("ALL");
  const [filterPort, setFilterPort] = useState("ALL"); // "ALL" | "AVAILABLE" | "FULL"
  const [expandedOdc, setExpandedOdc] = useState({});
  const [selectedOdpCustomers, setSelectedOdpCustomers] = useState(null);

  // Auto-sinkronisasi data tabel dengan seluruh 200 titik ODP & 42 ODC dari Google Earth KML
  useEffect(() => {
    if (data && data.length < 50 && unifiedOdpOdc?.odpList?.length > 0) {
      console.log("[ODP] Auto-syncing 200 real Google Earth KML points to table...");
      const existingMap = {};
      data.forEach((d) => {
        const k = d.nama.replace(/\./g, " ").trim().toLowerCase();
        existingMap[k] = d;
      });

      const merged = unifiedOdpOdc.odpList.map((item) => {
        const k = item.nama.replace(/\./g, " ").trim().toLowerCase();
        if (existingMap[k]) {
          return { ...item, ...existingMap[k], lat: item.lat, lng: item.lng };
        }
        return item;
      });

      setData(merged);
      if (odcList.length < 20 && unifiedOdpOdc?.odcList?.length > 0) {
        setOdcList(unifiedOdpOdc.odcList);
      }
    }
  }, [data, odcList]);

  const handleJumpToMap = (item) => {
    setFocusedNode(item);
    setViewMode("earth");
  };

  // Sinkronkan viewMode jika ada query param coverage
  useEffect(() => {
    if (paramCoverage) {
      setViewMode("earth");
    }
  }, [paramCoverage]);

  // Handler Simpan Lead dari Hasil Survey Coverage Checker
  const handleSaveLeadFromCoverage = (leadInfo) => {
    try {
      const existingLeads = JSON.parse(localStorage.getItem("xnet_leads") || "[]");

      if (paramLeadId) {
        // Update lead yang sedang dicek
        const updated = existingLeads.map((item) => {
          if (String(item.id) === String(paramLeadId)) {
            return {
              ...item,
              odp_terdekat: leadInfo.odpName,
              jarak_odp: leadInfo.estCable,
              lat: leadInfo.targetPoint?.lat || item.lat,
              lng: leadInfo.targetPoint?.lng || item.lng,
              keterangan_coverage: `${leadInfo.tier === "IDEAL" ? "Sangat Layak" : leadInfo.tier === "SURVEY" ? "Perlu Survey" : "Di Luar Jangkauan"} (${leadInfo.straightDist}m)`,
            };
          }
          return item;
        });
        localStorage.setItem("xnet_leads", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("xnet_storage_update", { detail: { key: "xnet_leads", value: updated } }));
        showToast("success", `Data ODP ${leadInfo.odpName} (~${leadInfo.estCable}m) berhasil disimpan ke Lead #${paramLeadId}!`);
        setTimeout(() => navigate("/leads"), 1200);
      } else {
        // Buat lead baru
        const newLead = {
          id: Date.now(),
          nama: paramNama || "Calon Pelanggan (Survey Peta)",
          sumber: "MARKETING",
          status: "BARU",
          tanggal: new Date().toISOString().split("T")[0],
          telepon: "",
          alamat: paramAlamat || leadInfo.targetPoint?.label || `Koordinat: ${leadInfo.targetPoint?.lat?.toFixed(5)}, ${leadInfo.targetPoint?.lng?.toFixed(5)}`,
          lat: leadInfo.targetPoint?.lat,
          lng: leadInfo.targetPoint?.lng,
          odp_terdekat: leadInfo.odpName,
          jarak_odp: leadInfo.estCable,
          keterangan_coverage: `${leadInfo.tier === "IDEAL" ? "Sangat Layak" : leadInfo.tier === "SURVEY" ? "Perlu Survey" : "Di Luar Jangkauan"} (${leadInfo.straightDist}m)`,
        };
        const updatedNew = [newLead, ...existingLeads];
        localStorage.setItem("xnet_leads", JSON.stringify(updatedNew));
        window.dispatchEvent(new CustomEvent("xnet_storage_update", { detail: { key: "xnet_leads", value: updatedNew } }));
        showToast("success", `Lead baru berhasil dibuat! Terhubung ke ${leadInfo.odpName} (~${leadInfo.estCable}m)`);
        setTimeout(() => navigate("/leads"), 1200);
      }
    } catch (err) {
      showToast("error", "Gagal menyimpan lead: " + err.message);
    }
  };

  // Modals
  const [isOdpModalOpen, setIsOdpModalOpen] = useState(false);
  const [editingOdp, setEditingOdp] = useState(null);
  const [odpForm, setOdpForm] = useState({
    odc: "",
    nama: "",
    keterangan: "",
    status: "Aman",
    kapasitas: "8 Port",
  });

  const [isOdcModalOpen, setIsOdcModalOpen] = useState(false);
  const [editingOdc, setEditingOdc] = useState(null);
  const [odcForm, setOdcForm] = useState({
    nama: "",
    lokasi: "",
    kapasitas: "8 Port / 96 Core",
    keterangan: "",
  });

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteTargetOdc, setDeleteTargetOdc] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  // Merge ODC Master with any ODCs existing in ODP data
  const allOdcs = useMemo(() => {
    const map = new Map();
    (odcList || []).forEach((odc) => {
      map.set(odc.nama, { ...odc });
    });

    (data || []).forEach((odp) => {
      if (odp.odc && !map.has(odp.odc)) {
        map.set(odp.odc, {
          id: `ODC-${odp.odc.replace(/\D/g, "") || Date.now()}`,
          nama: odp.odc,
          lokasi: "Wilayah Distribusi",
          kapasitas: "8 Port / 96 Core",
          keterangan: "Didaftarkan dari ODP",
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const numA = parseInt(a.nama.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.nama.replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });
  }, [odcList, data]);

  // Perkaya seluruh data ODP dengan utilisasi port real-time dari data Pelanggan Radius
  const enrichedData = useMemo(() => {
    return enrichOdpWithPortUtilization(data, pelangganList);
  }, [data, pelangganList]);

  // Statistik Port Seluruh Jaringan
  const portStats = useMemo(() => {
    return calculateNetworkPortStats(enrichedData);
  }, [enrichedData]);

  // Group ODPs by ODC
  const groupedData = useMemo(() => {
    const groups = {};

    allOdcs.forEach((odc) => {
      groups[odc.nama] = {
        odcMeta: odc,
        odps: [],
      };
    });

    (enrichedData || []).forEach((item) => {
      const key = item.odc || "TANPA ODC";
      if (!groups[key]) {
        groups[key] = {
          odcMeta: { id: key, nama: key, lokasi: "Wilayah Distribusi", kapasitas: "-" },
          odps: [],
        };
      }

      const matchSearch =
        !search ||
        item.nama?.toLowerCase().includes(search.toLowerCase()) ||
        item.odc?.toLowerCase().includes(search.toLowerCase()) ||
        item.keterangan?.toLowerCase().includes(search.toLowerCase()) ||
        groups[key].odcMeta.lokasi?.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        filterStatus === "ALL" ||
        (filterStatus === "Aman" && item.status === "Aman") ||
        (filterStatus === "Diperbaiki" && item.status === "Diperbaiki") ||
        (filterStatus === "Belum Dicek" && (!item.status || item.status === ""));

      const matchPort =
        filterPort === "ALL" ||
        (filterPort === "AVAILABLE" && !item.port_is_full) ||
        (filterPort === "FULL" && item.port_is_full);

      if (matchSearch && matchStatus && matchPort) {
        groups[key].odps.push(item);
      }
    });

    if (filterOdc !== "ALL") {
      return groups[filterOdc] ? { [filterOdc]: groups[filterOdc] } : {};
    }

    return groups;
  }, [allOdcs, enrichedData, search, filterStatus, filterOdc, filterPort]);

  const stats = {
    totalOdc: allOdcs.length,
    totalOdp: enrichedData.length,
    aman: enrichedData.filter((d) => d.status === "Aman").length,
    diperbaiki: enrichedData.filter((d) => d.status === "Diperbaiki").length,
    odcBermasalah: allOdcs.filter((odc) =>
      enrichedData.some((d) => d.odc === odc.nama && d.status === "Diperbaiki")
    ).length,
    ...portStats,
  };

  // Accordion controls
  const toggleOdc = (odc) => {
    setExpandedOdc((prev) => ({ ...prev, [odc]: !prev[odc] }));
  };

  const handleExpandAll = () => {
    const next = {};
    allOdcs.forEach((odc) => {
      next[odc.nama] = true;
    });
    setExpandedOdc(next);
  };

  const handleCollapseAll = () => {
    const next = {};
    allOdcs.forEach((odc) => {
      next[odc.nama] = false;
    });
    setExpandedOdc(next);
  };

  // ODC CRUD Handlers
  const handleOpenAddOdc = () => {
    setEditingOdc(null);
    setOdcForm({
      nama: `ODC ${allOdcs.length + 1}`,
      lokasi: "",
      kapasitas: "8 Port / 96 Core",
      keterangan: "",
    });
    setIsOdcModalOpen(true);
  };

  const handleOpenEditOdc = (odc) => {
    setEditingOdc(odc);
    setOdcForm({
      nama: odc.nama,
      lokasi: odc.lokasi || "",
      kapasitas: odc.kapasitas || "8 Port / 96 Core",
      keterangan: odc.keterangan || "",
    });
    setIsOdcModalOpen(true);
  };

  const handleSaveOdc = (e) => {
    e.preventDefault();
    const namaClean = odcForm.nama.trim();
    if (!namaClean) {
      showToast("error", "Nama ODC wajib diisi!");
      return;
    }

    if (editingOdc) {
      const oldName = editingOdc.nama;
      const updatedOdcList = allOdcs.map((o) =>
        o.nama === oldName ? { ...o, ...odcForm, nama: namaClean } : o
      );
      setOdcList(updatedOdcList);

      // Cascade update to child ODPs
      if (oldName !== namaClean) {
        setData((prev) =>
          prev.map((odp) => (odp.odc === oldName ? { ...odp, odc: namaClean } : odp))
        );
      }
      showToast("success", `Data ${namaClean} berhasil diperbarui.`);
    } else {
      if (allOdcs.some((o) => o.nama.toLowerCase() === namaClean.toLowerCase())) {
        showToast("error", `ODC dengan nama "${namaClean}" sudah ada!`);
        return;
      }
      const newOdc = {
        id: `ODC-${Date.now()}`,
        ...odcForm,
        nama: namaClean,
      };
      setOdcList([...allOdcs, newOdc]);
      showToast("success", `${namaClean} berhasil ditambahkan.`);
    }
    setIsOdcModalOpen(false);
  };

  const handleDeleteOdc = (odc) => {
    setDeleteTargetOdc(odc);
  };

  const confirmDeleteOdc = () => {
    if (!deleteTargetOdc) return;
    const childCount = data.filter((d) => d.odc === deleteTargetOdc.nama).length;
    if (childCount > 0) {
      setData((prev) => prev.filter((d) => d.odc !== deleteTargetOdc.nama));
    }
    setOdcList((prev) => prev.filter((o) => o.nama !== deleteTargetOdc.nama));
    showToast("success", `ODC "${deleteTargetOdc.nama}" berhasil dihapus.`);
    setDeleteTargetOdc(null);
  };

  // ODP CRUD Handlers
  const handleOpenAddOdp = (defaultOdc = "") => {
    setEditingOdp(null);
    const chosenOdc = defaultOdc || (allOdcs[0]?.nama || "ODC 1");
    const countInOdc = data.filter((d) => d.odc === chosenOdc).length + 1;
    const odcNumber = chosenOdc.replace(/\D/g, "") || "1";

    setOdpForm({
      odc: chosenOdc,
      nama: `ODP ${odcNumber}.${countInOdc}`,
      keterangan: "",
      status: "Aman",
      kapasitas: "8 Port",
    });
    setIsOdpModalOpen(true);
  };

  const handleOpenEditOdp = (odp) => {
    setEditingOdp(odp);
    setOdpForm({
      odc: odp.odc || allOdcs[0]?.nama || "ODC 1",
      nama: odp.nama || "",
      keterangan: odp.keterangan || "",
      status: odp.status || "Aman",
      kapasitas: odp.kapasitas || "8 Port",
    });
    setIsOdpModalOpen(true);
  };

  const handleSaveOdp = (e) => {
    e.preventDefault();
    if (!odpForm.nama.trim() || !odpForm.odc.trim()) {
      showToast("error", "Nama ODP dan ODC induk wajib diisi!");
      return;
    }

    if (editingOdp) {
      setData((prev) =>
        prev.map((item) => (item.id === editingOdp.id ? { ...item, ...odpForm } : item))
      );
      showToast("success", `ODP ${odpForm.nama} berhasil diperbarui.`);
    } else {
      const newItem = {
        id: Date.now(),
        ...odpForm,
      };
      setData((prev) => [newItem, ...prev]);
      showToast("success", `ODP ${odpForm.nama} berhasil ditambahkan ke ${odpForm.odc}.`);
    }
    setIsOdpModalOpen(false);
  };

  const handleToggleStatus = (item) => {
    const newStatus = item.status === "Aman" ? "Diperbaiki" : "Aman";
    setData((prev) =>
      prev.map((d) => (d.id === item.id ? { ...d, status: newStatus } : d))
    );
    showToast("success", `Status ${item.nama} diubah menjadi ${newStatus}.`);
  };

  const handleDeleteOdp = (item) => {
    setData((prev) => prev.filter((d) => d.id !== item.id));
    setDeleteConfirm(null);
    showToast("success", `ODP ${item.nama} telah dihapus.`);
  };

  const handleCreateJob = (item) => {
    navigate(`/pekerjaan?search=${encodeURIComponent(item.odc || item.nama)}`);
  };

  return (
    <div className="space-y-6">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <span>ODP / ODC</span>
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Monitoring hierarki ODC (Induk) dan ODP (Titik Distribusi Pelanggan)
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          {/* Switcher Mode Tampilan: Tabel vs Google Earth */}
          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center p-1 bg-gray-100 rounded-2xl border border-gray-200/90 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Hierarki</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("earth")}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === "earth"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-emerald-700"
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-300" />
              <span>Google Earth (Peta)</span>
            </button>
          </div>

          <button
            onClick={handleOpenAddOdc}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-[#0D1B4A] hover:bg-[#1a237e] text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-purple-300 shrink-0" />
            <span>+ Tambah ODC</span>
          </button>
          <button
            onClick={() => handleOpenAddOdp()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-[#F59E0B] hover:bg-amber-600 text-slate-900 font-bold rounded-xl text-xs sm:text-sm shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-900 shrink-0" />
            <span>+ Tambah ODP</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-4">
        {[
          { label: "Total ODC", value: stats.totalOdc, sub: "Induk Jaringan", bg: "bg-purple-50", color: "text-purple-700" },
          { label: "Total ODP", value: stats.totalOdp, sub: "Titik Sebaran", bg: "bg-white", color: "text-gray-900" },
          { label: "ODP Aman", value: stats.aman, sub: "Kondisi Normal", bg: "bg-emerald-50", color: "text-emerald-600" },
          { label: "ODP Diperbaiki", value: stats.diperbaiki, sub: "Perlu Tindakan", bg: "bg-amber-50", color: "text-amber-600" },
          { label: "ODC Bermasalah", value: stats.odcBermasalah, sub: "Ada ODP Gangguan", bg: "bg-rose-50", color: "text-rose-600" },
        ].map((s) => (
          <div
            key={s.label}
            className={`${s.bg} rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-2xs last:col-span-2 md:last:col-span-1`}
          >
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-xl sm:text-2xl font-black ${s.color} mt-0.5 sm:mt-1`}>{s.value}</p>
            <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Real-time Port Capacity & Utilization Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0D1B4A] to-slate-900 rounded-3xl p-4 sm:p-5 text-white shadow-md border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold shrink-0 border border-amber-400/30">
              <Network className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Kapasitas Port Real-Time Jaringan
                </h3>
                {stats.odpPenuhCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                    {stats.odpPenuhCount} ODP Penuh
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Kalkulasi otomatis dari <b>{pelangganList.length} pelanggan Radius</b> yang tersambung ke titik ODP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="text-right sm:text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Terpakai</span>
              <span className="text-lg font-black text-amber-400">{stats.totalTerpakai} Port</span>
            </div>
            <div className="w-px h-8 bg-slate-700 hidden sm:block" />
            <div className="text-right sm:text-center">
              <span className="text-[10px] uppercase font-bold text-rose-400 block">Isolir Billing</span>
              <span className="text-lg font-black text-rose-400">{stats.totalIsolirCount || 0} Port</span>
            </div>
            <div className="w-px h-8 bg-slate-700 hidden sm:block" />
            <div className="text-right sm:text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Sisa Bebas</span>
              <span className="text-lg font-black text-emerald-400">{stats.totalSisa} Port</span>
            </div>
            <div className="w-px h-8 bg-slate-700 hidden sm:block" />
            <div className="text-right sm:text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Kapasitas</span>
              <span className="text-lg font-black text-white">{stats.totalKapasitas} Port</span>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Tingkat Utilisasi Splitter: <b className="text-white">{stats.percentTotal}%</b></span>
            <span>{stats.odpKritisCount > 0 ? `⚠️ ${stats.odpKritisCount} ODP sisa 1 port` : "Semua kapasitas aman"}</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                stats.percentTotal > 85 ? "bg-rose-500" : stats.percentTotal > 65 ? "bg-amber-400" : "bg-emerald-500"
              }`}
              style={{ width: `${stats.percentTotal}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tampilan Google Earth GIS Map jika viewMode === 'earth' */}
      {viewMode === "earth" ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-950 via-slate-900 to-[#0D1B4A] p-4 rounded-3xl border border-emerald-500/30 text-white shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <Globe className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>Peta Satelit Google Earth GIS (ODP & ODC)</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-slate-950 tracking-wider">
                    ONLINE GIS
                  </span>
                </h3>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  Visualisasi citra satelit, sebaran tiang distribusi, jalur kabel fiber optik, dan pengukur jarak tarikan kabel dropcore.
                </p>
              </div>
            </div>
            <button
              onClick={() => setViewMode("table")}
              className="self-start sm:self-auto px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/20"
            >
              Tampilkan Tabel &rarr;
            </button>
          </div>

          {/* Banner jika dibuka dari Leads untuk Cek Coverage */}
          {paramLeadId && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 rounded-2xl text-amber-300 text-xs backdrop-blur-sm shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-extrabold text-white text-xs">
                    Mode Feasibility Survey untuk Lead: {paramNama || paramAlamat || `#${paramLeadId}`}
                  </p>
                  <p className="text-[11px] text-amber-200/80">
                    Klik titik rumah di peta atau gunakan hasil analisis, lalu klik &quot;+ Buat / Simpan ke Lead&quot; untuk memperbarui data lead.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/leads")}
                className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-3.5 py-2 sm:py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow cursor-pointer shrink-0 active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Leads</span>
              </button>
            </div>
          )}

          <OdpGoogleEarthMap
            allOdcs={allOdcs}
            odpList={enrichedData}
            pelangganList={pelangganList}
            onEditOdp={handleOpenEditOdp}
            onEditOdc={handleOpenEditOdc}
            onToggleStatus={handleToggleStatus}
            focusedNode={focusedNode}
            initialCoverageMode={Boolean(paramCoverage)}
            initialCoverageTarget={
              paramLat && paramLng
                ? {
                    lat: parseFloat(paramLat),
                    lng: parseFloat(paramLng),
                    label: paramAlamat || paramNama || `Lead: ${paramNama || "Calon Pelanggan"}`,
                  }
                : null
            }
            onSaveLead={handleSaveLeadFromCoverage}
          />
        </div>
      ) : (
        <>
          {/* Banner Promo Google Earth di Mode Tabel */}
          <div
            onClick={() => setViewMode("earth")}
            className="p-3.5 bg-gradient-to-r from-emerald-900 via-teal-900 to-[#0D1B4A] rounded-2xl border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white shadow-md cursor-pointer hover:shadow-lg hover:scale-[1.003] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 group-hover:scale-110 transition-transform shrink-0">
                <Globe className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white">Lihat Sebaran ODP & ODC di Peta Google Earth</h4>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-400 text-slate-950 text-[9px] font-black uppercase">
                    PETA SATELIT
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">
                  Buka citra satelit resolusi tinggi, pantau jalur kabel fiber, dan ukur jarak kabel dropcore ke pelanggan.
                </p>
              </div>
            </div>
            <span className="self-start sm:self-auto px-3.5 py-1.5 bg-emerald-500 group-hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-colors shadow shrink-0 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>Buka Peta Satelit &rarr;</span>
            </span>
          </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari ODP, ODC, atau Keterangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter ODC */}
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <select
              value={filterOdc}
              onChange={(e) => setFilterOdc(e.target.value)}
              className="bg-transparent outline-none font-semibold text-gray-700 cursor-pointer"
            >
              <option value="ALL">Semua ODC ({allOdcs.length})</option>
              {allOdcs.map((o) => (
                <option key={o.id || o.nama} value={o.nama}>
                  {o.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent outline-none font-semibold text-gray-700 cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="Aman">🟢 Aman</option>
              <option value="Diperbaiki">🟡 Diperbaiki</option>
              <option value="Belum Dicek">⚪ Belum Dicek</option>
            </select>
          </div>

          {/* Filter Kapasitas Port */}
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold">
            <Network className="w-3.5 h-3.5 text-emerald-600" />
            <select
              value={filterPort}
              onChange={(e) => setFilterPort(e.target.value)}
              className="bg-transparent outline-none font-semibold text-gray-700 cursor-pointer"
            >
              <option value="ALL">Semua Port</option>
              <option value="AVAILABLE">🟢 Port Tersedia</option>
              <option value="FULL">🔴 Port Penuh ({stats.odpPenuhCount})</option>
            </select>
          </div>

          {/* Accordion Expand/Collapse buttons */}
          <div className="flex items-center gap-1 border-l pl-2 border-gray-200">
            <button
              onClick={handleExpandAll}
              title="Buka Semua ODC"
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Buka Semua
            </button>
            <button
              onClick={handleCollapseAll}
              title="Tutup Semua ODC"
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Tutup Semua
            </button>
          </div>
        </div>
      </div>

      {/* ODC Accordions & ODP Tables */}
      <div className="space-y-4">
        {Object.entries(groupedData).length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <Network className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-700">Tidak ada data ODC / ODP yang cocok</p>
            <p className="text-xs text-gray-400 mt-1">
              Coba sesuaikan kata kunci pencarian atau filter yang dipilih
            </p>
          </div>
        ) : (
          Object.entries(groupedData).map(([odcName, group]) => {
            const isExpanded = expandedOdc[odcName] !== false;
            const items = group.odps;
            const odcMeta = group.odcMeta;
            const issueCount = items.filter((i) => i.status === "Diperbaiki").length;

            return (
              <div
                key={odcName}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all"
              >
                {/* ODC Header */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/70">
                  <div
                    onClick={() => toggleOdc(odcName)}
                    className="flex items-center gap-3 cursor-pointer flex-1"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#0D1B4A] flex items-center justify-center shadow-sm shrink-0">
                      <Network className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-gray-900">{odcName}</h3>
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-xs font-bold border border-purple-200">
                          {items.length} ODP
                        </span>
                        {issueCount > 0 ? (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-xs font-bold border border-amber-200 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            {issueCount} Perlu Perbaikan
                          </span>
                        ) : items.length > 0 ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Semua Aman
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-xs font-medium">
                            Belum Ada ODP
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                        {odcMeta.lokasi && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {odcMeta.lokasi}
                          </span>
                        )}
                        {odcMeta.kapasitas && (
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-gray-400" />
                            Kapasitas: {odcMeta.kapasitas}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions on ODC */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddOdp(odcName);
                      }}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                      title={`Tambah ODP baru di bawah ${odcName}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ ODP</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditOdc(odcMeta);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Informasi ODC"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOdc(odcMeta);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus ODC"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleOdc(odcName)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ml-1"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* ODP Table inside ODC */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    {items.length === 0 ? (
                      <div className="p-8 text-center bg-gray-50/50">
                        <Network className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-gray-500">
                          Belum ada ODP di dalam {odcName}
                        </p>
                        <button
                          onClick={() => handleOpenAddOdp(odcName)}
                          className="mt-2.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-sm transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          Tambahkan ODP Pertama
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Mobile ODP Cards */}
                        <div className="md:hidden divide-y divide-gray-100">
                          {items.map((item) => (
                            <div key={item.id} className="p-3.5 space-y-2.5 hover:bg-gray-50/50 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {item.status === "Aman" ? (
                                    <Wifi className="w-4 h-4 text-emerald-500 shrink-0" />
                                  ) : item.status === "Diperbaiki" ? (
                                    <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
                                  ) : (
                                    <Wifi className="w-4 h-4 text-gray-300 shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-gray-900 text-sm truncate">{item.nama}</h4>
                                    <p className="text-[10px] text-gray-400">Induk: {odcName} · {item.kapasitas || "8 Port"}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => handleJumpToMap(item)}
                                    className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                    title="Fokuskan di Peta Satelit"
                                  >
                                    <MapPin className="w-3.5 h-3.5" />
                                  </button>
                                  <a
                                    href={`https://earth.google.com/web/search/${encodeURIComponent(item.nama + ' Pontianak')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="min-w-[32px] min-h-[32px] text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center justify-center active:scale-95"
                                      title="Google Earth 3D"
                                    >
                                      <Globe className="w-4 h-4" />
                                    </a>
                                    <button
                                      onClick={() => handleOpenEditOdp(item)}
                                      className="min-w-[32px] min-h-[32px] text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center active:scale-95"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirm(item)}
                                      className="min-w-[32px] min-h-[32px] text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center active:scale-95"
                                      title="Hapus"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                              {item.keterangan && (
                                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg leading-relaxed">
                                  {item.keterangan}
                                </p>
                              )}

                              {/* Port Utilization Bar Mobile */}
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-700">
                                    Port: <b>{item.port_terpakai || 0}</b> / {item.port_kapasitas || 8}
                                  </span>
                                  {item.port_is_full ? (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                                      ⛔ PENUH (0 Sisa)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      Sisa {item.port_sisa} Port
                                    </span>
                                  )}
                                </div>
                                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      item.port_is_full ? "bg-rose-500" : item.port_is_near_full ? "bg-amber-500" : "bg-emerald-500"
                                    }`}
                                    style={{ width: `${item.port_percent || 0}%` }}
                                  />
                                </div>
                                {item.connected_customers?.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedOdpCustomers(item)}
                                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer pt-0.5"
                                  >
                                    <Users className="w-3 h-3" />
                                    <span>{item.connected_customers.length} Pelanggan Terdaftar (Lihat)</span>
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-50">
                                <button
                                  onClick={() => handleToggleStatus(item)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95 ${
                                    item.status === "Aman"
                                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                      : item.status === "Diperbaiki"
                                      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                      : "bg-gray-50 text-gray-500 ring-1 ring-gray-200"
                                  }`}
                                >
                                  {item.status === "Aman" ? "🟢 Normal" : "🟡 Perlu Perbaikan"}
                                </button>

                                {item.status === "Diperbaiki" && (
                                  <button
                                    onClick={() => handleCreateJob(item)}
                                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                                  >
                                    <Wrench className="w-3 h-3 text-purple-600" />
                                    <span>Buat Tiket</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50/90 text-left">
                              <tr>
                                <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                                  Nama & Titik ODP
                                </th>
                                <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                                  Keterangan / Lokasi Tiang
                                </th>
                                <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                                  Kapasitas Port Real-Time
                                </th>
                                <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                                  Status Kelayakan
                                </th>
                                <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">
                                  Aksi
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {items.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2.5">
                                      {item.status === "Aman" ? (
                                        <Wifi className="w-4 h-4 text-emerald-500 shrink-0" />
                                      ) : item.status === "Diperbaiki" ? (
                                        <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
                                      ) : (
                                        <Wifi className="w-4 h-4 text-gray-300 shrink-0" />
                                      )}
                                      <div>
                                        <span className="font-bold text-gray-800">{item.nama}</span>
                                        <span className="text-[10px] text-gray-400 block">
                                          Induk: {odcName}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3 text-gray-600 text-xs">
                                    {item.keterangan || "-"}
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="space-y-1.5 max-w-[200px]">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-800">
                                          {item.port_terpakai || 0} / {item.port_kapasitas || 8} Port
                                        </span>
                                        {item.port_is_full ? (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                                            ⛔ PENUH
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            Sisa {item.port_sisa}
                                          </span>
                                        )}
                                      </div>
                                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${
                                            item.port_is_full ? "bg-rose-500" : item.port_is_near_full ? "bg-amber-500" : "bg-emerald-500"
                                          }`}
                                          style={{ width: `${item.port_percent || 0}%` }}
                                        />
                                      </div>
                                      {item.connected_customers?.length > 0 ? (
                                        <button
                                          type="button"
                                          onClick={() => setSelectedOdpCustomers(item)}
                                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer hover:underline"
                                        >
                                          <Users className="w-3 h-3" />
                                          <span>{item.connected_customers.length} Pelanggan Aktif</span>
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 block">Belum ada pelanggan</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleToggleStatus(item)}
                                        title="Klik untuk ubah status cepat"
                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:scale-105 ${
                                          item.status === "Aman"
                                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                                            : item.status === "Diperbaiki"
                                            ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
                                            : "bg-gray-50 text-gray-500 ring-1 ring-gray-200 hover:bg-gray-100"
                                        }`}
                                      >
                                        {item.status || "Belum Dicek"}
                                      </button>
                                      {item.status === "Diperbaiki" && (
                                        <button
                                          onClick={() => handleCreateJob(item)}
                                          className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all"
                                          title="Buka menu Pekerjaan untuk buat tiket perbaikan khusus ODP ini"
                                        >
                                          <Wrench className="w-3 h-3 text-purple-600" />
                                          Buat Tiket
                                        </button>
                                      )}
                                    </div>
                                  </td>
                              <td className="px-5 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleJumpToMap(item)}
                                    className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                    title="Fokuskan ODP ini di Peta Satelit"
                                  >
                                    <MapPin className="w-3.5 h-3.5" />
                                  </button>
                                  <a
                                    href={`https://earth.google.com/web/search/${encodeURIComponent(item.nama + ' Pontianak')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center"
                                    title="Buka Titik ODP di Google Earth 3D"
                                  >
                                    <Globe className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    onClick={() => handleOpenEditOdp(item)}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                    title="Edit ODP"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(item)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus ODP"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      </>
      )}

      {/* Modal Tambah / Edit ODC */}
      {isOdcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            {/* Mobile Drag Indicator Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 sm:hidden" />
            <div className="px-6 py-4 bg-[#0D1B4A] text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-300" />
                {editingOdc ? "Edit Data ODC" : "Tambah ODC Baru"}
              </h3>
              <button
                onClick={() => setIsOdcModalOpen(false)}
                className="text-white/60 hover:text-white transition-colors p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOdc} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Nama ODC <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ODC 05 atau ODC BANDARA"
                  value={odcForm.nama}
                  onChange={(e) => setOdcForm({ ...odcForm, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Wilayah / Lokasi Distribusi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jl. Ahmad Yani - Samping Gardu PLN"
                  value={odcForm.lokasi}
                  onChange={(e) => setOdcForm({ ...odcForm, lokasi: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Kapasitas Splitter / Core
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 8 Port / 96 Core"
                  value={odcForm.kapasitas}
                  onChange={(e) => setOdcForm({ ...odcForm, kapasitas: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Keterangan Tambahan
                </label>
                <textarea
                  placeholder="Catatan teknis ODC..."
                  value={odcForm.keterangan}
                  onChange={(e) => setOdcForm({ ...odcForm, keterangan: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none resize-none"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsOdcModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0D1B4A] hover:bg-[#1a237e] text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                >
                  {editingOdc ? "Simpan Perubahan" : "Tambahkan ODC"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit ODP */}
      {isOdpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            {/* Mobile Drag Indicator Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 sm:hidden" />
            <div className="px-6 py-4 bg-[#F59E0B] text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Network className="w-4 h-4 text-white" />
                {editingOdp ? "Edit Data ODP" : "Tambah ODP Baru"}
              </h3>
              <button
                onClick={() => setIsOdpModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOdp} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>
                    1. PILIH ODC INDUK <span className="text-red-500">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOdpModalOpen(false);
                      handleOpenAddOdc();
                    }}
                    className="text-[10px] text-purple-700 hover:underline font-bold"
                  >
                    + Buat ODC Baru
                  </button>
                </label>
                <select
                  required
                  value={odpForm.odc}
                  onChange={(e) => setOdpForm({ ...odpForm, odc: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-purple-200 bg-purple-50/30 rounded-xl text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-purple-400 outline-none"
                >
                  <option value="">-- Pilih ODC Induk --</option>
                  {allOdcs.map((o) => (
                    <option key={o.id || o.nama} value={o.nama}>
                      {o.nama} {o.lokasi ? `(${o.lokasi})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  2. NAMA ODP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ODP 1.2 - M. Sarno"
                  value={odpForm.nama}
                  onChange={(e) => setOdpForm({ ...odpForm, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  3. LOKASI TIANG / KETERANGAN
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Depan Rumah No. 12 / Tiang PLN #42"
                  value={odpForm.keterangan}
                  onChange={(e) => setOdpForm({ ...odpForm, keterangan: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    KAPASITAS PORT
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 8 Port"
                    value={odpForm.kapasitas}
                    onChange={(e) => setOdpForm({ ...odpForm, kapasitas: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    STATUS KELAYAKAN
                  </label>
                  <select
                    value={odpForm.status}
                    onChange={(e) => setOdpForm({ ...odpForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none bg-white"
                  >
                    <option value="Aman">🟢 Aman</option>
                    <option value="Diperbaiki">🟡 Diperbaiki (Gangguan / LOS)</option>
                    <option value="">⚪ Belum Dicek</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsOdpModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F59E0B] hover:bg-[#d97706] text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                >
                  {editingOdp ? "Simpan Perubahan" : "Tambahkan ODP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus ODP */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => handleDeleteOdp(deleteConfirm)}
        title="Hapus ODP Ini?"
        message={
          deleteConfirm
            ? `Apakah Anda yakin ingin menghapus ${deleteConfirm.nama} (${deleteConfirm.odc})? Seluruh data riwayat port akan dihapus.`
            : ""
        }
        confirmText="Hapus ODP"
        variant="danger"
      />

      {/* Modal Konfirmasi Hapus ODC */}
      <ConfirmModal
        isOpen={!!deleteTargetOdc}
        onClose={() => setDeleteTargetOdc(null)}
        onConfirm={confirmDeleteOdc}
        title="Hapus ODC Induk?"
        message={
          deleteTargetOdc
            ? `Apakah Anda yakin ingin menghapus ODC "${deleteTargetOdc.nama}"?` +
              (data.filter((d) => d.odc === deleteTargetOdc.nama).length > 0
                ? ` PERINGATAN: ODC ini masih memiliki ${data.filter((d) => d.odc === deleteTargetOdc.nama).length} ODP di dalamnya yang juga akan ikut dihapus!`
                : "")
            : ""
        }
        confirmText="Hapus ODC"
        variant="danger"
      />

      {/* Modal Daftar Pelanggan yang Terhubung ke ODP */}
      {selectedOdpCustomers && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            {/* Mobile Drag Indicator Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 sm:hidden" />
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Pelanggan Terhubung di {selectedOdpCustomers.nama}
                  </h3>
                  <p className="text-xs text-slate-500">
                    ODC: {selectedOdpCustomers.odc} · Terpakai: {selectedOdpCustomers.port_terpakai} / {selectedOdpCustomers.port_kapasitas} Port
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOdpCustomers(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto divide-y divide-slate-100 flex-1 space-y-2">
              {selectedOdpCustomers.connected_customers && selectedOdpCustomers.connected_customers.length > 0 ? (
                selectedOdpCustomers.connected_customers.map((cust, idx) => (
                  <div key={cust.id || idx} className="pt-2 pb-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{cust.nama}</span>
                        {cust.status === "ISOLIR" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            ISOLIR BILLING (Port Terblokir Sistem)
                          </span>
                        ) : (
                          <span className={`px-2 py-0.2 rounded text-[10px] font-black uppercase ${
                            cust.status === "AKTIF" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {cust.status}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 font-medium">{cust.paket}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{cust.alamat}</p>
                    </div>
                    {cust.telepon && (
                      <a
                        href={`https://wa.me/${cust.telepon.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 shrink-0"
                      >
                        WA
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Belum ada data pelanggan yang terhubung ke ODP ini.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOdpCustomers(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
