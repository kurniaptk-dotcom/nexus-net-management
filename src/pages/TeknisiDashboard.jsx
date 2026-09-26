import { useState, useMemo, useEffect } from "react";
import {
  HardHat,
  Wrench,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  Gauge,
  Wifi,
  AlertTriangle,
  Users,
  Search,
  Check,
  X,
  Navigation,
  Radio,
  Layers,
  CheckCircle,
  LayoutGrid,
  ListFilter,
  Eye,
  ArrowRight,
  GripVertical,
  Calendar,
  Sparkles,
  Info,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePersistState } from "../hooks/usePersistState";
import { pekerjaanList, initialTimData, odpOdcList } from "../data/mockData";
import Toast from "../components/Toast";

// Format nomor WhatsApp standar Indonesia
function formatPhoneForWa(phone) {
  if (!phone) return "";
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.substring(1);
  } else if (!clean.startsWith("62")) {
    clean = "62" + clean;
  }
  return clean;
}

// Format tampilan telepon yang rapi (e.g. 0812-3456-7890)
function formatPhoneDisplay(phone) {
  if (!phone) return "-";
  const clean = phone.replace(/[^0-9]/g, "");
  if (clean.length >= 10) {
    return clean.replace(/(\d{4})(\d{4})(\d+)/, "$1-$2-$3");
  }
  return phone;
}

// Evaluasi Kualitas Redaman Optik (dBm)
function getDbmQuality(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return null;
  const abs = Math.abs(num);
  if (abs >= 15 && abs <= 22.99) {
    return {
      status: "PRIMA",
      label: "Kualitas Prima (-15 s/d -22.9 dBm)",
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      dot: "bg-emerald-500",
    };
  }
  if (abs >= 23 && abs <= 25.99) {
    return {
      status: "WASPADA",
      label: "Cukup / Waspada (-23 s/d -25.9 dBm)",
      color: "text-amber-700 bg-amber-50 border-amber-200",
      dot: "bg-amber-500",
    };
  }
  return {
    status: "BURUK",
    label: "Redaman Buruk / Resiko LOS (> -26 dBm)",
    color: "text-rose-700 bg-rose-50 border-rose-200",
    dot: "bg-rose-500",
  };
}

// Kolom Kanban Board
const KANBAN_COLS = [
  {
    key: "WAITING LIST",
    label: "Waiting List",
    sublabel: "Antrean Tugas",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    accent: "border-t-4 border-amber-500",
    headerBg: "bg-amber-50/70",
    icon: Clock,
  },
  {
    key: "DIJADWALKAN",
    label: "Sedang Berjalan",
    sublabel: "Menuju Lokasi / Proses",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    accent: "border-t-4 border-blue-500",
    headerBg: "bg-blue-50/70",
    icon: Radio,
  },
  {
    key: "SELESAI",
    label: "Selesai Sukses",
    sublabel: "Redaman & SN Lengkap",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    accent: "border-t-4 border-emerald-500",
    headerBg: "bg-emerald-50/70",
    icon: CheckCircle2,
  },
  {
    key: "GAGAL",
    label: "Ada Kendala",
    sublabel: "Gagal / Reschedule",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    accent: "border-t-4 border-rose-500",
    headerBg: "bg-rose-50/70",
    icon: AlertTriangle,
  },
];

