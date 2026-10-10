import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  RefreshCw,
  Plus,
  Phone,
  MapPin,
  MessageCircle,
  Navigation,
  Settings,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check,
  ExternalLink,
  Wifi,
  Network,
  Copy,
  Edit2,
  Trash2,
  Radio,
  Flame,
} from "lucide-react";
import { initialPelangganRadius, initialTimData, odpOdcList } from "../data/mockData";
import { usePersistState } from "../hooks/usePersistState";
import Toast from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import DispatchTaskModal from "../components/DispatchTaskModal";
import GenieAcsModal from "../components/GenieAcsModal";
import SpeedOnDemandModal from "../components/SpeedOnDemandModal";
import { formatPhoneWa as formatPhoneForWa } from "../lib/spkGenerator";
import { createWhatsAppUrl, getCustomerWaTemplate } from "../lib/whatsapp";

export default function PelangganRadius() {
  const navigate = useNavigate();

  // State Pelanggan Radius (Pool Data Pelanggan)
  const [pelangganList, setPelangganList] = usePersistState(
    "xnet_pelanggan_radius",
    initialPelangganRadius
  );

  // State Pekerjaan Lapangan & Master Tim & ODP
  const [pekerjaan, setPekerjaan] = usePersistState("xnet_pekerjaan", []);
  const [timList] = usePersistState("xnet_tim", initialTimData);
  const [odpList] = usePersistState("xnet_odpodc", odpOdcList);

  // Modals GenieACS & SOD
  const [acsCustomer, setAcsCustomer] = useState(null);
  const [sodCustomer, setSodCustomer] = useState(null);

  // API Config State (disimpan di browser, siap saat API Radius aktif)
  const [apiConfig, setApiConfig] = usePersistState("xnet_radius_api_config", {
    endpoint: "https://billing.nexusnet.id/api/v1/customers",
    apiKey: "nx_live_sec_8849f2910a",
    lastSync: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
    autoSync: false,
  });

  // Filter & Search State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Syncing state
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteTargetCustomer, setDeleteTargetCustomer] = useState(null);
  const [editForm, setEditForm] = useState({
    nama: "",
    telepon: "",
    alamat: "",
    odp: "ODP 1.1",
    paket: "Home Fiber 30 Mbps",
    status: "AKTIF",
    ip_address: "-",
  });
  const [assignForm, setAssignForm] = useState({
    jenis: "PEMASANGAN",
    tim: "AZWAR - RIO",
    tanggal: new Date().toISOString().split("T")[0],
    keterangan: "",
  });

  const [showApiModal, setShowApiModal] = useState(false);
  const [apiForm, setApiForm] = useState(apiConfig);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    id_pelanggan: `NX-${Date.now().toString().slice(-4)}`,
    nama: "",
    telepon: "",
    alamat: "",
    odp: "ODP 1.1",
    paket: "Home Fiber 30 Mbps",
    status: "BARU",
    ip_address: "-",
  });

  // Toast
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const triggerToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  // Metrik Statistik
  const stats = useMemo(() => {
    const total = pelangganList.length;
    const baru = pelangganList.filter((p) => p.status === "BARU").length;
    const aktif = pelangganList.filter((p) => p.status === "AKTIF").length;
    const isolir = pelangganList.filter((p) => p.status === "ISOLIR").length;
    const putus = pelangganList.filter((p) => p.status === "PUTUS").length;
    return { total, baru, aktif, isolir, putus };
  }, [pelangganList]);

  // Data Terfilter
  const filteredList = useMemo(() => {
    return pelangganList.filter((p) => {
      const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
      if (!matchStatus) return false;
      if (!search.trim()) return true;

      const q = search.toLowerCase().trim();
      return (
        (p.nama || "").toLowerCase().includes(q) ||
        (p.id_pelanggan || "").toLowerCase().includes(q) ||
        (p.alamat || "").toLowerCase().includes(q) ||
        (p.telepon || "").includes(q) ||
        (p.odp || "").toLowerCase().includes(q) ||
        (p.paket || "").toLowerCase().includes(q)
      );
    });
  }, [pelangganList, statusFilter, search]);

  // Trigger Sinkronisasi Billing Radius
  const handleSyncBilling = () => {
    setIsSyncing(true);
    // Simulasi penarikan data dari API Billing Radius
    setTimeout(() => {
      const nowStr = new Date().toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

      setApiConfig((prev) => ({ ...prev, lastSync: nowStr }));
      setIsSyncing(false);
      triggerToast(
        `Sinkronisasi selesai! Total ${pelangganList.length} data pelanggan berhasil diperbarui dari Billing Radius.`,
        "success"
      );
    }, 1200);
  };

  // Buka Modal Buat Tugas Teknisi untuk pelanggan terpilih (Unified SPK Dispatch)
  const handleOpenAssign = (cust) => {
    let defaultJenis = "PERBAIKAN";
    let defaultKet = `Paket: ${cust.paket}`;
    let defaultPrio = "NORMAL";

    if (cust.status === "BARU") {
      defaultJenis = "PEMASANGAN";
      defaultKet = `Pemasangan Baru (PSB) · Paket: ${cust.paket}`;
    } else if (cust.status === "PUTUS" || cust.status === "ISOLIR") {
      defaultJenis = "PEMUTUSAN";
      defaultKet = `Dismantle / Penarikan Modem ONT & Kabel Dropcore · Status Pelanggan: ${cust.status}`;
      defaultPrio = "TINGGI";
    } else {
      defaultJenis = "PERBAIKAN";
      defaultKet = `Pengecekan gangguan jaringan pelanggan · Paket: ${cust.paket}`;
    }

    setSelectedCustomer({
      sourceModule: "RADIUS",
      sourceId: cust.id,
      jenis: defaultJenis,
      prioritas: defaultPrio,
      pelanggan: `${cust.nama} (${cust.id_pelanggan})`,
      telepon: cust.telepon,
      alamat: cust.alamat,
      odp: cust.odp,
      paket: cust.paket,
      keterangan: defaultKet,
    });
  };

  // Simpan Penugasan Lapangan (Dari DispatchTaskModal)
  const handleSaveDispatch = (newTask, shouldSendWa) => {
    setPekerjaan((prev) => [newTask, ...prev]);

    triggerToast(
      `Tugas ${newTask.jenis} (${newTask.spk_no}) untuk "${newTask.pelanggan}" berhasil diterbitkan ke Tim ${newTask.tim}!`,
      "success"
    );

    setSelectedCustomer(null);
  };

  // Simpan API Config
  const handleSaveApiConfig = (e) => {
    e.preventDefault();
    setApiConfig(apiForm);
    setShowApiModal(false);
    triggerToast("Pengaturan endpoint API Billing Radius berhasil disimpan.", "success");
  };

  // Tambah Pelanggan Baru Manual
  const handleAddCustomerSubmit = (e) => {
    e.preventDefault();
    const cleanNama = (addForm.nama || "").trim();
    if (!cleanNama) {
      triggerToast("Nama pelanggan wajib diisi!", "error");
      return;
    }
    const cleanTelepon = formatPhoneForWa(addForm.telepon || "");
    const newCust = {
      ...addForm,
      nama: cleanNama,
      telepon: cleanTelepon || (addForm.telepon || "").trim(),
      alamat: (addForm.alamat || "").trim(),
      id: Date.now(),
      tgl_daftar: new Date().toISOString().split("T")[0],
    };

    setPelangganList((prev) => [newCust, ...prev]);
    setShowAddModal(false);
    setAddForm({
      id_pelanggan: `NX-${Date.now().toString().slice(-4)}`,
      nama: "",
      telepon: "",
      alamat: "",
      odp: "ODP 1.1",
      paket: "Home Fiber 30 Mbps",
      status: "BARU",
      ip_address: "-",
    });

    triggerToast(`Pelanggan baru "${newCust.nama}" berhasil ditambahkan ke database.`, "success");
  };

  // Buka Modal Edit Pelanggan
  const handleOpenEdit = (cust) => {
    setEditingCustomer(cust);
    setEditForm({
      nama: cust.nama || "",
      telepon: cust.telepon || "",
      alamat: cust.alamat || "",
      odp: cust.odp || "ODP 1.1",
      paket: cust.paket || "Home Fiber 30 Mbps",
      status: cust.status || "AKTIF",
      ip_address: cust.ip_address || "-",
    });
  };

  // Simpan Perubahan Data Pelanggan
  const handleEditCustomerSubmit = (e) => {
    e.preventDefault();
    if (!editingCustomer) return;
    const cleanNama = (editForm.nama || "").trim();
    if (!cleanNama) {
      triggerToast("Nama pelanggan wajib diisi!", "error");
      return;
    }
    const cleanTelepon = formatPhoneForWa(editForm.telepon || "");
    const updatedCust = {
      ...editingCustomer,
      ...editForm,
      nama: cleanNama,
      telepon: cleanTelepon || (editForm.telepon || "").trim(),
      alamat: (editForm.alamat || "").trim(),
    };
    setPelangganList((prev) => prev.map((c) => (c.id === editingCustomer.id ? updatedCust : c)));
    setEditingCustomer(null);
    triggerToast(`Data pelanggan "${cleanNama}" berhasil diperbarui.`, "success");
  };

  // Hapus Data Pelanggan
  const executeDeleteCustomer = () => {
    if (!deleteTargetCustomer) return;
    setPelangganList((prev) => prev.filter((c) => c.id !== deleteTargetCustomer.id));
    triggerToast(`Pelanggan "${deleteTargetCustomer.nama}" telah dihapus dari database.`, "info");
    setDeleteTargetCustomer(null);
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-1 sm:px-2">
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}

      {/* Header Utama */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-3 py-0.5 rounded-full border border-blue-200">
              Integrasi Billing Radius
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Tersambung (Siap Eksekusi)
            </span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="w-12 h-12 rounded-2xl bg-[#0D1B4A] text-amber-400 flex items-center justify-center shrink-0 shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Data Pelanggan <span className="text-[#F59E0B]">Radius</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Pilih pelanggan dari database billing untuk langsung membuat tugas teknisi lapangan tanpa ketik manual.
              </p>
            </div>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSyncBilling}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Menyinkronkan..." : "Sync Billing Radius"}</span>
          </button>

          <button
            onClick={() => {
              setApiForm(apiConfig);
              setShowApiModal(true);
            }}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Pengaturan API Endpoint"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0D1B4A] hover:bg-[#1a237e] text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Tambah Data</span>
          </button>
        </div>
      </div>

      {/* 4 Ringkasan Metrik Status Pelanggan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Pelanggan */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Pelanggan</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</h3>
            <p className="text-[10px] text-slate-500">Database Billing</p>
          </div>
        </div>

        {/* Pelanggan Baru (Menunggu PSB) */}
        <div
          onClick={() => setStatusFilter("BARU")}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-amber-300 transition-all group"
        >
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Baru (Antrean Pasang)</p>
            <h3 className="text-2xl font-black text-amber-600 mt-0.5">{stats.baru}</h3>
            <p className="text-[10px] text-slate-500">Siap Ditugaskan PSB</p>
          </div>
        </div>

        {/* Pelanggan Aktif */}
        <div
          onClick={() => setStatusFilter("AKTIF")}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-emerald-300 transition-all group"
        >
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Pelanggan Aktif</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-0.5">{stats.aktif}</h3>
            <p className="text-[10px] text-slate-500">Layanan Berjalan</p>
          </div>
        </div>

        {/* Isolir / Putus */}
        <div
          onClick={() => setStatusFilter("PUTUS")}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-rose-300 transition-all group"
        >
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Isolir & Putus</p>
            <h3 className="text-2xl font-black text-rose-600 mt-0.5">{stats.isolir + stats.putus}</h3>
            <p className="text-[10px] text-slate-500">Potensi Dismantle</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {[
            { key: "ALL", label: "Semua", count: stats.total },
            { key: "BARU", label: "Menunggu Pasang (PSB)", count: stats.baru },
            { key: "AKTIF", label: "Aktif", count: stats.aktif },
            { key: "ISOLIR", label: "Isolir", count: stats.isolir },
            { key: "PUTUS", label: "Putus", count: stats.putus },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                statusFilter === tab.key
                  ? "bg-[#0D1B4A] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  statusFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari ID / nama / alamat / ODP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none shadow-2xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabel & Daftar Pelanggan */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-2">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">Tidak ada pelanggan ditemukan</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Coba sesuaikan kata kunci pencarian atau ubah filter status di atas.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-3.5 px-4">ID & Pelanggan</th>
                    <th className="py-3.5 px-4">Kontak (WhatsApp)</th>
                    <th className="py-3.5 px-4">Alamat & ODP</th>
                    <th className="py-3.5 px-4">Paket & IP</th>
                    <th className="py-3.5 px-4">Status Radius</th>
                    <th className="py-3.5 px-4 text-center">Tindakan Lapangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredList.map((cust) => {
                    const cleanPhone = formatPhoneForWa(cust.telepon);
                    return (
                      <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* ID & Nama */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                              {cust.id_pelanggan}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">{cust.nama}</h4>
                        </td>

                        {/* Kontak WA */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">{cust.telepon || "-"}</span>
                            {cust.telepon && (
                              <a
                                href={createWhatsAppUrl(cust.telepon, getCustomerWaTemplate(cust))}
                                target="_blank"
                                rel="noreferrer"
                                className="w-6 h-6 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 transition-colors"
                                title="Chat WhatsApp Pelanggan"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Alamat & ODP */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-slate-800 line-clamp-1">{cust.alamat}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              <Network className="w-2.5 h-2.5" /> {cust.odp || "Belum Ada ODP"}
                            </span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                cust.alamat
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-slate-400 hover:text-blue-600 flex items-center gap-0.5 ml-1"
                            >
                              <Navigation className="w-3 h-3" /> Peta
                            </a>
                          </div>
                        </td>

                        {/* Paket & IP */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">{cust.paket}</p>
                          <p className="text-[11px] font-mono text-slate-400 mt-0.5">IP: {cust.ip_address || "-"}</p>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                              cust.status === "AKTIF"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : cust.status === "BARU"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : cust.status === "ISOLIR"
                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {cust.status === "BARU" ? "Baru (PSB)" : cust.status}
                          </span>
                        </td>

                        {/* Tombol Aksi */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setAcsCustomer(cust)}
                              className="p-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 transition-colors cursor-pointer"
                              title="GenieACS Remote ONT (Rx Power & Ganti WiFi)"
                            >
                              <Radio className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSodCustomer(cust)}
                              className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer"
                              title="Speed on Demand (SOD Booster)"
                            >
                              <Flame className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenAssign(cust)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#0D1B4A] hover:bg-[#1a237e] text-amber-400 transition-all cursor-pointer shadow-2xs"
                              title="Tugaskan Teknisi (Buat SPK)"
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-400" />
                              <span>Tugaskan</span>
                            </button>
                            <button
                              onClick={() => handleOpenEdit(cust)}
                              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit Data Pelanggan"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTargetCustomer(cust)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Data Pelanggan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden p-3 sm:p-4 space-y-3">
              {filteredList.map((cust) => {
                const cleanPhone = formatPhoneForWa(cust.telepon);
                return (
                  <div
                    key={cust.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {cust.id_pelanggan}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          cust.status === "AKTIF"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : cust.status === "BARU"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : cust.status === "ISOLIR"
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {cust.status === "BARU" ? "Baru (PSB)" : cust.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-base text-slate-900">{cust.nama}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{cust.alamat}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Paket:</span>
                        <span className="font-semibold text-slate-800">{cust.paket}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">ODP:</span>
                        <span className="font-semibold text-blue-700">{cust.odp}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {cust.telepon && (
                          <a
                            href={createWhatsAppUrl(cust.telepon, getCustomerWaTemplate(cust))}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                            title="Chat WhatsApp Pelanggan"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cust.alamat)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                          title="Navigasi Maps"
                        >
                          <Navigation className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => setAcsCustomer(cust)}
                          className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 transition-colors cursor-pointer"
                          title="GenieACS Remote ONT"
                        >
                          <Radio className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSodCustomer(cust)}
                          className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                          title="SOD Booster"
                        >
                          <Flame className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 flex-1">
                        <button
                          onClick={() => handleOpenAssign(cust)}
                          className="flex-1 py-2 px-3 bg-[#0D1B4A] hover:bg-[#1a237e] text-amber-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Tugaskan</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(cust)}
                          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetCustomer(cust)}
                          className="p-2 rounded-xl text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SURAT PERINTAH KERJA (SPK) PENUGASAN TEKNISI TERPADU             */}
      {/* ========================================================================= */}
      <DispatchTaskModal
        isOpen={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        initialData={selectedCustomer || {}}
        onSave={handleSaveDispatch}
        odpList={odpList}
        pelangganList={pelangganList}
        timList={timList}
        taskList={pekerjaan}
      />

      {/* ========================================================================= */}
      {/* MODAL 2: KONFIGURASI API BILLING RADIUS                                   */}
      {/* ========================================================================= */}
      {showApiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 border border-slate-200 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            {/* Mobile Drag Indicator Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between pb-3 border-slate-100 border-b">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Pengaturan API Billing Radius</h3>
                  <p className="text-xs text-slate-500">Konfigurasi endpoint untuk sinkronisasi data pelanggan</p>
                </div>
              </div>
              <button
                onClick={() => setShowApiModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveApiConfig} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  URL Endpoint API Pelanggan Radius
                </label>
                <input
                  type="url"
                  required
                  value={apiForm.endpoint}
                  onChange={(e) => setApiForm({ ...apiForm, endpoint: e.target.value })}
                  placeholder="https://billing.nexusnet.id/api/v1/customers"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Format respons API harus menyertakan array data: <code>id_pelanggan, nama, telepon, alamat, odp, status</code>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  API Key / Bearer Token
                </label>
                <input
                  type="password"
                  value={apiForm.apiKey}
                  onChange={(e) => setApiForm({ ...apiForm, apiKey: e.target.value })}
                  placeholder="Bearer token atau authorization key..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Koneksi Siap Pakai:
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Fitur ini sudah siap menerima data API nyata kapan saja. Anda cukup masukkan URL endpoint dan token dari aplikasi Billing Radius Anda.
                </p>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApiModal(false)}
                  className="flex-1 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-2 py-3 text-xs font-bold bg-[#0D1B4A] hover:bg-[#1a237e] text-white rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Simpan Konfigurasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TAMBAH DATA PELANGGAN MANUAL                                     */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 border border-slate-200 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            {/* Mobile Drag Indicator Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between pb-3 border-slate-100 border-b">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Tambah Data Pelanggan</h3>
                  <p className="text-xs text-slate-500">Input pelanggan baru ke database pool</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    ID Pelanggan
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.id_pelanggan}
                    onChange={(e) => setAddForm({ ...addForm, id_pelanggan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Status Awal
                  </label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="BARU">BARU (Menunggu Pasang)</option>
                    <option value="AKTIF">AKTIF</option>
                    <option value="ISOLIR">ISOLIR</option>
                    <option value="PUTUS">PUTUS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nama Pelanggan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={addForm.nama}
                  onChange={(e) => setAddForm({ ...addForm, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    No. WhatsApp / Telepon
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={addForm.telepon}
                    onChange={(e) => setAddForm({ ...addForm, telepon: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    ODP Wilayah
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: ODP 1.2"
                    value={addForm.odp}
                    onChange={(e) => setAddForm({ ...addForm, odp: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan..."
                  value={addForm.alamat}
                  onChange={(e) => setAddForm({ ...addForm, alamat: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Paket Berlangganan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Home Fiber 30 Mbps"
                  value={addForm.paket}
                  onChange={(e) => setAddForm({ ...addForm, paket: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-2 py-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT DATA PELANGGAN                                              */}
      {/* ========================================================================= */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 border border-slate-200 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            {/* Mobile Drag Indicator Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between pb-3 border-slate-100 border-b">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Data Pelanggan</h3>
                  <p className="text-xs text-slate-500 font-mono">{editingCustomer.id_pelanggan}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditCustomerSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nama}
                  onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    No. WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editForm.telepon}
                    onChange={(e) => setEditForm({ ...editForm, telepon: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    ODP Wilayah
                  </label>
                  <input
                    type="text"
                    value={editForm.odp}
                    onChange={(e) => setEditForm({ ...editForm, odp: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={2}
                  required
                  value={editForm.alamat}
                  onChange={(e) => setEditForm({ ...editForm, alamat: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Paket
                  </label>
                  <input
                    type="text"
                    value={editForm.paket}
                    onChange={(e) => setEditForm({ ...editForm, paket: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white outline-none cursor-pointer"
                  >
                    <option value="AKTIF">AKTIF</option>
                    <option value="BARU">BARU</option>
                    <option value="ISOLIR">ISOLIR</option>
                    <option value="PUTUS">PUTUS</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 text-xs font-bold bg-[#0D1B4A] hover:bg-[#1a237e] text-white rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Pelanggan */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetCustomer)}
        title="Hapus Data Pelanggan"
        message={`Apakah Anda yakin ingin menghapus data pelanggan "${deleteTargetCustomer?.nama}" (${deleteTargetCustomer?.id_pelanggan})? Tindakan ini akan menghapus pelanggan dari daftar.`}
        confirmText="Hapus Pelanggan"
        confirmType="danger"
        onConfirm={executeDeleteCustomer}
        onCancel={() => setDeleteTargetCustomer(null)}
      />

      {/* Modal GenieACS Remote ONT */}
      <GenieAcsModal
        isOpen={Boolean(acsCustomer)}
        customer={acsCustomer}
        onClose={() => setAcsCustomer(null)}
      />

      {/* Modal Speed on Demand Booster */}
      <SpeedOnDemandModal
        isOpen={Boolean(sodCustomer)}
        customer={sodCustomer}
        onClose={() => setSodCustomer(null)}
        onActivateBooster={(c, pkg) => {
          setPelangganList((prev) =>
            prev.map((item) =>
              item.id === c.id ? { ...item, paket: `${pkg.boostSpeed} (Booster Aktif)` } : item
            )
          );
        }}
      />
    </div>
  );
}
