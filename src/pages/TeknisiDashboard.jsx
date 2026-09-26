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
  MoreVertical,
  ChevronRight,
  TrendingUp,
  FileCheck,
  ClipboardList,
  Sparkles,
  Share2,
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

// 4 Kolom Kanban Sesuai Mockup
const KANBAN_COLS = [
  {
    key: "WAITING LIST",
    label: "Waiting List",
    sublabel: "Antrean Tugas",
    iconBg: "bg-blue-600 text-white",
    headerBg: "bg-blue-50/40",
    badgeColor: "bg-blue-100 text-blue-800",
    icon: Layers,
  },
  {
    key: "DIJADWALKAN",
    label: "Sedang Berjalan",
    sublabel: "Menuju Lokasi / Proses",
    iconBg: "bg-blue-500 text-white",
    headerBg: "bg-blue-50/40",
    badgeColor: "bg-blue-100 text-blue-800",
    icon: Radio,
  },
  {
    key: "SELESAI",
    label: "Selesai Sukses",
    sublabel: "Redaman & S/N Lengkap",
    iconBg: "bg-emerald-600 text-white",
    headerBg: "bg-emerald-50/40",
    badgeColor: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle2,
  },
  {
    key: "GAGAL",
    label: "Ada Kendala",
    sublabel: "Gagal / Reschedule",
    iconBg: "bg-rose-500 text-white",
    headerBg: "bg-rose-50/40",
    badgeColor: "bg-rose-100 text-rose-800",
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

  // Search & Filter Kolom Mobile
  const [search, setSearch] = useState("");
  const [mobileKanbanCol, setMobileKanbanCol] = useState("ALL");

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

  // Render Kanban Card persis seperti di Mockup
  const renderCard = (task) => {
    const isCompleted = task.status === "SELESAI";
    const isScheduled = task.status === "DIJADWALKAN";
    const cleanWaPhone = formatPhoneForWa(task.telepon || "081234567890");
    const waMessage = `Halo Bpk/Ibu ${task.pelanggan}, kami dari Tim Teknisi Nexus Net (${activeTeam}). Kami sedang memproses pekerjaan ${task.jenis} di lokasi Anda: ${task.alamat}.`;

    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing space-y-2.5 relative group"
      >
        {/* Top: Jenis Pekerjaan Badge & 3-dots */}
        <div className="flex items-center justify-between">
          <span
            className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
              task.jenis === "PEMASANGAN"
                ? "bg-blue-50 text-blue-700 border border-blue-200/80"
                : task.jenis === "PERBAIKAN"
                ? "bg-amber-50 text-amber-700 border border-amber-200/80"
                : task.jenis === "PEMUTUSAN"
                ? "bg-rose-50 text-rose-600 border border-rose-200/80"
                : "bg-purple-50 text-purple-700 border border-purple-200/80"
            }`}
          >
            {task.jenis}
          </span>

          <button className="text-slate-300 hover:text-slate-600 p-0.5 rounded cursor-pointer">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Pelanggan & Alamat */}
        <div>
          <h4 className="font-bold text-sm text-slate-900 leading-snug">
            {task.pelanggan}
          </h4>
          <div className="flex items-start gap-1 text-xs text-slate-500 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2 leading-relaxed">{task.alamat}</span>
          </div>
        </div>

        {/* Catatan / Keterangan (e.g. Sedang menuju lokasi pengerjaan) */}
        {task.keterangan && (
          <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
            {task.keterangan}
          </p>
        )}

        {/* Bottom Actions Bar */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
          {/* Quick Round Icons: WhatsApp & Maps */}
          <div className="flex items-center gap-1.5">
            <a
              href={`https://wa.me/${cleanWaPhone}?text=${encodeURIComponent(waMessage)}`}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 transition-colors"
              title="Chat WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.alamat)}`}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200 transition-colors"
              title="Navigasi Maps"
            >
              <Navigation className="w-4 h-4" />
            </a>
          </div>

          {/* Action Buttons Right */}
          <div className="flex items-center gap-1.5">
            {!isCompleted ? (
              <>
                {!isScheduled && (
                  <button
                    onClick={() => handleStartTask(task)}
                    className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 transition-all cursor-pointer"
                  >
                    Mulai
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
                  className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer"
                >
                  Selesai
                </button>

                <button
                  onClick={() => {
                    setKendalaTask(task);
                    setKendalaForm({
                      alasan: "Pelanggan tidak ada di rumah / kosong",
                      catatan: "",
                    });
                  }}
                  className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded transition-colors"
                  title="Ada Kendala"
                >
                  <AlertTriangle className="w-4 h-4" />
                </button>
              </>
            ) : (
              <span className="text-slate-400 p-1">
                <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-16 max-w-7xl mx-auto px-1 sm:px-2">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast((prev) => ({ ...prev, show: false }))} />
      )}

      {/* ========================================================================= */}
      {/* 1. HERO CARD (SESUAI GAMBAR MOCKUP DENGAN MENARA BTS DI KANAN)           */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm relative overflow-hidden">
        {/* Background Graphic Tower BTS di pojok kanan persis gambar */}
        <div className="absolute right-0 top-0 bottom-0 w-80 md:w-96 pointer-events-none opacity-25 md:opacity-35 hidden sm:block">
          <img
            src="/telecom_tower.jpg"
            alt="BTS Tower"
            className="w-full h-full object-cover object-right"
            style={{
              maskImage: "linear-gradient(to left, rgba(0,0,0,1) 40%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,1) 40%, transparent 100%)",
            }}
          />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left Content */}
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-3 py-0.5 rounded-full border border-amber-200/80">
                  {isTechnician ? "Tim Lapangan Resmi" : "SUPERVISOR & MONITORING"}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-3 py-0.5 rounded-full border border-emerald-200/80">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Siaga Operasional
                </span>
              </div>

              <div className="flex items-center gap-3.5 pt-1">
                <div className="w-13 h-13 rounded-2xl bg-[#0D1B4A] flex items-center justify-center text-amber-400 shrink-0 shadow-md">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                    Dashboard Tim: <span className="text-[#F59E0B]">{activeTeam === "ALL" ? "Semua Tim Lapangan" : activeTeam}</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Halo, <span className="font-semibold text-slate-800">{profile?.full_name || "Teknisi"}</span>!{" "}
                    {isTechnician ? (
                      <span>Anda bertugas di tim <b>{activeTeam}</b>.</span>
                    ) : (
                      <span>Anda login sebagai <b>{profile?.role === "admin" ? "Administrator" : "Operator"}</b> (Mode Supervisi).</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Card: Supervisor Tim Box */}
            <div className="self-start md:self-auto shrink-0">
              {isSupervisor ? (
                <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 shadow-sm min-w-[260px] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Users className="w-3.5 h-3.5 text-blue-600" /> Supervisi Tim:
                    </span>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                      Admin Mode
                    </span>
                  </div>
                  <select
                    value={activeTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-[#F59E0B]"
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
                <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-400 text-[#0D1B4A] flex items-center justify-center font-bold text-xs shrink-0">
                    <HardHat className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Regu Anda</p>
                    <p className="text-sm font-black text-slate-900 tracking-tight">{activeTeam}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar Pengerjaan Tim (Persis seperti Mockup) */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-800 flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-blue-600" />
                Progres Pekerjaan Tim {activeTeam}
              </span>
              <span className="text-slate-900">
                {stats.selesai} dari {stats.total} Selesai ({stats.percentage}%)
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 4 KARTU METRIK PERSIS GAMBAR MOCKUP                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Tugas Tim */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Total Tugas Tim
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{stats.total}</span>
              <span className="text-xs font-bold text-emerald-600">↑ 12%</span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Dari periode sebelumnya</p>
          </div>
        </div>

        {/* Waiting List */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-amber-600 uppercase">
              Waiting List
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-500">{stats.waiting}</span>
              <span className="text-xs font-bold text-emerald-600">↑ 8%</span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Menunggu penugasan</p>
          </div>
        </div>

        {/* Selesai Berhasil */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-emerald-700 uppercase">
              Selesai Berhasil
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.selesai}</span>
              <span className="text-xs font-bold text-emerald-600">↑ 20%</span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Pekerjaan selesai</p>
          </div>
        </div>

        {/* Ada Kendala */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-rose-600 uppercase">
              Ada Kendala
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-rose-600">{stats.gagal}</span>
              <span className="text-xs font-medium text-slate-400">0%</span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Perlu perhatian</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TABS SWITCHER & SEARCH (PERSIS SEPERTI GAMBAR)                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Buttons Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            onClick={() => setViewMode("KANBAN")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === "KANBAN"
                ? "bg-[#0D1B4A] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-amber-400" />
            <span>Kanban Board Tim</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/20 text-white">
              {teamTasks.length}
            </span>
          </button>

          <button
            onClick={() => setViewMode("LIST")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === "LIST"
                ? "bg-[#0D1B4A] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <ListFilter className="w-4 h-4 text-blue-500" />
            <span>Daftar Tugas (Run-Sheet)</span>
          </button>

          <button
            onClick={() => setViewMode("ODP_TOOL")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === "ODP_TOOL"
                ? "bg-[#0D1B4A] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <Wifi className="w-4 h-4 text-emerald-500" />
            <span>Cek Port ODP</span>
          </button>
        </div>

        {/* Search Bar Right */}
        {viewMode !== "ODP_TOOL" && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari pelanggan / alamat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none shadow-2xs"
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
      {/* 4. KANBAN 4 KOLOM PERSIS GAMBAR MOCKUP                                    */}
      {/* ========================================================================= */}
      {viewMode === "KANBAN" && (
        <div>
          {/* Mobile Column Quick Filter Pills (sm:hidden) */}
          <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
            <button
              onClick={() => setMobileKanbanCol("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                mobileKanbanCol === "ALL" ? "bg-[#0D1B4A] text-white" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Semua ({searchedTasks.length})
            </button>
            {KANBAN_COLS.map((col) => {
              const count = searchedTasks.filter((t) => t.status === col.key).length;
              return (
                <button
                  key={col.key}
                  onClick={() => setMobileKanbanCol(col.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
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

          {/* 4 Kolom Grid */}
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
                  className={`bg-slate-50/60 rounded-3xl border transition-all p-3 space-y-3 min-h-[460px] ${
                    isOver ? "border-amber-400 bg-amber-50/40 ring-2 ring-amber-300" : "border-slate-200/80"
                  }`}
                >
                  {/* Column Header persis gambar */}
                  <div className="flex items-center justify-between pb-2 px-1">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full ${col.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                        <ColIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 leading-tight">{col.label}</h3>
                        <p className="text-[10px] text-slate-400 font-medium">{col.sublabel}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white text-slate-700 font-extrabold text-xs shadow-2xs border border-slate-200">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Cards inside column */}
                  <div className="space-y-3">
                    {colTasks.length === 0 ? (
                      /* Empty state persis di gambar */
                      <div className="p-8 text-center rounded-2xl bg-white/60 border border-dashed border-slate-200/90 my-2 space-y-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                          {col.key === "GAGAL" ? <AlertTriangle className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
                        </div>
                        <p className="text-xs font-bold text-slate-700">Tidak ada tugas di kolom ini.</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed max-w-[180px] mx-auto">
                          {col.key === "GAGAL"
                            ? "Tidak ada kendala yang perlu ditangani saat ini."
                            : "Semua pekerjaan sedang dalam proses atau sudah selesai."}
                        </p>
                      </div>
                    ) : (
                      colTasks.map((task) => renderCard(task))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. DAFTAR TUGAS (RUN SHEET)                                               */}
      {/* ========================================================================= */}
      {viewMode === "LIST" && (
        <div className="space-y-3 max-w-4xl mx-auto">
          {searchedTasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-30 mb-2" />
              <h3 className="text-base font-bold text-slate-800">Tidak ada tugas pada filter ini</h3>
              <p className="text-xs text-slate-400 mt-1">Semua pekerjaan terpantau aman.</p>
            </div>
          ) : (
            searchedTasks.map((task) => renderCard(task))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CEK PORT ODP LAPANGAN                                                  */}
      {/* ========================================================================= */}
      {viewMode === "ODP_TOOL" && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-5">
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
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all space-y-1.5"
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
      {/* 7. MODALS (SELESAI & KENDALA)                                             */}
      {/* ========================================================================= */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 border border-slate-100 max-h-[92vh] overflow-y-auto">
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

      {kendalaTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 border border-slate-100 max-h-[92vh] overflow-y-auto">
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
