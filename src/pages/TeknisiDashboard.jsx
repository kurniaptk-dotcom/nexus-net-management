import { useState, useMemo } from "react";
import {
  HardHat,
  Wrench,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  ExternalLink,
  Gauge,
  Wifi,
  AlertTriangle,
  Users,
  Search,
  Check,
  X,
  Navigation,
  Sparkles,
  ChevronRight,
  Radio,
  FileCheck,
  ShieldCheck,
  Layers,
  ArrowRight,
  CheckCircle,
  Hash,
  Send,
  SlidersHorizontal,
  RefreshCw,
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
      barWidth: "90%",
      barColor: "bg-emerald-500",
    };
  }
  if (abs >= 23 && abs <= 25.99) {
    return {
      status: "WASPADA",
      label: "Cukup / Waspada (-23 s/d -25.9 dBm)",
      color: "text-amber-700 bg-amber-50 border-amber-200",
      dot: "bg-amber-500",
      barWidth: "60%",
      barColor: "bg-amber-500",
    };
  }
  return {
    status: "BURUK",
    label: "Redaman Buruk / Resiko LOS (> -26 dBm)",
    color: "text-rose-700 bg-rose-50 border-rose-200",
    dot: "bg-rose-500",
    barWidth: "30%",
    barColor: "bg-rose-500",
  };
}