export default function TeknisiDashboard() {
  const { profile } = useAuth();
  const [pekerjaan, setPekerjaan] = usePersistState("xnet_pekerjaan", pekerjaanList);
  const [odpList] = usePersistState("xnet_odpodc", odpOdcList);
  const [teamMasterList] = usePersistState("xnet_tim", initialTimData);

  // Deteksi Role Pengguna
  // Role 'teknisi' atau user yang memiliki assigned team
  const isTechnician = profile?.role === "teknisi" || (profile?.role !== "admin" && Boolean(profile?.tim));
  const isSupervisor = profile?.role === "admin" || profile?.role === "user"; // Admin atau Operator memiliki mode supervisi

  // Tim Aktif
  const assignedTeam = profile?.tim || "AZWAR - RIO";
  const [selectedTeam, setSelectedTeam] = usePersistState("xnet_active_tech_team", assignedTeam);

  // Jika user adalah teknisi, kunci otomatis ke tim yang ditugaskan
  const activeTeam = isTechnician && profile?.tim ? profile.tim : selectedTeam;

  // View Mode: KANBAN | LIST | ODP_TOOL
  const [viewMode, setViewMode] = useState("KANBAN");

  // Filter & Search
  const [search, setSearch] = useState("");
  const [mobileKanbanCol, setMobileKanbanCol] = useState("ALL"); // ALL | WAITING LIST | DIJADWALKAN | SELESAI | GAGAL

  // Completion Modal State
  const [selectedTask, setSelectedTask] = useState(null);
  const [completionForm, setCompletionForm] = useState({
    redaman: "-19.5",
    serialNumber: "",
    odpPort: "",
    catatan: "",
  });

  // Trouble / Kendala Modal State
  const [kendalaTask, setKendalaTask] = useState(null);
  const [kendalaForm, setKendalaForm] = useState({
    alasan: "Pelanggan tidak ada di rumah / kosong",
    catatan: "",
  });

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  // ODP Search Tool
  const [odpQuery, setOdpQuery] = useState("");

  // Toast
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const triggerToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  // Filter tugas khusus untuk tim yang aktif
  const teamTasks = useMemo(() => {
    if (activeTeam === "ALL") {
      return pekerjaan;
    }
    return pekerjaan.filter((p) => (p.tim || "").toUpperCase() === activeTeam.toUpperCase());
  }, [pekerjaan, activeTeam]);

  // Pencarian
  const searchedTasks = useMemo(() => {
    if (!search.trim()) return teamTasks;
    const q = search.toLowerCase().trim();
    return teamTasks.filter(
      (t) =>
        (t.pelanggan || "").toLowerCase().includes(q) ||
        (t.alamat || "").toLowerCase().includes(q) ||
        (t.odp || "").toLowerCase().includes(q) ||
        (t.telepon || "").includes(q) ||
        (t.jenis || "").toLowerCase().includes(q)
    );
  }, [teamTasks, search]);

  // Metrik Statistik
  const stats = useMemo(() => {
    const total = teamTasks.length;
    const selesai = teamTasks.filter((t) => t.status === "SELESAI").length;
    const pending = teamTasks.filter((t) => t.status === "WAITING LIST" || t.status === "DIJADWALKAN").length;
    const waiting = teamTasks.filter((t) => t.status === "WAITING LIST").length;
    const dijadwalkan = teamTasks.filter((t) => t.status === "DIJADWALKAN").length;
    const gagal = teamTasks.filter((t) => t.status === "GAGAL").length;
    const percentage = total > 0 ? Math.round((selesai / total) * 100) : 0;
    return { total, selesai, pending, waiting, dijadwalkan, gagal, percentage };
  }, [teamTasks]);

  // Handle Mark In-Progress (Mulai Jalan)
  const handleStartTask = (task) => {
    setPekerjaan((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: "DIJADWALKAN",
              keterangan: (t.keterangan ? t.keterangan + " · " : "") + "Sedang menuju lokasi pengerjaan",
            }
          : t
      )
    );
    triggerToast(`Status tugas ${task.pelanggan} diubah: Sedang Dikerjakan.`, "info");
  };

  // Handle Submit Completion
  const handleCompleteSubmit = (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    const redamanStr = completionForm.redaman ? `Redaman: ${completionForm.redaman} dBm` : "";
    const snStr = completionForm.serialNumber ? `SN ONT: ${completionForm.serialNumber}` : "";
    const portStr = completionForm.odpPort ? `Port: ${completionForm.odpPort}` : "";
    const extraDetails = [redamanStr, snStr, portStr, completionForm.catatan].filter(Boolean).join(" | ");

    setPekerjaan((prev) =>
      prev.map((t) =>
        t.id === selectedTask.id
          ? {
              ...t,
              status: "SELESAI",
              keterangan: extraDetails || "Pekerjaan selesai dilaksanakan tim teknisi.",
            }
          : t
      )
    );

    triggerToast(`Laporan pekerjaan "${selectedTask.pelanggan}" berhasil disimpan sebagai Selesai.`, "success");
    setSelectedTask(null);
    setCompletionForm({ redaman: "-19.5", serialNumber: "", odpPort: "", catatan: "" });
  };

  // Handle Submit Kendala (GAGAL)
  const handleKendalaSubmit = (e) => {
    e.preventDefault();
    if (!kendalaTask) return;

    const reason = `[KENDALA] ${kendalaForm.alasan}${kendalaForm.catatan ? " - " + kendalaForm.catatan : ""}`;

    setPekerjaan((prev) =>
      prev.map((t) =>
        t.id === kendalaTask.id
          ? {
              ...t,
              status: "GAGAL",
              keterangan: reason,
            }
          : t
      )
    );

    triggerToast(`Kendala pada pekerjaan "${kendalaTask.pelanggan}" telah dilaporkan.`, "info");
    setKendalaTask(null);
    setKendalaForm({ alasan: "Pelanggan tidak ada di rumah / kosong", catatan: "" });
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, id) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData("text/plain", id.toString());
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    setDragOverCol(colKey);
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData("text/plain") || draggedTaskId);
    const task = pekerjaan.find((p) => p.id === id);

    setDragOverCol(null);
    setDraggedTaskId(null);

    if (!task) return;

    // Jika dipindah ke SELESAI, wajib buka modal pengukuran redaman dBm
    if (targetStatus === "SELESAI") {
      setSelectedTask(task);
      setCompletionForm({
        redaman: "-19.5",
        serialNumber: "",
        odpPort: task.odp || "",
        catatan: "",
      });
      return;
    }

    // Jika dipindah ke GAGAL, buka modal kendala
    if (targetStatus === "GAGAL") {
      setKendalaTask(task);
      setKendalaForm({
        alasan: "Pelanggan tidak ada di rumah / kosong",
        catatan: "",
      });
      return;
    }

    // Perpindahan langsung (WAITING LIST atau DIJADWALKAN)
    setPekerjaan((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: targetStatus } : t))
    );
    triggerToast(`Pekerjaan "${task.pelanggan}" dipindahkan ke ${targetStatus}.`, "info");
  };

  // ODP Quick Search
  const filteredOdps = useMemo(() => {
    if (!odpQuery.trim()) return odpList.slice(0, 9);
    const q = odpQuery.toLowerCase().trim();
    return odpList.filter(
      (o) =>
        (o.nama || "").toLowerCase().includes(q) ||
        (o.odc || "").toLowerCase().includes(q) ||
        (o.keterangan || "").toLowerCase().includes(q)
    );
  }, [odpList, odpQuery]);

  const dbmQuality = useMemo(() => getDbmQuality(completionForm.redaman), [completionForm.redaman]);

  return (
    <div className="space-y-6 pb-14 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast((prev) => ({ ...prev, show: false }))} />
      )}

      {/* ========================================================================= */}
      {/* BANNER NOTIFIKASI JIKA TEKNISI BELUM MEMILIKI TIM DITETAPKAN              */}
      {/* ========================================================================= */}
      {isTechnician && !profile?.tim && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-amber-900">
            <p className="font-bold">Perhatian: Akun Anda belum ditetapkan ke Tim Teknisi!</p>
            <p className="mt-0.5 text-amber-800">
              Administrator belum memilihkan nama tim lapangan untuk akun Anda. Saat ini sistem menampilkan tim *{activeTeam}* sebagai default. Hubungi Admin untuk mengatur regu Anda di menu Manajemen User.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP HERO BANNER & ROLE-AWARE IDENTITY                                     */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-[#0D1B4A] via-[#14235e] to-[#1e327a] text-white rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 translate-y-8 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: User Profile & Role Info */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                <HardHat className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-400/15 px-2.5 py-0.5 rounded-md border border-amber-400/25">
                    {isTechnician ? "Portal Tugas Lapangan" : "Supervisor & Monitoring"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-md border border-emerald-400/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Siaga Operasional
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Dashboard Tim: <span className="text-[#F59E0B]">{activeTeam === "ALL" ? "Semua Tim Lapangan" : activeTeam}</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-200 mt-0.5">
                  Halo, <span className="font-semibold text-white">{profile?.full_name || "Teknisi Lapangan"}</span>!{" "}
                  {isTechnician ? (
                    <span>Tugas pada halaman ini otomatis dikhususkan untuk tim <b>{activeTeam}</b>.</span>
                  ) : (
                    <span>Anda login sebagai <b>{profile?.role === "admin" ? "Administrator" : "Operator"}</b> (Mode Supervisi).</span>
                  )}
                </p>
              </div>
            </div>

            {/* Right: Team Selector (Supervisory for Admin/Operator, or Locked Badge for Technician) */}
            <div className="self-start md:self-auto">
              {isSupervisor ? (
                /* Admin / Operator can switch teams or view all teams */
                <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 flex flex-col gap-1 min-w-[240px]">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-300 px-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Supervisi Tim:
                    </span>
                    <span className="text-[10px] bg-white/15 px-1.5 py-0.2 rounded font-mono">Admin Mode</span>
                  </div>
                  <select
                    value={activeTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full bg-[#0D1B4A] text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/20 outline-none cursor-pointer focus:ring-2 focus:ring-[#F59E0B]"
                  >
                    <option value="ALL">🌐 Semua Tim (Monitoring Global)</option>
                    {teamMasterList.map((t) => (
                      <option key={t.id || t.nama} value={t.nama}>
                        Tim: {t.nama}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* Technician has assigned team locked */
                <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-[#0D1B4A] flex items-center justify-center font-bold text-xs shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Regu Anda</p>
                    <p className="text-sm font-bold text-white tracking-tight">{activeTeam}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar Pengerjaan Tim */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
              <span className="text-slate-200 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Progres Pekerjaan {activeTeam === "ALL" ? "Seluruh Tim" : `Tim ${activeTeam}`}
              </span>
              <span className="text-amber-300 font-bold">
                {stats.selesai} dari {stats.total} Selesai ({stats.percentage}%)
              </span>
            </div>
            <div className="w-full h-3 bg-white/15 rounded-full overflow-hidden p-0.5 border border-white/20">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-300 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 STAT CARDS                                                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Tugas Tim</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0D1B4A] flex items-center justify-center shrink-0 border border-blue-100">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs hover:border-amber-300 transition-all flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Waiting List</p>
            <p className="text-2xl font-bold text-[#F59E0B] mt-1">{stats.waiting}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-[#F59E0B] flex items-center justify-center shrink-0 border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-xs hover:border-emerald-300 transition-all flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Selesai Berhasil</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.selesai}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-xs hover:border-rose-300 transition-all flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Ada Kendala</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{stats.gagal}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE CONTROLS: KANBAN BOARD vs RUN SHEET vs ODP CHECKER              */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            onClick={() => setViewMode("KANBAN")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === "KANBAN"
                ? "bg-[#0D1B4A] text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-amber-400" />
            <span>Kanban Board Tim</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">
              {teamTasks.length}
            </span>
          </button>

          <button
            onClick={() => setViewMode("LIST")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === "LIST"
                ? "bg-[#0D1B4A] text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <ListFilter className="w-4 h-4 text-blue-400" />
            <span>Daftar Tugas (Run-Sheet)</span>
          </button>

          <button
            onClick={() => setViewMode("ODP_TOOL")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === "ODP_TOOL"
                ? "bg-[#0D1B4A] text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Wifi className="w-4 h-4 text-emerald-500" />
            <span>Cek Port ODP</span>
          </button>
        </div>

        {/* Search input in header */}
        {viewMode !== "ODP_TOOL" && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari pelanggan / alamat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: KANBAN BOARD KHUSUS TIM                                           */}
      {/* ========================================================================= */}
      {viewMode === "KANBAN" && (
        <div className="space-y-4">
          {/* Mobile column selector */}
          <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setMobileKanbanCol("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                mobileKanbanCol === "ALL" ? "bg-[#0D1B4A] text-white" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Semua Kolom
            </button>
            {KANBAN_COLS.map((col) => {
              const count = searchedTasks.filter((t) => t.status === col.key).length;
              return (
                <button
                  key={col.key}
                  onClick={() => setMobileKanbanCol(col.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${
                    mobileKanbanCol === col.key ? "bg-[#0D1B4A] text-white" : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  <span>{col.label}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Kanban 4 Columns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {KANBAN_COLS.filter((col) => mobileKanbanCol === "ALL" || mobileKanbanCol === col.key).map((col) => {
              const colTasks = searchedTasks.filter((t) => t.status === col.key);
              const ColIcon = col.icon;
              const isOver = dragOverCol === col.key;

              return (
                <div
                  key={col.key}
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={(e) => handleDrop(e, col.key)}
                  className={`bg-slate-50/70 rounded-2xl border transition-all ${
                    isOver ? "border-amber-400 bg-amber-50/30 ring-2 ring-amber-300" : "border-slate-200/80"
                  }`}
                >
                  {/* Column Header */}
                  <div className={`p-3.5 rounded-t-2xl border-b border-slate-200/80 ${col.headerBg} ${col.accent}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ColIcon className="w-4 h-4 text-slate-700" />
                        <h3 className="font-bold text-sm text-slate-900">{col.label}</h3>
                      </div>
                      <span className="w-6 h-6 rounded-full bg-white text-slate-800 font-extrabold text-xs flex items-center justify-center shadow-xs border border-slate-200">
                        {colTasks.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{col.sublabel}</p>
                  </div>

                  {/* Task Cards in Column */}
                  <div className="p-2.5 space-y-2.5 min-h-[350px]">
                    {colTasks.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        Tidak ada tugas di kolom ini.
                      </div>
                    ) : (
                      colTasks.map((task) => {
                        const cleanWaPhone = formatPhoneForWa(task.telepon || "081234567890");
                        const waMessage = `Halo Bpk/Ibu ${task.pelanggan}, kami dari Tim Teknisi Nexus Net (${activeTeam}). Kami sedang memproses pengerjaan ${task.jenis} di lokasi Anda di ${task.alamat}.`;

                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing group space-y-2.5"
                          >
                            {/* Card Top: Type & Grip */}
                            <div className="flex items-center justify-between">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  task.jenis === "PEMASANGAN"
                                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                                    : task.jenis === "PERBAIKAN"
                                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                                    : task.jenis === "PEMUTUSAN"
                                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                                    : "bg-purple-50 text-purple-800 border border-purple-200"
                                }`}
                              >
                                {task.jenis}
                              </span>

                              <div className="flex items-center gap-1 text-slate-400">
                                {task.odp && (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    {task.odp}
                                  </span>
                                )}
                                <GripVertical className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                              </div>
                            </div>

                            {/* Pelanggan & Alamat */}
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-900">
                                {task.pelanggan}
                              </h4>
                              <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                                {task.alamat}
                              </p>
                            </div>

                            {/* Telepon */}
                            {task.telepon && (
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{formatPhoneDisplay(task.telepon)}</span>
                              </div>
                            )}

                            {/* Keterangan / Hasil Redaman jika sudah selesai */}
                            {task.keterangan && (
                              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600 line-clamp-2">
                                {task.keterangan}
                              </div>
                            )}

                            {/* Card Footer Actions */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                              {/* Quick WA & Maps */}
                              <div className="flex items-center gap-1">
                                <a
                                  href={`https://wa.me/${cleanWaPhone}?text=${encodeURIComponent(waMessage)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 transition-colors"
                                  title="Chat WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.alamat)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200 transition-colors"
                                  title="Rute Maps"
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                </a>
                              </div>

                              {/* Stage transition buttons */}
                              <div className="flex items-center gap-1">
                                {task.status === "WAITING LIST" && (
                                  <button
                                    onClick={() => handleStartTask(task)}
                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-md text-[11px] font-bold border border-indigo-200 cursor-pointer"
                                  >
                                    Mulai
                                  </button>
                                )}

                                {task.status !== "SELESAI" && (
                                  <button
                                    onClick={() => {
                                      setSelectedTask(task);
                                      setCompletionForm({
                                        redaman: "-19.5",
                                        serialNumber: "",
                                        odpPort: task.odp || "",
                                        catatan: "",
                                      });
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold shadow-2xs transition-all cursor-pointer"
                                  >
                                    Selesai
                                  </button>
                                )}

                                {task.status !== "GAGAL" && task.status !== "SELESAI" && (
                                  <button
                                    onClick={() => {
                                      setKendalaTask(task);
                                      setKendalaForm({
                                        alasan: "Pelanggan tidak ada di rumah / kosong",
                                        catatan: "",
                                      });
                                    }}
                                    className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                    title="Lapor Kendala"
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: DAFTAR TUGAS (RUN-SHEET LIST)                                     */}
      {/* ========================================================================= */}
      {viewMode === "LIST" && (
        <div className="space-y-3.5">
          {searchedTasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-30 mb-2" />
              <h3 className="text-base font-bold text-slate-800">Tidak ada tugas pada filter ini</h3>
              <p className="text-xs text-slate-400 mt-1">Semua pekerjaan terpantau rapi dan terkendali.</p>
            </div>
          ) : (
            searchedTasks.map((task, index) => {
              const isCompleted = task.status === "SELESAI";
              const isFailed = task.status === "GAGAL";
              const isScheduled = task.status === "DIJADWALKAN";
              const cleanWaPhone = formatPhoneForWa(task.telepon || "081234567890");
              const waMessage = `Halo Bpk/Ibu ${task.pelanggan}, kami dari Tim Teknisi Nexus Net (${activeTeam}). Kami sedang dalam perjalanan menuju lokasi Anda di ${task.alamat} untuk pekerjaan ${task.jenis}.`;

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-xs hover:shadow-md ${
                    isCompleted
                      ? "border-emerald-200/80 bg-emerald-50/15"
                      : isFailed
                      ? "border-rose-200 bg-rose-50/15"
                      : isScheduled
                      ? "border-blue-300 ring-2 ring-blue-50/60"
                      : "border-slate-200/90"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                          #{index + 1}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            task.jenis === "PEMASANGAN"
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : task.jenis === "PERBAIKAN"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : task.jenis === "PEMUTUSAN"
                              ? "bg-orange-50 text-orange-800 border border-orange-200"
                              : "bg-purple-50 text-purple-800 border border-purple-200"
                          }`}
                        >
                          {task.jenis}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : isFailed
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : isScheduled
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {task.status}
                        </span>

                        {task.odp && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            <Wifi className="w-3.5 h-3.5" />
                            <span>{task.odp}</span>
                          </span>
                        )}
                      </div>

                      {task.tanggal && (
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{task.tanggal}</span>
                        </div>
                      )}
                    </div>

                    {/* Customer & Address */}
                    <div className="space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <h4 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                          {task.pelanggan}
                        </h4>
                        {task.telepon && (
                          <a
                            href={`tel:${task.telepon}`}
                            className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>{formatPhoneDisplay(task.telepon)}</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-start gap-1.5 text-xs sm:text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{task.alamat}</span>
                      </div>
                    </div>

                    {/* Catatan Lapangan */}
                    {task.keterangan && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">Catatan Lapangan: </span>
                        <span>{task.keterangan}</span>
                      </div>
                    )}

                    {/* Footer Toolbar */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={`https://wa.me/${cleanWaPhone}?text=${encodeURIComponent(waMessage)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                          <span>Chat WA</span>
                        </a>

                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.alamat)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-semibold border border-blue-200 transition-colors"
                        >
                          <Navigation className="w-4 h-4 text-blue-600" />
                          <span>Rute Maps</span>
                        </a>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {!isCompleted && (
                          <>
                            <button
                              onClick={() => {
                                setKendalaTask(task);
                                setKendalaForm({
                                  alasan: "Pelanggan tidak ada di rumah / kosong",
                                  catatan: "",
                                });
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                              <span>Ada Kendala</span>
                            </button>

                            {!isScheduled && (
                              <button
                                onClick={() => handleStartTask(task)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer"
                              >
                                <Radio className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Mulai Jalan</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setCompletionForm({
                                  redaman: "-19.5",
                                  serialNumber: "",
                                  odpPort: task.odp || "",
                                  catatan: "",
                                });
                              }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0D1B4A] hover:bg-[#1a237e] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Tandai Selesai</span>
                            </button>
                          </>
                        )}

                        {isCompleted && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold border border-emerald-200">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span>Tugas Selesai Sukses</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: CEK PORT ODP LAPANGAN                                             */}
      {/* ========================================================================= */}
      {viewMode === "ODP_TOOL" && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wifi className="w-5 h-5 text-emerald-600" />
                Pengecekan ODP & Port Lapangan
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Cari tiang distribusi ODP terdekat untuk memastikan ketersediaan port & jalur fiber
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama ODP / ODC..."
                value={odpQuery}
                onChange={(e) => setOdpQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredOdps.map((odp) => {
              const isAman = odp.status === "Aman";
              return (
                <div
                  key={odp.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{odp.odc}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isAman
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {odp.status || "Siap"}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">{odp.nama}</h4>
                  <p className="text-xs text-slate-500">{odp.keterangan || "Jalur fiber optik normal"}</p>
                </div>
              );
            })}
          </div>

          {/* Panduan Standar Redaman dBm Nexus Net */}
          <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3">
            <h5 className="font-bold text-sm text-[#0D1B4A] flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-600" />
              Standar Optical Power Meter (OPM dBm) Nexus Net:
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-white border border-emerald-200 text-emerald-800 font-semibold shadow-2xs">
                <span className="block text-emerald-950 font-bold mb-0.5">🟢 -15.0 s/d -22.9 dBm</span>
                <span className="text-xs font-normal text-slate-600">Kondisi Prima & Sangat Stabil</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-amber-200 text-amber-800 font-semibold shadow-2xs">
                <span className="block text-amber-950 font-bold mb-0.5">🟡 -23.0 s/d -25.9 dBm</span>
                <span className="text-xs font-normal text-slate-600">Cukup, Disarankan Cek Sambungan</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-rose-200 text-rose-800 font-semibold shadow-2xs">
                <span className="block text-rose-950 font-bold mb-0.5">🔴 &gt; -26.0 dBm</span>
                <span className="text-xs font-normal text-slate-600">Kritis / Resiko Sinyal Putus (LOS)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL LAPORAN SELESAI PEKERJAAN                                           */}
      {/* ========================================================================= */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-5 sm:p-7 border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Laporan Selesai Pengerjaan</h3>
                  <p className="text-xs text-slate-500">{selectedTask.pelanggan} · {selectedTask.jenis}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Hasil Redaman Optik (dBm) <span className="text-rose-500">*</span>
                  </label>
                  {dbmQuality && (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${dbmQuality.color}`}>
                      <span className={`w-2 h-2 rounded-full ${dbmQuality.dot}`} />
                      {dbmQuality.label}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Gauge className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={completionForm.redaman}
                    onChange={(e) => setCompletionForm({ ...completionForm, redaman: e.target.value })}
                    placeholder="Contoh: -19.5"
                    className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    dBm
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nomor Seri (SN) / MAC Modem ONT
                </label>
                <input
                  type="text"
                  value={completionForm.serialNumber}
                  onChange={(e) => setCompletionForm({ ...completionForm, serialNumber: e.target.value })}
                  placeholder="Contoh: ZTEGC1234567 atau HWTC89ABC"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm uppercase font-mono focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  ODP & Nomor Port Terpakai
                </label>
                <input
                  type="text"
                  value={completionForm.odpPort}
                  onChange={(e) => setCompletionForm({ ...completionForm, odpPort: e.target.value })}
                  placeholder="Contoh: ODP 1.2 Port 4"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Catatan Lapangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={completionForm.catatan}
                  onChange={(e) => setCompletionForm({ ...completionForm, catatan: e.target.value })}
                  placeholder="Contoh: Kabel dropcore 110 meter, penempatan ONT di ruang tengah aman."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Konfirmasi Selesai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL LAPOR KENDALA (GAGAL)                                               */}
      {/* ========================================================================= */}
      {kendalaTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-5 sm:p-7 border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Lapor Kendala Lapangan</h3>
                  <p className="text-xs text-slate-500">{kendalaTask.pelanggan}</p>
                </div>
              </div>
              <button
                onClick={() => setKendalaTask(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleKendalaSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Penyebab Kendala
                </label>
                <select
                  value={kendalaForm.alasan}
                  onChange={(e) => setKendalaForm({ ...kendalaForm, alasan: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  <option value="Pelanggan tidak ada di rumah / kosong">Pelanggan tidak ada di rumah / kosong</option>
                  <option value="Redaman ODP drop / LOS dari induk">Redaman ODP drop / LOS dari induk</option>
                  <option value="Tiang roboh / kabel distribusi putus">Tiang roboh / kabel distribusi putus</option>
                  <option value="Jarak dropcore melebihi batas (>250m)">Jarak dropcore melebihi batas (&gt;250m)</option>
                  <option value="Dibatalkan oleh pelanggan saat di lokasi">Dibatalkan oleh pelanggan saat di lokasi</option>
                  <option value="Kondisi cuaca hujan badai / bahaya petir">Kondisi cuaca hujan badai / bahaya petir</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Penjelasan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={kendalaForm.catatan}
                  onChange={(e) => setKendalaForm({ ...kendalaForm, catatan: e.target.value })}
                  placeholder="Keterangan untuk admin atau tim jadwal ulang..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setKendalaTask(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Simpan Kendala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
