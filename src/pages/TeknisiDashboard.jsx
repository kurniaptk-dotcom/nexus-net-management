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
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePersistState } from "../hooks/usePersistState";
import { pekerjaanList, initialTimData, odpOdcList } from "../data/mockData";
import Toast from "../components/Toast";

// Format WhatsApp number to Indonesian standard
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

// Optical dBm Quality evaluation
function getDbmQuality(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return null;
  const abs = Math.abs(num);
  if (abs >= 15 && abs <= 22.99) {
    return {
      status: "PRIMA",
      label: "Sangat Bagus (Prima)",
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      dot: "bg-emerald-500",
    };
  }
  if (abs >= 23 && abs <= 25.99) {
    return {
      status: "WASPADA",
      label: "Cukup / Waspada Redaman",
      color: "text-amber-700 bg-amber-50 border-amber-200",
      dot: "bg-amber-500",
    };
  }
  return {
    status: "BURUK",
    label: "Redaman Buruk / Resiko LOS",
    color: "text-rose-700 bg-rose-50 border-rose-200",
    dot: "bg-rose-500",
  };
}

export default function TeknisiDashboard() {
  const { profile } = useAuth();
  const [pekerjaan, setPekerjaan] = usePersistState("xnet_pekerjaan", pekerjaanList);
  const [odpList] = usePersistState("xnet_odpodc", odpOdcList);
  const [activeTeam, setActiveTeam] = usePersistState("xnet_active_tech_team", "AZWAR - RIO");

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | PENDING | SELESAI
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
    const pasangBaru = teamTasks.filter((t) => t.jenis === "PEMASANGAN").length;
    const perbaikan = teamTasks.filter((t) => t.jenis === "PERBAIKAN" || t.jenis === "PERBAIKAN KHUSUS (ODP/ODC)").length;
    const percentage = total > 0 ? Math.round((selesai / total) * 100) : 0;
    return { total, selesai, pending, gagal, pasangBaru, perbaikan, percentage };
  }, [teamTasks]);

  // Handle Mark In-Progress
  const handleStartTask = (task) => {
    setPekerjaan((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: "DIJADWALKAN", keterangan: (t.keterangan ? t.keterangan + " · " : "") + "Sedang menuju lokasi / pengerjaan" } : t))
    );
    triggerToast(`Status pekerjaan ${task.pelanggan} diubah ke Sedang Dikerjakan.`, "info");
  };

  // Handle Submit Completion
  const handleCompleteSubmit = (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    const redamanStr = completionForm.redaman ? `Redaman: ${completionForm.redaman} dBm` : "";
    const snStr = completionForm.serialNumber ? `SN: ${completionForm.serialNumber}` : "";
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

    triggerToast(`Selamat! Pekerjaan "${selectedTask.pelanggan}" berhasil diselesaikan.`, "success");
    setSelectedTask(null);
    setCompletionForm({ redaman: "-19.5", serialNumber: "", odpPort: "", catatan: "" });
  };

  // Handle Submit Kendala (GAGAL)
  const handleKendalaSubmit = (e) => {
    e.preventDefault();
    if (!kendalaTask) return;

    const reason = `[KENDALA LAPANGAN] ${kendalaForm.alasan}${kendalaForm.catatan ? " - " + kendalaForm.catatan : ""}`;

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

    triggerToast(`Status pekerjaan "${kendalaTask.pelanggan}" dicatat ada kendala.`, "info");
    setKendalaTask(null);
    setKendalaForm({ alasan: "Pelanggan tidak ada di rumah / kosong", catatan: "" });
  };

  // ODP Quick Search
  const filteredOdps = useMemo(() => {
    if (!odpQuery.trim()) return odpList.slice(0, 8);
    const q = odpQuery.toLowerCase().trim();
    return odpList.filter((o) => (o.nama || "").toLowerCase().includes(q) || (o.odc || "").toLowerCase().includes(q) || (o.keterangan || "").toLowerCase().includes(q));
  }, [odpList, odpQuery]);

  const dbmQuality = useMemo(() => getDbmQuality(completionForm.redaman), [completionForm.redaman]);

  return (
    <div className="space-y-5 pb-8 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast((prev) => ({ ...prev, show: false }))} />
      )}

      {/* Top Banner & Active Team Selector */}
      <div className="bg-gradient-to-r from-[#0D1B4A] to-[#1e295d] text-white rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                  Portal Lapangan
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Siaga Operasional
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1 text-white">
                Dashboard Tim Teknisi
              </h1>
              <p className="text-xs text-white/70">
                Halo, {profile?.full_name || "Teknisi"}! Siap melayani pelanggan dengan sinyal terbaik.
              </p>
            </div>
          </div>

          {/* Team Switcher Pill */}
          <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 flex items-center gap-2 self-start md:self-auto">
            <Users className="w-4 h-4 text-amber-400 ml-2 shrink-0" />
            <div className="flex items-center gap-1">
              {initialTimData.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTeam(t.nama)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTeam.toUpperCase() === t.nama.toUpperCase()
                      ? "bg-[#F59E0B] text-[#0D1B4A] shadow-md scale-102"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {t.nama}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Progress Bar Target Hari Ini */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
            <span className="text-white/90 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Progres Pengerjaan Tim {activeTeam}
            </span>
            <span className="text-amber-300">
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

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">Total Tugas</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{stats.total}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0D1B4A] flex items-center justify-center shrink-0">
            <Layers className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-500">Antrean / Sisa</p>
            <p className="text-xl sm:text-2xl font-black text-[#F59E0B] mt-0.5">{stats.pending}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#F59E0B] flex items-center justify-center shrink-0">
            <Clock className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600">Selesai Berhasil</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">{stats.selesai}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-500">Kendala / Gagal</p>
            <p className="text-xl sm:text-2xl font-black text-rose-600 mt-0.5">{stats.gagal}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>

      {/* Main Tab Navigation: Run-Sheet Tugas vs Cek Port ODP */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("TASKS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "TASKS"
              ? "bg-[#0D1B4A] text-white shadow-sm"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
          }`}
        >
          <Wrench className="w-4 h-4 text-amber-400" />
          <span>Daftar Tugas Tim ({teamTasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("ODP_TOOL")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "ODP_TOOL"
              ? "bg-[#0D1B4A] text-white shadow-sm"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
          }`}
        >
          <Wifi className="w-4 h-4 text-emerald-500" />
          <span>Alat Cek Port ODP Lapangan</span>
        </button>
      </div>

      {/* TAB 1: RUN SHEET DAFTAR TUGAS */}
      {activeTab === "TASKS" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari pelanggan, alamat, ODP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
              {[
                { id: "ALL", label: "Semua Tugas" },
                { id: "PENDING", label: "Belum Selesai" },
                { id: "SELESAI", label: "Selesai" },
                { id: "GAGAL", label: "Kendala" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? "bg-[#0D1B4A] text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Task Cards List */}
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-30 mb-2" />
              <h3 className="text-base font-bold text-gray-800">Tidak ada tugas pada filter ini</h3>
              <p className="text-xs text-gray-400 mt-1">
                Semua pekerjaan untuk Tim {activeTeam} terpantau aman dan rapi.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task, index) => {
                const isCompleted = task.status === "SELESAI";
                const isFailed = task.status === "GAGAL";
                const isScheduled = task.status === "DIJADWALKAN";
                const cleanWaPhone = formatPhoneForWa(task.telepon || "081234567890");

                const waMessage = `Halo Bpk/Ibu ${task.pelanggan}, kami dari Tim Teknisi Nexus Net (${activeTeam}). Kami sedang dalam perjalanan menuju lokasi Anda di ${task.alamat} untuk pekerjaan ${task.jenis}. Apakah Anda saat ini berada di rumah?`;

                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-sm hover:shadow-md ${
                      isCompleted
                        ? "border-emerald-200/80 bg-emerald-50/10"
                        : isFailed
                        ? "border-rose-200 bg-rose-50/10"
                        : isScheduled
                        ? "border-blue-300 ring-2 ring-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      {/* Left: Info */}
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-6 h-6 rounded-lg bg-gray-100 text-gray-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                            #{index + 1}
                          </span>

                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider ${
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
                            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
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

                          {task.odp && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <Wifi className="w-3 h-3" />
                              {task.odp}
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                            {task.pelanggan}
                          </h4>
                          <div className="flex items-start gap-1.5 text-xs text-gray-600 mt-1">
                            <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <span className="font-medium leading-relaxed">{task.alamat}</span>
                          </div>
                        </div>

                        {task.keterangan && (
                          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-600">
                            <span className="font-bold text-gray-700">Catatan: </span>
                            {task.keterangan}
                          </div>
                        )}
                      </div>

                      {/* Right: Quick Action Buttons */}
                      <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        {/* Maps Button */}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.alamat)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-bold border border-blue-200 transition-all cursor-pointer grow sm:grow-0"
                          title="Buka Rute di Google Maps"
                        >
                          <Navigation className="w-3.5 h-3.5 text-blue-600" />
                          <span>Rute Maps</span>
                        </a>

                        {/* WhatsApp Button */}
                        <a
                          href={`https://wa.me/${cleanWaPhone}?text=${encodeURIComponent(waMessage)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-all cursor-pointer grow sm:grow-0"
                          title="Kirim pesan WhatsApp ke pelanggan"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Chat WA</span>
                        </a>

                        {!isCompleted && (
                          <>
                            {/* Mulai Kerja */}
                            {!isScheduled && (
                              <button
                                onClick={() => handleStartTask(task)}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-bold border border-indigo-200 transition-all cursor-pointer grow sm:grow-0"
                              >
                                <Radio className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Mulai Kerja</span>
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
                              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#0D1B4A] hover:bg-[#1a237e] text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer grow sm:grow-0"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Selesai</span>
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
                              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-rose-50 text-gray-600 hover:text-rose-700 rounded-xl text-[11px] font-semibold transition-all cursor-pointer grow sm:grow-0"
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                              <span>Ada Kendala</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TOOL CEK PORT ODP LAPANGAN */}
      {activeTab === "ODP_TOOL" && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Wifi className="w-5 h-5 text-emerald-600" />
                Pengecekan ODP & Port Lapangan
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Cari tiang distribusi ODP terdekat untuk memastikan ketersediaan port & jalur fiber
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama ODP / ODC..."
                value={odpQuery}
                onChange={(e) => setOdpQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredOdps.map((odp) => {
              const isAman = odp.status === "Aman";
              return (
                <div
                  key={odp.id}
                  className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{odp.odc}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isAman ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {odp.status || "Siap"}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 mt-1">{odp.nama}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{odp.keterangan || "Jalur fiber optik normal"}</p>
                </div>
              );
            })}
          </div>

          {/* Panduan Redaman dBm Standar */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs space-y-2 mt-4">
            <h5 className="font-bold text-[#0D1B4A] flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-blue-600" />
              Standar Optical Power Meter (dBm) Nexus Net:
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2 rounded-xl bg-white border border-emerald-200 text-emerald-800 font-semibold">
                🟢 -15.0 s/d -22.9 dBm: <span className="font-normal">Kondisi Prima & Sangat Stabil</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-amber-200 text-amber-800 font-semibold">
                🟡 -23.0 s/d -25.9 dBm: <span className="font-normal">Cukup, Disarankan Cek Sambungan</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-rose-200 text-rose-800 font-semibold">
                🔴 &gt; -26.0 dBm: <span className="font-normal">Kritis / Resiko Sinyal Putus (LOS)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LAPORAN SELESAI */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-5 sm:p-6 border border-gray-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Laporan Selesai Pengerjaan</h3>
                  <p className="text-xs text-gray-500">{selectedTask.pelanggan} · {selectedTask.jenis}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="mt-4 space-y-4">
              {/* Redaman Optical Power Meter */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Hasil Pengukuran Redaman (dBm)
                  </label>
                  {dbmQuality && (
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border ${dbmQuality.color}`}>
                      <span className={`w-2 h-2 rounded-full ${dbmQuality.dot}`} />
                      {dbmQuality.label}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Gauge className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={completionForm.redaman}
                    onChange={(e) => setCompletionForm({ ...completionForm, redaman: e.target.value })}
                    placeholder="Contoh: -19.5"
                    className="w-full pl-10 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    dBm
                  </span>
                </div>
              </div>

              {/* Serial Number ONT */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Nomor Seri (SN) / MAC Modem ONT
                </label>
                <input
                  type="text"
                  value={completionForm.serialNumber}
                  onChange={(e) => setCompletionForm({ ...completionForm, serialNumber: e.target.value })}
                  placeholder="Contoh: ZTEGC1234567 atau HWTC89ABC"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase font-mono focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                />
              </div>

              {/* ODP & Port */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  ODP & Nomor Port Terpakai
                </label>
                <input
                  type="text"
                  value={completionForm.odpPort}
                  onChange={(e) => setCompletionForm({ ...completionForm, odpPort: e.target.value })}
                  placeholder="Contoh: ODP 1.2 Port 4"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                />
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Catatan Lapangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={completionForm.catatan}
                  onChange={(e) => setCompletionForm({ ...completionForm, catatan: e.target.value })}
                  placeholder="Contoh: Kabel dropcore 110 meter, penempatan ONT di ruang tengah aman."
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
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

      {/* MODAL LAPOR KENDALA (GAGAL) */}
      {kendalaTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-5 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Lapor Kendala Lapangan</h3>
                  <p className="text-xs text-gray-500">{kendalaTask.pelanggan}</p>
                </div>
              </div>
              <button onClick={() => setKendalaTask(null)} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleKendalaSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Penyebab / Alasan Kendala
                </label>
                <select
                  value={kendalaForm.alasan}
                  onChange={(e) => setKendalaForm({ ...kendalaForm, alasan: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Rincian Penjelasan
                </label>
                <textarea
                  rows={2}
                  value={kendalaForm.catatan}
                  onChange={(e) => setKendalaForm({ ...kendalaForm, catatan: e.target.value })}
                  placeholder="Tambahkan info untuk admin / tim jadwal ulang..."
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setKendalaTask(null)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
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
