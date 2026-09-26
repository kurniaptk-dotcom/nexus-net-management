import { useState, useMemo } from "react";
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
  GripVertical,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
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

// Format nomor telepon rapi
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
    shortLabel: "Antrean",
    sublabel: "Antrean Tugas",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    accent: "border-t-4 border-amber-500",
    headerBg: "bg-amber-50/70",
    icon: Clock,
  },
  {
    key: "DIJADWALKAN",
    label: "Sedang Berjalan",
    shortLabel: "Berjalan",
    sublabel: "Menuju Lokasi / Proses",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    accent: "border-t-4 border-blue-500",
    headerBg: "bg-blue-50/70",
    icon: Radio,
  },
  {
    key: "SELESAI",
    label: "Selesai Sukses",
    shortLabel: "Selesai",
    sublabel: "Redaman & SN Lengkap",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    accent: "border-t-4 border-emerald-500",
    headerBg: "bg-emerald-50/70",
    icon: CheckCircle2,
  },
  {
    key: "GAGAL",
    label: "Ada Kendala",
    shortLabel: "Kendala",
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

  // Role Detection
  const isTechnician = profile?.role === "teknisi" || (profile?.role !== "admin" && Boolean(profile?.tim));
  const isSupervisor = profile?.role === "admin" || profile?.role === "user";

  // Tim Aktif
  const assignedTeam = profile?.tim || "AZWAR - RIO";
  const [selectedTeam, setSelectedTeam] = usePersistState("xnet_active_tech_team", assignedTeam);
  const activeTeam = isTechnician && profile?.tim ? profile.tim : selectedTeam;

  // View Mode: KANBAN | LIST | ODP_TOOL
  const [viewMode, setViewMode] = useState("KANBAN");

  // Search & Filters
  const [search, setSearch] = useState("");
  // Tab kolom aktif di mobile: ALL | WAITING LIST | DIJADWALKAN | SELESAI | GAGAL
  const [activeKanbanTab, setActiveKanbanTab] = useState("WAITING LIST");

  // Completion Modal State
  const [selectedTask, setSelectedTask] = useState(null);
  const [completionForm, setCompletionForm] = useState({
    redaman: "-19.5",
    serialNumber: "",
    odpPort: "",
    catatan: "",
  });

  // Trouble Modal State
  const [kendalaTask, setKendalaTask] = useState(null);
  const [kendalaForm, setKendalaForm] = useState({
    alasan: "Pelanggan tidak ada di rumah / kosong",
    catatan: "",
  });

  // Drag and drop state (desktop)
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

  // Filter tugas untuk tim aktif
  const teamTasks = useMemo(() => {
    if (activeTeam === "ALL") return pekerjaan;
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
    const waiting = teamTasks.filter((t) => t.status === "WAITING LIST").length;
    const dijadwalkan = teamTasks.filter((t) => t.status === "DIJADWALKAN").length;
    const gagal = teamTasks.filter((t) => t.status === "GAGAL").length;
    const percentage = total > 0 ? Math.round((selesai / total) * 100) : 0;
    return { total, selesai, waiting, dijadwalkan, gagal, percentage };
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

  // Drag and Drop Handlers (Desktop)
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

    if (targetStatus === "GAGAL") {
      setKendalaTask(task);
      setKendalaForm({
        alasan: "Pelanggan tidak ada di rumah / kosong",
        catatan: "",
      });
      return;
    }

    setPekerjaan((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: targetStatus } : t))
    );
    triggerToast(`Pekerjaan "${task.pelanggan}" dipindahkan ke ${targetStatus}.`, "info");
  };

  // ODP Filter
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

  // Reusable Task Card Component (Optimized for Mobile Touch)
  const renderTaskCard = (task, isKanban = false) => {
    const isCompleted = task.status === "SELESAI";
    const isFailed = task.status === "GAGAL";
    const isScheduled = task.status === "DIJADWALKAN";
    const cleanWaPhone = formatPhoneForWa(task.telepon || "081234567890");
    const waMessage = `Halo Bpk/Ibu ${task.pelanggan}, kami dari Tim Teknisi Nexus Net (${activeTeam}). Kami sedang dalam perjalanan/proses untuk pekerjaan ${task.jenis} di ${task.alamat}.`;

    return (
      <div
        key={task.id}
        draggable={isKanban}
        onDragStart={isKanban ? (e) => handleDragStart(e, task.id) : undefined}
        className={`bg-white rounded-2xl border transition-all p-3.5 sm:p-4 shadow-xs hover:shadow-md space-y-3 ${
          isCompleted
            ? "border-emerald-200 bg-emerald-50/10"
            : isFailed
            ? "border-rose-200 bg-rose-50/10"
            : isScheduled
            ? "border-blue-300 ring-2 ring-blue-50/70"
            : "border-slate-200/90"
        }`}
      >
        {/* Row 1: Header Chips */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Jenis Pekerjaan */}
            <span
              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
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

            {/* Status Pill (di List View) */}
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                isCompleted
                  ? "bg-emerald-100 text-emerald-800"
                  : isFailed
                  ? "bg-rose-100 text-rose-800"
                  : isScheduled
                  ? "bg-blue-100 text-blue-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {task.status}
            </span>

            {/* ODP Chip */}
            {task.odp && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <Wifi className="w-3 h-3" />
                <span>{task.odp}</span>
              </span>
            )}
          </div>

          {task.tanggal && (
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{task.tanggal}</span>
            </span>
          )}
        </div>

        {/* Row 2: Customer Name, Phone, and Address */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-base font-bold text-slate-900 leading-tight">
              {task.pelanggan}
            </h4>
            {task.telepon && (
              <a
                href={`tel:${task.telepon}`}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 border border-blue-200 active:scale-95"
                title="Telepon Pelanggan"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{formatPhoneDisplay(task.telepon)}</span>
                <span className="xs:hidden">Panggil</span>
              </a>
            )}
          </div>

          {/* Address with Google Maps link */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.alamat)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-1.5 text-xs sm:text-sm text-slate-600 hover:text-blue-600 group/addr transition-colors"
          >
            <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 group-hover/addr:scale-110 transition-transform" />
            <span className="leading-snug line-clamp-2">{task.alamat}</span>
          </a>
        </div>

        {/* Catatan Lapangan (jika ada) */}
        {task.keterangan && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
            <span className="font-semibold text-slate-900">Catatan: </span>
            <span>{task.keterangan}</span>
          </div>
        )}

        {/* Row 3: Mobile-Optimized Big Touch Action Buttons */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          {/* Quick Communication Grid (WhatsApp & Maps) */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://wa.me/${cleanWaPhone}?text=${encodeURIComponent(waMessage)}`}
              target="_blank"
              rel="noreferrer"
              className="h-10 sm:h-9 flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors shadow-2xs cursor-pointer active:scale-98"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Chat WhatsApp</span>
            </a>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.alamat)}`}
              target="_blank"
              rel="noreferrer"
              className="h-10 sm:h-9 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-800 rounded-xl text-xs font-bold border border-blue-200 transition-colors shadow-2xs cursor-pointer active:scale-98"
            >
              <Navigation className="w-4 h-4 text-blue-600" />
              <span>Rute Maps</span>
            </a>
          </div>

          {/* Workflow Stage Buttons */}
          <div className="flex items-center gap-2">
            {!isCompleted ? (
              <>
                {/* Tombol Mulai Jalan jika status masih WAITING */}
                {!isScheduled && (
                  <button
                    onClick={() => handleStartTask(task)}
                    className="h-10 sm:h-9 flex-1 flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-800 rounded-xl text-xs font-bold border border-indigo-200 transition-colors cursor-pointer active:scale-98"
                  >
                    <Radio className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Mulai Jalan</span>
                  </button>
                )}

                {/* Tombol Tandai Selesai */}
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
                  className="h-10 sm:h-9 flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Selesai (Input dBm)</span>
                </button>

                {/* Tombol Lapor Kendala */}
                <button
                  onClick={() => {
                    setKendalaTask(task);
                    setKendalaForm({
                      alasan: "Pelanggan tidak ada di rumah / kosong",
                      catatan: "",
                    });
                  }}
                  className="h-10 sm:h-9 px-3 flex items-center justify-center gap-1 bg-slate-50 hover:bg-rose-50 active:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-xl text-xs font-semibold border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer active:scale-98 shrink-0"
                  title="Lapor Kendala Lapangan"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline">Kendala</span>
                </button>
              </>
            ) : (
              <div className="h-9 w-full flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Pekerjaan Selesai Sukses</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 max-w-6xl mx-auto px-1 sm:px-0">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast((prev) => ({ ...prev, show: false }))} />
      )}

      {/* Alert Jika Teknisi Belum Ada Penugasan Tim */}
      {isTechnician && !profile?.tim && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Akun Anda belum dipilihkan Tim Teknisi!</span> Menampilkan tim *{activeTeam}* sebagai default. Hubungi Administrator untuk menetapkan tim Anda.
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP HEADER BANNER (MOBILE COMPACT & DESKTOP EXPANDED)                  */}
      {/* ========================================================================= */}
      {/* Mobile Compact Header (sm:hidden) */}
      <div className="sm:hidden bg-[#0D1B4A] text-white rounded-2xl p-4 shadow-lg border border-white/10 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <HardHat className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                {isTechnician ? "Tim Lapangan Anda" : "Supervisor Monitoring"}
              </p>
              <h2 className="text-base font-extrabold text-white truncate tracking-tight">
                {activeTeam === "ALL" ? "Semua Tim" : activeTeam}
              </h2>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {stats.selesai}/{stats.total} Selesai
            </span>
          </div>
        </div>

        {/* If supervisor on mobile, show clean compact dropdown */}
        {isSupervisor && (
          <div className="pt-1 border-t border-white/10">
            <select
              value={activeTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full bg-white/10 text-white text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-white/20 outline-none"
            >
              <option value="ALL">🌐 Semua Tim (Monitoring Global)</option>
              {teamMasterList.map((t) => (
                <option key={t.id || t.nama} value={t.nama} className="bg-[#0D1B4A]">
                  Tim: {t.nama}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Slim Progress Bar */}
        <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-300 rounded-full transition-all duration-500"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>
      </div>

      {/* Desktop / Tablet Header (hidden sm:block) */}
      <div className="hidden sm:block bg-gradient-to-br from-[#0D1B4A] via-[#14235e] to-[#1e327a] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-white/10">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                <HardHat className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-400/15 px-2.5 py-0.5 rounded-md border border-amber-400/25">
                    {isTechnician ? "Portal Tugas Lapangan" : "Supervisor & Monitoring"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-400/20">
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
                    <span>Tugas pada portal ini khusus untuk regu kerja <b>{activeTeam}</b>.</span>
                  ) : (
                    <span>Anda login sebagai <b>{profile?.role === "admin" ? "Administrator" : "Operator"}</b> (Mode Supervisi).</span>
                  )}
                </p>
              </div>
            </div>

            {/* Supervisor Selector / Team Badge */}
            {isSupervisor ? (
              <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 flex flex-col gap-1 min-w-[240px]">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-300 px-1">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Supervisi Tim:</span>
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

          {/* Desktop Progress Bar */}
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
              <span className="text-slate-200 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Progres Pengerjaan: {activeTeam}
              </span>
              <span className="text-amber-300 font-bold">
                {stats.selesai} dari {stats.total} Selesai ({stats.percentage}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-white/15 rounded-full overflow-hidden p-0.5 border border-white/20">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-300 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STAT CARDS / QUICK FILTER (TAP UNTUK LANGSUNG FILTER DI MOBILE)        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Tugas */}
        <button
          onClick={() => {
            setViewMode("KANBAN");
            setActiveKanbanTab("ALL");
          }}
          className={`p-3 sm:p-4 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer active:scale-98 ${
            viewMode === "KANBAN" && activeKanbanTab === "ALL"
              ? "bg-blue-50/70 border-blue-300 ring-2 ring-blue-100"
              : "bg-white border-slate-200 shadow-2xs hover:border-slate-300"
          }`}
        >
          <div>
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">Total Tugas</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{stats.total}</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-[#0D1B4A] flex items-center justify-center shrink-0 border border-blue-100">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </button>

        {/* Waiting List */}
        <button
          onClick={() => {
            setViewMode("KANBAN");
            setActiveKanbanTab("WAITING LIST");
          }}
          className={`p-3 sm:p-4 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer active:scale-98 ${
            viewMode === "KANBAN" && activeKanbanTab === "WAITING LIST"
              ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-100"
              : "bg-white border-amber-200 shadow-2xs hover:border-amber-300"
          }`}
        >
          <div>
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-amber-700">Antrean Waiting</p>
            <p className="text-xl sm:text-2xl font-bold text-[#F59E0B] mt-0.5">{stats.waiting}</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-[#F59E0B] flex items-center justify-center shrink-0 border border-amber-100">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </button>

        {/* Selesai Berhasil */}
        <button
          onClick={() => {
            setViewMode("KANBAN");
            setActiveKanbanTab("SELESAI");
          }}
          className={`p-3 sm:p-4 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer active:scale-98 ${
            viewMode === "KANBAN" && activeKanbanTab === "SELESAI"
              ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-100"
              : "bg-white border-emerald-200 shadow-2xs hover:border-emerald-300"
          }`}
        >
          <div>
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-700">Selesai Berhasil</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 mt-0.5">{stats.selesai}</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </button>

        {/* Ada Kendala */}
        <button
          onClick={() => {
            setViewMode("KANBAN");
            setActiveKanbanTab("GAGAL");
          }}
          className={`p-3 sm:p-4 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer active:scale-98 ${
            viewMode === "KANBAN" && activeKanbanTab === "GAGAL"
              ? "bg-rose-50/80 border-rose-300 ring-2 ring-rose-100"
              : "bg-white border-rose-200 shadow-2xs hover:border-rose-300"
          }`}
        >
          <div>
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-rose-700">Ada Kendala</p>
            <p className="text-xl sm:text-2xl font-bold text-rose-600 mt-0.5">{stats.gagal}</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. VIEW MODE CONTROLS & SEARCH                                            */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Segmented Pill Tabs */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setViewMode("KANBAN")}
              className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "KANBAN"
                  ? "bg-[#0D1B4A] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-amber-400" />
              <span>Kanban</span>
            </button>

            <button
              onClick={() => setViewMode("LIST")}
              className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "LIST"
                  ? "bg-[#0D1B4A] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ListFilter className="w-4 h-4 text-blue-400" />
              <span>Daftar Tugas</span>
            </button>

            <button
              onClick={() => setViewMode("ODP_TOOL")}
              className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "ODP_TOOL"
                  ? "bg-[#0D1B4A] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Wifi className="w-4 h-4 text-emerald-500" />
              <span>Cek ODP</span>
            </button>
          </div>

          {/* Search Box */}
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

        {/* Mobile Column Picker Bar (Khusus saat Mode KANBAN aktif di layar mobile) */}
        {viewMode === "KANBAN" && (
          <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setActiveKanbanTab("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeKanbanTab === "ALL"
                  ? "bg-[#0D1B4A] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Semua ({teamTasks.length})
            </button>

            {KANBAN_COLS.map((col) => {
              const count = searchedTasks.filter((t) => t.status === col.key).length;
              const isActive = activeKanbanTab === col.key;
              return (
                <button
                  key={col.key}
                  onClick={() => setActiveKanbanTab(col.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    isActive
                      ? "bg-[#0D1B4A] text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  <span>{col.shortLabel}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. CONTENT AREA                                                           */}
      {/* ========================================================================= */}

      {/* VIEW A: KANBAN BOARD */}
      {viewMode === "KANBAN" && (
        <div>
          {/* Mobile Single Column View (sm:hidden) */}
          <div className="sm:hidden space-y-3">
            {searchedTasks.filter((t) => activeKanbanTab === "ALL" || t.status === activeKanbanTab).length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-30 mb-2" />
                <h4 className="text-sm font-bold text-slate-800">Tidak ada tugas pada kategori ini</h4>
                <p className="text-xs text-slate-400 mt-1">Semua pekerjaan terpantau aman.</p>
              </div>
            ) : (
              searchedTasks
                .filter((t) => activeKanbanTab === "ALL" || t.status === activeKanbanTab)
                .map((task) => renderTaskCard(task, true))
            )}
          </div>

          {/* Desktop/Tablet 4-Column Grid (hidden sm:grid) */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {KANBAN_COLS.map((col) => {
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

                  <div className="p-2.5 space-y-2.5 min-h-[350px]">
                    {colTasks.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        Tidak ada tugas di kolom ini.
                      </div>
                    ) : (
                      colTasks.map((task) => renderTaskCard(task, true))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW B: DAFTAR TUGAS (RUN SHEET) */}
      {viewMode === "LIST" && (
        <div className="space-y-3">
          {searchedTasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-30 mb-2" />
              <h3 className="text-base font-bold text-slate-800">Tidak ada tugas pada filter ini</h3>
              <p className="text-xs text-slate-400 mt-1">Semua pekerjaan terpantau rapi dan terkendali.</p>
            </div>
          ) : (
            searchedTasks.map((task) => renderTaskCard(task, false))
          )}
        </div>
      )}

      {/* VIEW C: CEK PORT ODP LAPANGAN */}
      {viewMode === "ODP_TOOL" && (
        <div className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wifi className="w-5 h-5 text-emerald-600" />
                Pengecekan ODP & Port Lapangan
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Cari tiang ODP terdekat untuk memastikan ketersediaan port & jalur fiber
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredOdps.map((odp) => {
              const isAman = odp.status === "Aman";
              return (
                <div
                  key={odp.id}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{odp.odc}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
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
          <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3">
            <h5 className="font-bold text-sm text-[#0D1B4A] flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-600" />
              Standar Optical Power Meter (OPM dBm):
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
              <div className="p-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 font-semibold">
                <span className="block font-bold">🟢 -15.0 s/d -22.9 dBm</span>
                <span className="text-xs font-normal text-slate-600">Prima & Sangat Stabil</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-amber-800 font-semibold">
                <span className="block font-bold">🟡 -23.0 s/d -25.9 dBm</span>
                <span className="text-xs font-normal text-slate-600">Waspada, Cek Sambungan</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-rose-200 text-rose-800 font-semibold">
                <span className="block font-bold">🔴 &gt; -26.0 dBm</span>
                <span className="text-xs font-normal text-slate-600">Kritis / Resiko LOS</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL BOTTOM-SHEET: SELESAI PEKERJAAN                                  */}
      {/* ========================================================================= */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 border border-slate-100 max-h-[92vh] overflow-y-auto">
            {/* Top Handle for mobile bottom-sheet */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
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

            <form onSubmit={handleCompleteSubmit} className="mt-4 space-y-4">
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
                    inputMode="decimal"
                    required
                    value={completionForm.redaman}
                    onChange={(e) => setCompletionForm({ ...completionForm, redaman: e.target.value })}
                    placeholder="Contoh: -19.5"
                    className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
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
                  autoCapitalize="characters"
                  value={completionForm.serialNumber}
                  onChange={(e) => setCompletionForm({ ...completionForm, serialNumber: e.target.value })}
                  placeholder="Contoh: ZTEGC1234567 atau HWTC89ABC"
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm uppercase font-mono focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
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
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="flex-1 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-2 py-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Konfirmasi Selesai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL BOTTOM-SHEET: LAPOR KENDALA                                      */}
      {/* ========================================================================= */}
      {kendalaTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 border border-slate-100 max-h-[92vh] overflow-y-auto">
            {/* Top Handle for mobile bottom-sheet */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
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

            <form onSubmit={handleKendalaSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Penyebab Kendala
                </label>
                <select
                  value={kendalaForm.alasan}
                  onChange={(e) => setKendalaForm({ ...kendalaForm, alasan: e.target.value })}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setKendalaTask(null)}
                  className="flex-1 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-2 py-3 text-xs font-bold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl shadow-md transition-all cursor-pointer"
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