export default function TeknisiDashboard() {
  const { profile } = useAuth();
  const [pekerjaan, setPekerjaan] = usePersistState("xnet_pekerjaan", pekerjaanList);
  const [odpList] = usePersistState("xnet_odpodc", odpOdcList);
  const [activeTeam, setActiveTeam] = usePersistState("xnet_active_tech_team", "AZWAR - RIO");

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | PENDING | SELESAI | GAGAL
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TASKS"); // TASKS | ODP_TOOL

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

  // ODP Search Tool
  const [odpQuery, setOdpQuery] = useState("");

  // Toast
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const triggerToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  // Filter tasks for active technician team
  const teamTasks = useMemo(() => {
    return pekerjaan.filter((p) => (p.tim || "").toUpperCase() === activeTeam.toUpperCase());
  }, [pekerjaan, activeTeam]);

  // Filtered by status and search
  const filteredTasks = useMemo(() => {
    return teamTasks.filter((t) => {
      const matchStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "PENDING"
          ? t.status === "WAITING LIST" || t.status === "DIJADWALKAN"
          : statusFilter === "SELESAI"
          ? t.status === "SELESAI"
          : t.status === statusFilter;

      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        (t.pelanggan || "").toLowerCase().includes(q) ||
        (t.alamat || "").toLowerCase().includes(q) ||
        (t.odp || "").toLowerCase().includes(q) ||
        (t.telepon || "").includes(q) ||
        (t.jenis || "").toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }, [teamTasks, statusFilter, search]);

  // Metrics
  const stats = useMemo(() => {
    const total = teamTasks.length;
    const selesai = teamTasks.filter((t) => t.status === "SELESAI").length;
    const pending = teamTasks.filter((t) => t.status === "WAITING LIST" || t.status === "DIJADWALKAN").length;
    const gagal = teamTasks.filter((t) => t.status === "GAGAL").length;
    const percentage = total > 0 ? Math.round((selesai / total) * 100) : 0;
    return { total, selesai, pending, gagal, percentage };
  }, [teamTasks]);

  // Handle Mark In-Progress
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
    triggerToast(`Status pekerjaan ${task.pelanggan} diubah ke: Sedang Dikerjakan.`, "info");
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
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast((prev) => ({ ...prev, show: false }))} />
      )}

      {/* TOP HERO BANNER */}
      <div className="bg-gradient-to-br from-[#0D1B4A] via-[#14235e] to-[#1e327a] text-white rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden border border-white/10">
        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 translate-y-8 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                <HardHat className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-400/15 px-2.5 py-0.5 rounded-md border border-amber-400/25">
                    Portal Lapangan
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-md border border-emerald-400/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Siaga Operasional
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Dashboard Tim Teknisi
                </h1>
                <p className="text-xs sm:text-sm text-slate-200 mt-0.5">
                  Halo, <span className="font-semibold text-white">{profile?.full_name || "Teknisi"}</span>! Kelola dan laporkan tugas lapangan dengan cepat dan presisi.
                </p>
              </div>
            </div>

            {/* Team Selector Control */}
            <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 flex flex-col gap-1 sm:self-auto">
              <div className="flex items-center gap-1.5 px-2 pt-0.5 text-xs font-semibold text-slate-300">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Pilih Tim Aktif:</span>
              </div>
              <div className="flex items-center gap-1">
                {initialTimData.map((t) => {
                  const isActive = activeTeam.toUpperCase() === t.nama.toUpperCase();
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTeam(t.nama)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#F59E0B] text-[#0D1B4A] shadow-md scale-102"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {t.nama}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Progress Bar Target Hari Ini */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
              <span className="text-slate-200 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Progres Pengerjaan Tim <span className="text-white font-bold">{activeTeam}</span>
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

      {/* 4 STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Tugas */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Tugas</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0D1B4A] flex items-center justify-center shrink-0 border border-blue-100">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Antrean / Belum Selesai */}
        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs hover:border-amber-300 transition-all flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Antrean / Sisa</p>
            <p className="text-2xl font-bold text-[#F59E0B] mt-1">{stats.pending}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-[#F59E0B] flex items-center justify-center shrink-0 border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Selesai Berhasil */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-xs hover:border-emerald-300 transition-all flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Selesai Berhasil</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.selesai}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Kendala / Gagal */}
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

      {/* MAIN TAB SWITCHER */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("TASKS")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "TASKS"
              ? "bg-[#0D1B4A] text-white shadow-sm"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Wrench className="w-4 h-4 text-amber-400" />
          <span>Daftar Tugas Tim ({teamTasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("ODP_TOOL")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "ODP_TOOL"
              ? "bg-[#0D1B4A] text-white shadow-sm"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Wifi className="w-4 h-4 text-emerald-500" />
          <span>Cek Port ODP Lapangan</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAFTAR TUGAS TIM (RUN SHEET) */}
      {/* ========================================================================= */}
      {activeTab === "TASKS" && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, alamat, no. telepon, ODP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
              {[
                { id: "ALL", label: "Semua", count: teamTasks.length },
                { id: "PENDING", label: "Belum Selesai", count: stats.pending },
                { id: "SELESAI", label: "Selesai", count: stats.selesai },
                { id: "GAGAL", label: "Kendala", count: stats.gagal },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === tab.id
                      ? "bg-[#0D1B4A] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      statusFilter === tab.id
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* List of Task Cards */}
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-100">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Tidak ada tugas pada filter ini</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Semua pekerjaan untuk Tim {activeTeam} terpantau terkelola dengan baik.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredTasks.map((task, index) => {
                const isCompleted = task.status === "SELESAI";
                const isFailed = task.status === "GAGAL";
                const isScheduled = task.status === "DIJADWALKAN";
                const cleanWaPhone = formatPhoneForWa(task.telepon || "081234567890");
                const waMessage = `Halo Bpk/Ibu ${task.pelanggan}, kami dari Tim Teknisi Nexus Net (${activeTeam}). Kami sedang dalam perjalanan menuju lokasi Anda di ${task.alamat} untuk pekerjaan ${task.jenis}. Apakah Anda saat ini berada di lokasi?`;

                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-2xl border transition-all shadow-xs hover:shadow-md ${
                      isCompleted
                        ? "border-emerald-200/80 bg-emerald-50/15"
                        : isFailed
                        ? "border-rose-200 bg-rose-50/15"
                        : isScheduled
                        ? "border-blue-300 ring-2 ring-blue-50/60"
                        : "border-slate-200/90"
                    }`}
                  >
                    <div className="p-4 sm:p-5 space-y-3">
                      {/* Top Header Row of Card */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Order Number */}
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                            #{index + 1}
                          </span>

                          {/* Jenis Pekerjaan */}
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

                          {/* Status Badge */}
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

                          {/* ODP Badge */}
                          {task.odp && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                              <Wifi className="w-3.5 h-3.5" />
                              <span>{task.odp}</span>
                            </span>
                          )}
                        </div>

                        {/* Tanggal Jadwal */}
                        {task.tanggal && (
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{task.tanggal}</span>
                          </div>
                        )}
                      </div>

                      {/* Main Info Section */}
                      <div className="space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h4 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                            {task.pelanggan}
                          </h4>
                          {task.telepon && (
                            <a
                              href={`tel:${task.telepon}`}
                              className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 self-start sm:self-auto"
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

                      {/* Notes / Laporan Tambahan */}
                      {task.keterangan && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-700">
                          <span className="font-semibold text-slate-900">Catatan Lapangan: </span>
                          <span className="leading-relaxed">{task.keterangan}</span>
                        </div>
                      )}

                      {/* ACTION TOOLBAR FOOTER */}
                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        {/* Left Action Buttons: WhatsApp & Maps */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Chat WhatsApp */}
                          <a
                            href={`https://wa.me/${cleanWaPhone}?text=${encodeURIComponent(waMessage)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer"
                            title="Chat WhatsApp Pelanggan"
                          >
                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                            <span>Chat WA</span>
                          </a>

                          {/* Rute Google Maps */}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.alamat)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-semibold border border-blue-200 transition-colors cursor-pointer"
                            title="Buka Navigasi Rute Maps"
                          >
                            <Navigation className="w-4 h-4 text-blue-600" />
                            <span>Rute Maps</span>
                          </a>
                        </div>

                        {/* Right Action Buttons: Task Workflow */}
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {!isCompleted && (
                            <>
                              {/* Tombol Lapor Kendala */}
                              <button
                                onClick={() => {
                                  setKendalaTask(task);
                                  setKendalaForm({
                                    alasan: "Pelanggan tidak ada di rumah / kosong",
                                    catatan: "",
                                  });
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-xl text-xs font-semibold border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                <span>Ada Kendala</span>
                              </button>

                              {/* Tombol Mulai Jalan */}
                              {!isScheduled && (
                                <button
                                  onClick={() => handleStartTask(task)}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer"
                                >
                                  <Radio className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Mulai Jalan</span>
                                </button>
                              )}

                              {/* Tombol Selesai */}
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
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TOOL CEK PORT ODP LAPANGAN */}
      {/* ========================================================================= */}
      {activeTab === "ODP_TOOL" && (
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
      {/* MODAL LAPORAN SELESAI PEKERJAAN */}
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
              {/* Hasil Pengukuran Redaman */}
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
                    className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    dBm
                  </span>
                </div>
              </div>

              {/* Serial Number ONT */}
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

              {/* ODP & Port */}
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

              {/* Catatan Lapangan */}
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
      {/* MODAL LAPOR KENDALA (GAGAL) */}
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
