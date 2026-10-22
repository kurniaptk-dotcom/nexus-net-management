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
  WifiOff,
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
  Coins,
  Wallet,
  Award,
  Printer,
  Settings,
  Target,
  FileText,
  RotateCcw,
  Star,
  Info,
  Camera,
  Image as ImageIcon,
  Trash2,
  Eye,
  Upload,
  Network,
  PhoneCall,
  BookOpen,
  ShieldCheck,
  HelpCircle,
  Activity,
  Signal,
  Zap,
  AlertCircle,
  Calendar,
  Gift,
  PieChart,
  Bell,
  ChevronDown,
  ArrowUpRight,
  ArrowRight,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePersistState, useRealtimeStatus } from "../hooks/usePersistState";
import { pekerjaanList, initialTimData, odpOdcList, initialPelangganRadius } from "../data/mockData";
import {
  KOMISI_PEKERJAAN_MASTER,
  KOMISI_MAP,
  DEFAULT_INCENTIVE_CONFIG,
  formatRupiah,
  calculateTeamIncentives,
  calculateTaskIncentive,
  getDefaultWorkItemsForTask,
  extractDbmFromKeterangan,
} from "../lib/incentives";
import { compressAndWatermarkImage, getCurrentLocation } from "../lib/imageCompressor";
import { getOdpPortMap, checkPortCollision, extractPortNumber } from "../lib/portCollision";
import BuktiLapanganModal from "../components/BuktiLapanganModal";
import TaskCompletionModal from "../components/TaskCompletionModal";
import { enrichOdpWithPortUtilization } from "../lib/odpUtilization";
import { uploadTaskEvidenceBundle } from "../lib/storageUpload";
import { syncCustomerOnTaskCompletion } from "../lib/customerPortLifecycle";
import OpticalPowerGauge from "../components/OpticalPowerGauge";
import Toast from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import { formatPhoneWa as formatPhoneForWa } from "../lib/spkGenerator";
import { createWhatsAppUrl } from "../lib/whatsapp";
import { calculateTeamPayroll } from "../lib/payroll";
import SlipGajiModal from "../components/SlipGajiModal";
import {
  getRemainingTimeToCutoff,
  getWibTimeParts,
  evaluateReportSubmissionTime,
} from "../lib/reportCutoff";
import {
  getOfflineQueue,
  addToOfflineQueue,
  removeFromOfflineQueue,
  processOfflineSyncQueue,
} from "../lib/offlineSync";

function parseRecordDate(dStr) {
  if (!dStr) return null;
  const s = String(dStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const match = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
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

// Status Siaga Teknisi Lapangan
const DUTY_STATUS_MAP = {
  READY: {
    key: "READY",
    label: "Siap Bertugas",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    dot: "bg-emerald-500",
    desc: "Siap menerima penugasan & menuju lokasi pelanggan",
  },
  ON_SITE: {
    key: "ON_SITE",
    label: "Sedang di Lokasi",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    dot: "bg-amber-500",
    desc: "Sedang instalasi/perbaikan di tiang atau rumah pelanggan",
  },
  BREAK: {
    key: "BREAK",
    label: "Istirahat / Off",
    badge: "bg-slate-100 text-slate-700 border-slate-300",
    dot: "bg-slate-400",
    desc: "Sedang istirahat makan / sholat sementara",
  },
};

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
  const assignedTeam = profile?.tim || "GATRA - AIS";
  const [selectedTeam, setSelectedTeam] = usePersistState("xnet_active_tech_team", assignedTeam);
  const activeTeam = isTechnician && profile?.tim ? profile.tim : selectedTeam;

  // View Mode: DASHBOARD | KANBAN | LIST | ODP_TOOL | WALLET
  const [viewMode, setViewMode] = usePersistState("xnet_active_tech_view_mode", "DASHBOARD");
  const [dashboardStatusPeriod, setDashboardStatusPeriod] = useState("CURRENT_MONTH");
  const [dashboardStatPeriod, setDashboardStatPeriod] = useState("Mingguan");
  const [activeActionTaskId, setActiveActionTaskId] = useState(null);

  // Status Siaga Operasional Teknisi (Interactive Duty Presence)
  const [dutyStatus, setDutyStatus] = usePersistState("xnet_tech_duty_status", "READY");
  const [showOpmGuideModal, setShowOpmGuideModal] = useState(false);
  const [showNocContactModal, setShowNocContactModal] = useState(false);
  const [showSopModal, setShowSopModal] = useState(false);

  // Status Koneksi Jaringan & Sinkronisasi Offline Lapangan (PWA Anti-Blankspot)
  const { isOnline } = useRealtimeStatus();
  const [offlineQueue, setOfflineQueue] = useState(() => getOfflineQueue());
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  // Dynamic Live Timer Cut-Off Pk 21:00 WIB (Interval Realtime)
  const [cutoffRemaining, setCutoffRemaining] = useState(() => getRemainingTimeToCutoff());
  useEffect(() => {
    const update = () => setCutoffRemaining(getRemainingTimeToCutoff());
    update();
    const timer = setInterval(update, 20000);
    return () => clearInterval(timer);
  }, []);

  // Sinkronisasi status antrean offline dari storage event
  useEffect(() => {
    const handleQueueUpdated = (e) => {
      setOfflineQueue(e.detail?.queue || getOfflineQueue());
    };
    window.addEventListener("xnet_offline_queue_updated", handleQueueUpdated);
    return () => {
      window.removeEventListener("xnet_offline_queue_updated", handleQueueUpdated);
    };
  }, []);

  // Search & Filter Kolom Mobile
  const [search, setSearch] = useState("");
  const [mobileKanbanCol, setMobileKanbanCol] = useState("ALL");

  // State Pelanggan Radius untuk live port calculation ODP & sinkronisasi port otomatis
  const [pelangganList, setPelangganList] = usePersistState("xnet_pelanggan_radius", initialPelangganRadius);
  const [viewEvidenceTask, setViewEvidenceTask] = useState(null);
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);

  // Completion Modal State (SOP Laporan 1 Foto Bukti Lapangan)
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedOdpForTask, setSelectedOdpForTask] = useState("");
  const [completionForm, setCompletionForm] = useState({
    redaman: "-19.5",
    serialNumber: "",
    odp: "",
    catatan: "",
    fotoBuktiUtama: null,
    fotoOpm: null,
    fotoDropcore: null,
    fotoModem: null,
  });
  const [completionWorkItems, setCompletionWorkItems] = useState([]);
  const [selectedAddItem, setSelectedAddItem] = useState("");

  // Handler Upload 1 Foto Bukti Lapangan dengan Kompresi Otomatis & Watermark GPS
  const handlePhotoUpload = async (e, type = "fotoBuktiUtama") => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      triggerToast("Mengambil titik GPS & membubuhkan watermark QC...", "info");
      const location = await getCurrentLocation();

      const typeLabels = {
        fotoBuktiUtama: "Dokumentasi Lapangan",
        fotoOpm: "Hasil Redaman OPM",
        fotoDropcore: "Tiang Dropcore ODP",
        fotoModem: "Barcode Modem ONT",
      };

      const watermarkOptions = {
        label: typeLabels[type] || "Dokumentasi Lapangan",
        odp: selectedOdpForTask || selectedTask?.odp || "ODP",
        customer: selectedTask?.pelanggan || "Pelanggan",
        technician: selectedTask?.tim || activeTeam || "Tim Teknisi",
        location: location,
      };

      const base64 = await compressAndWatermarkImage(file, watermarkOptions, 800, 800, 0.65);
      setCompletionForm((prev) => ({
        ...prev,
        fotoBuktiUtama: base64,
        fotoOpm: base64,
        fotoModem: base64,
        [type]: base64,
      }));
      triggerToast("1 Foto Bukti Utama berhasil distempel GPS & dilampirkan!", "success");
    } catch (err) {
      console.warn("Watermark error, fallback direct base64:", err);
      const reader = new FileReader();
      reader.onload = () => {
        setCompletionForm((prev) => ({
          ...prev,
          fotoBuktiUtama: reader.result,
          fotoOpm: reader.result,
          fotoModem: reader.result,
          [type]: reader.result,
        }));
        triggerToast("1 Foto Bukti Utama berhasil dilampirkan!", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (type = "fotoBuktiUtama") => {
    setCompletionForm((prev) => ({
      ...prev,
      fotoBuktiUtama: null,
      fotoOpm: null,
      fotoDropcore: null,
      fotoModem: null,
      [type]: null,
    }));
  };

  // Trouble Modal State
  const [kendalaTask, setKendalaTask] = useState(null);
  const [kendalaForm, setKendalaForm] = useState({
    alasan: "Pelanggan tidak ada di rumah / kosong",
    catatan: "",
  });

  // Drag and drop state (desktop)
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  // ODP Search Tool & Port Enrichment
  const [odpQuery, setOdpQuery] = useState("");

  // Toast
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const triggerToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  // Sistem Insentif, Fee & Bonus Teknisi
  const [masterKomisi, setMasterKomisi] = usePersistState("xnet_master_komisi", KOMISI_PEKERJAAN_MASTER);
  const [rawIncentiveConfig, setIncentiveConfig] = usePersistState("xnet_incentive_config", DEFAULT_INCENTIVE_CONFIG);
  const incentiveConfig = useMemo(() => {
    const masterRates = (masterKomisi || []).reduce((acc, m) => {
      acc[m.id] = m.tarif;
      return acc;
    }, {});
    return {
      ...DEFAULT_INCENTIVE_CONFIG,
      ...(rawIncentiveConfig || {}),
      itemRates: {
        ...DEFAULT_INCENTIVE_CONFIG.itemRates,
        ...(rawIncentiveConfig?.itemRates || {}),
        ...masterRates,
      },
      qualityBonus: {
        ...DEFAULT_INCENTIVE_CONFIG.qualityBonus,
        ...(rawIncentiveConfig?.qualityBonus || {}),
        enabled: false,
        amount: 0,
      },
    };
  }, [rawIncentiveConfig, masterKomisi]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showResetConfigConfirm, setShowResetConfigConfirm] = useState(false);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [configForm, setConfigForm] = useState(incentiveConfig);

  // Periode Cut-off Penggajian Dompet Teknisi
  const [walletPeriod, setWalletPeriod] = useState("THIS_MONTH"); // "THIS_MONTH", "LAST_MONTH", "ALL", "CUSTOM"
  const [cutoffStart, setCutoffStart] = useState("");
  const [cutoffEnd, setCutoffEnd] = useState("");

  // Filter tugas berdasarkan periode cut-off dompet
  const walletFilteredTasks = useMemo(() => {
    if (walletPeriod === "ALL") return pekerjaan;

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    return pekerjaan.filter((p) => {
      const dateStr = p.waktu_selesai || p.tanggal;
      if (!dateStr) return true;

      const d = parseRecordDate(dateStr) || new Date(dateStr);
      if (isNaN(d.getTime())) return true;

      if (walletPeriod === "THIS_MONTH") {
        return d.getFullYear() === curYear && d.getMonth() === curMonth;
      }
      if (walletPeriod === "LAST_MONTH") {
        const lastMonthDate = new Date(curYear, curMonth - 1, 1);
        return d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() === lastMonthDate.getMonth();
      }
      if (walletPeriod === "CUSTOM") {
        const start = cutoffStart ? new Date(cutoffStart + "T00:00:00") : null;
        const end = cutoffEnd ? new Date(cutoffEnd + "T23:59:59") : null;
        const t = d.getTime();
        if (start && t < start.getTime()) return false;
        if (end && t > end.getTime()) return false;
        return true;
      }
      return true;
    });
  }, [pekerjaan, walletPeriod, cutoffStart, cutoffEnd]);

  const walletPeriodLabel = useMemo(() => {
    const now = new Date();
    if (walletPeriod === "THIS_MONTH") {
      return `Bulan Ini (${now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })})`;
    }
    if (walletPeriod === "LAST_MONTH") {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `Bulan Lalu (${prev.toLocaleDateString("id-ID", { month: "long", year: "numeric" })})`;
    }
    if (walletPeriod === "CUSTOM") {
      return `${cutoffStart || "Awal"} s/d ${cutoffEnd || "Sekarang"}`;
    }
    return "Semua Periode";
  }, [walletPeriod, cutoffStart, cutoffEnd]);

  // Filter tugas untuk tim aktif
  const teamTasks = useMemo(() => {
    if (activeTeam === "ALL") return pekerjaan;
    return pekerjaan.filter((p) => (p.tim || "").toUpperCase() === activeTeam.toUpperCase());
  }, [pekerjaan, activeTeam]);

  // Tugas yang memerlukan revisi dari SPV (revisi_catatan && status !== 'SELESAI')
  const revisionTasks = useMemo(() => {
    return teamTasks.filter((t) => Boolean(t.revisi_catatan) && t.status !== "SELESAI");
  }, [teamTasks]);

  // Perhitungan insentif otomatis tim aktif sesuai cut-off periode dompet
  const teamIncentives = useMemo(() => {
    return calculateTeamIncentives(walletFilteredTasks, activeTeam, incentiveConfig, masterKomisi);
  }, [walletFilteredTasks, activeTeam, incentiveConfig, masterKomisi]);

  // Perhitungan slip gaji resmi tim aktif
  const technicianPayrollData = useMemo(() => {
    const targetTeam = activeTeam === "ALL" ? (profile?.tim || "GATRA - AIS") : activeTeam;
    return calculateTeamPayroll({
      timNama: targetTeam,
      tasks: walletFilteredTasks,
      periodLabel: walletPeriodLabel,
      config: incentiveConfig,
      masterList: masterKomisi,
    });
  }, [activeTeam, profile, walletFilteredTasks, walletPeriodLabel, incentiveConfig, masterKomisi]);

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

  const currentMonthLabel = useMemo(() => {
    return new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  }, []);

  const prevMonthLabel = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  }, []);

  // Filter tugas untuk tim aktif berdasarkan pilihan periode dashboard
  const dashboardTasksForPeriod = useMemo(() => {
    if (dashboardStatusPeriod === "ALL") return teamTasks;

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    return teamTasks.filter((p) => {
      const dateStr = p.waktu_selesai || p.tanggal;
      if (!dateStr) return true;
      const d = parseRecordDate(dateStr) || new Date(dateStr);
      if (isNaN(d.getTime())) return true;

      if (dashboardStatusPeriod === "CURRENT_MONTH") {
        return d.getFullYear() === curYear && d.getMonth() === curMonth;
      }
      if (dashboardStatusPeriod === "PREV_MONTH") {
        const prev = new Date(curYear, curMonth - 1, 1);
        return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth();
      }
      return true;
    });
  }, [teamTasks, dashboardStatusPeriod]);

  // Metrik Statistik Dashboard Berdasarkan Periode Pilihan
  const dashboardStats = useMemo(() => {
    const total = dashboardTasksForPeriod.length;
    const selesai = dashboardTasksForPeriod.filter((t) => t.status === "SELESAI" || t.status === "MENUNGGU VALIDASI").length;
    const waiting = dashboardTasksForPeriod.filter((t) => t.status === "WAITING LIST").length;
    const dijadwalkan = dashboardTasksForPeriod.filter((t) => t.status === "DIJADWALKAN").length;
    const gagal = dashboardTasksForPeriod.filter((t) => t.status === "GAGAL").length;
    const percentage = total > 0 ? Math.round((selesai / total) * 100) : 0;
    return { total, selesai, waiting, dijadwalkan, gagal, percentage };
  }, [dashboardTasksForPeriod]);

  // Data Grafik Statistik Garis (Mingguan / Bulanan)
  const dashboardLineChartData = useMemo(() => {
    const now = new Date();
    if (dashboardStatPeriod === "Mingguan") {
      const curYear = now.getFullYear();
      const curMonth = now.getMonth();
      const weeks = [
        { label: "Mgu 1", count: 0 },
        { label: "Mgu 2", count: 0 },
        { label: "Mgu 3", count: 0 },
        { label: "Mgu 4+", count: 0 },
      ];
      teamTasks.forEach((p) => {
        const dateStr = p.waktu_selesai || p.tanggal;
        if (!dateStr) return;
        const d = parseRecordDate(dateStr) || new Date(dateStr);
        if (isNaN(d.getTime())) return;
        if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
          const day = d.getDate();
          if (day <= 7) weeks[0].count++;
          else if (day <= 14) weeks[1].count++;
          else if (day <= 21) weeks[2].count++;
          else weeks[3].count++;
        }
      });
      return weeks;
    } else {
      const months = [];
      for (let i = 4; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          label: d.toLocaleDateString("id-ID", { month: "short" }),
          year: d.getFullYear(),
          month: d.getMonth(),
          count: 0,
        });
      }
      teamTasks.forEach((p) => {
        const dateStr = p.waktu_selesai || p.tanggal;
        if (!dateStr) return;
        const d = parseRecordDate(dateStr) || new Date(dateStr);
        if (isNaN(d.getTime())) return;
        const found = months.find((m) => m.year === d.getFullYear() && m.month === d.getMonth());
        if (found) found.count++;
      });
      return months;
    }
  }, [teamTasks, dashboardStatPeriod]);

  const lineChartPoints = useMemo(() => {
    const data = dashboardLineChartData;
    if (!data || data.length === 0) return [];
    const counts = data.map((d) => d.count);
    const maxVal = Math.max(...counts, 4);
    const n = data.length;
    return data.map((item, idx) => {
      const cx = 40 + idx * (420 / (n - 1 || 1));
      const cy = 130 - (item.count / maxVal) * 105;
      return { cx: Math.round(cx), cy: Math.round(cy), count: item.count, label: item.label, maxVal };
    });
  }, [dashboardLineChartData]);

  const linePathD = useMemo(() => {
    if (lineChartPoints.length === 0) return "";
    return lineChartPoints.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.cx} ${pt.cy}`;
      const prev = arr[i - 1];
      const cp1x = prev.cx + (pt.cx - prev.cx) / 2;
      const cp1y = prev.cy;
      const cp2x = prev.cx + (pt.cx - prev.cx) / 2;
      const cp2y = pt.cy;
      return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt.cx} ${pt.cy}`;
    }, "");
  }, [lineChartPoints]);

  const areaPathD = useMemo(() => {
    if (lineChartPoints.length === 0) return "";
    const first = lineChartPoints[0];
    const last = lineChartPoints[lineChartPoints.length - 1];
    return `${linePathD} L ${last.cx} 140 L ${first.cx} 140 Z`;
  }, [linePathD, lineChartPoints]);

  // Handle Manual & Auto Sync Antrean Offline ke Server Supabase
  const handleManualSyncOffline = async () => {
    if (isSyncingOffline) return;
    const current = getOfflineQueue();
    if (current.length === 0) {
      triggerToast("Tidak ada laporan tertunda di memori HP.", "info");
      return;
    }
    setIsSyncingOffline(true);
    triggerToast(`Sedang mensinkronkan ${current.length} laporan lapangan ke server...`, "info");
    try {
      const result = await processOfflineSyncQueue(current, {
        uploadBundleFn: uploadTaskEvidenceBundle,
        onSyncItemSuccess: async (item, syncedTask) => {
          if (syncedTask) {
            setPekerjaan((prev) =>
              prev.map((t) => (t.id === item.taskId ? syncedTask : t))
            );
            if (syncedTask.status === "SELESAI") {
              syncCustomerOnTaskCompletion(syncedTask, pelangganList, setPelangganList);
            }
          }
        },
      });
      setOfflineQueue(result.remainingQueue);
      if (result.syncedCount > 0) {
        triggerToast(`⚡ Berhasil mensinkronkan ${result.syncedCount} laporan lapangan ke server!`, "success");
      }
      if (result.failedCount > 0) {
        triggerToast(`${result.failedCount} laporan belum terkirim. Akan dicoba lagi otomatis saat sinyal lebih stabil.`, "warning");
      }
    } catch (err) {
      console.error("Gagal sinkronisasi offline:", err);
      triggerToast("Gagal sinkronisasi: " + err.message, "error");
    } finally {
      setIsSyncingOffline(false);
    }
  };

  // Trigger otomatis sinkronisasi saat browser kembali online
  useEffect(() => {
    const handleOnlineTrigger = () => {
      const current = getOfflineQueue();
      if (current.length > 0) {
        handleManualSyncOffline();
      }
    };
    window.addEventListener("online", handleOnlineTrigger);
    return () => window.removeEventListener("online", handleOnlineTrigger);
  }, []);

  // Handle Mark In-Progress (Mulai Jalan / Dikerjakan)
  const handleStartTask = (task) => {
    const nowIso = new Date().toISOString();
    setPekerjaan((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              is_started: true,
              waktu_mulai: nowIso,
              keterangan: (t.keterangan ? t.keterangan + " · " : "") + "Sedang menuju/dikerjakan di lokasi",
              timeline: [
                ...(Array.isArray(t.timeline) ? t.timeline : []),
                {
                  timestamp: nowIso,
                  formattedTime: new Date(nowIso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
                  action: "Menuju Lokasi Pelanggan",
                  actor: "Teknisi Lapangan",
                  color: "blue",
                  notes: `Teknisi (${t.tim || "Lapangan"}) telah memulai perjalanan menuju lokasi pemasangan/perbaikan.`,
                },
              ],
            }
          : t
      )
    );
    triggerToast(`Status tugas ${task.pelanggan} diubah: Sedang Dikerjakan.`, "info");
  };

    // Handle Submit Completion dari TaskCompletionModal (Dukungan Offline Queue & Cloud Storage)
  const handleCompleteTaskFromModal = async (finalPayload) => {
    try {
      setIsSubmittingCompletion(true);
      const isDeviceOffline = !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);
      const nowIso = new Date().toISOString();
      const cutoffEval = evaluateReportSubmissionTime(nowIso);

      if (isDeviceOffline) {
        const offlineTask = {
          ...finalPayload,
          is_offline_draft: true,
          offline_queued_at: nowIso,
        };

        addToOfflineQueue({
          type: "COMPLETE_TASK",
          taskId: finalPayload.id,
          taskData: offlineTask,
          evidenceBundle: finalPayload.evidence || {},
          customerName: finalPayload.pelanggan,
          jenis: finalPayload.jenis,
        });

        setPekerjaan((prev) =>
          prev.map((t) => (t.id === finalPayload.id ? offlineTask : t))
        );

        triggerToast(
          `📶 Mode Offline (Blankspot): Laporan "${finalPayload.pelanggan}" aman tersimpan di HP. Otomatis dikirim saat sinyal 4G pulih.`,
          "info"
        );
        setSelectedTask(null);
        return;
      }

      // Online: background upload bukti foto ke Supabase Storage
      let finalEvidence = finalPayload.evidence;
      try {
        if (finalPayload.evidence) {
          finalEvidence = await uploadTaskEvidenceBundle(finalPayload.evidence, finalPayload.id);
        }
      } catch (uploadErr) {
        console.warn("Storage upload exception, fallback to local data:", uploadErr);
      }

      const taskToSave = {
        ...finalPayload,
        evidence: finalEvidence || finalPayload.evidence,
      };

      setPekerjaan((prev) =>
        prev.map((t) => (t.id === finalPayload.id ? taskToSave : t))
      );

      // Otomatisasi Sinkronisasi Port Pelanggan (jika status langsung SELESAI)
      if (taskToSave.status === "SELESAI") {
        syncCustomerOnTaskCompletion(taskToSave, pelangganList, setPelangganList);
      }

      const toastMessage = taskToSave.status === "MENUNGGU VALIDASI"
        ? `Laporan 1 foto berhasil dikirim (${cutoffEval.label}). Menunggu validasi SPV.`
        : `Laporan & bukti foto pekerjaan "${finalPayload.pelanggan}" berhasil disetujui. Komisi: ${formatRupiah(finalPayload.komisi_total || 0)}`;
      triggerToast(toastMessage, "success");

      setSelectedTask(null);
    } catch (err) {
      console.error("Gagal menyelesaikan pekerjaan:", err);
      triggerToast("Gagal menyimpan pekerjaan: " + err.message, "error");
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  // Handle Submit Kendala (GAGAL) dengan Dukungan Mode Offline
  const handleKendalaSubmit = (e) => {
    e.preventDefault();
    if (!kendalaTask) return;

    const nowIso = new Date().toISOString();
    const reason = `[KENDALA] ${kendalaForm.alasan}${kendalaForm.catatan ? " - " + kendalaForm.catatan : ""}`;
    const isDeviceOffline = !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

    if (isDeviceOffline) {
      const offlineKendalaTask = {
        ...kendalaTask,
        status: "GAGAL",
        keterangan: reason,
        is_offline_draft: true,
        timeline: [
          ...(Array.isArray(kendalaTask.timeline) ? kendalaTask.timeline : []),
          {
            timestamp: nowIso,
            formattedTime: new Date(nowIso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            action: "Laporan Kendala Lapangan (Mode Offline)",
            actor: "Teknisi Lapangan",
            color: "rose",
            notes: `Kendala disimpan di HP: ${kendalaForm.alasan}${kendalaForm.catatan ? ` - ${kendalaForm.catatan}` : ""}. Menunggu sinyal untuk sinkronisasi ke CS.`,
          },
        ],
      };

      addToOfflineQueue({
        type: "KENDALA_TASK",
        taskId: kendalaTask.id,
        reason,
        customerName: kendalaTask.pelanggan,
        jenis: kendalaTask.jenis,
      });

      setPekerjaan((prev) =>
        prev.map((t) => (t.id === kendalaTask.id ? offlineKendalaTask : t))
      );

      triggerToast(`📶 Mode Offline: Kendala pada "${kendalaTask.pelanggan}" tersimpan di HP. Otomatis dikirim saat sinyal pulih.`, "info");
      setKendalaTask(null);
      setKendalaForm({ alasan: "Pelanggan tidak ada di rumah / kosong", catatan: "" });
      return;
    }

    setPekerjaan((prev) =>
      prev.map((t) =>
        t.id === kendalaTask.id
          ? {
              ...t,
              status: "GAGAL",
              keterangan: reason,
              is_offline_draft: false,
              timeline: [
                ...(Array.isArray(t.timeline) ? t.timeline : []),
                {
                  timestamp: nowIso,
                  formattedTime: new Date(nowIso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
                  action: "Laporan Kendala Lapangan",
                  actor: "Teknisi Lapangan",
                  color: "rose",
                  notes: `Kendala: ${kendalaForm.alasan}${kendalaForm.catatan ? ` - ${kendalaForm.catatan}` : ""}. Menunggu tindak lanjut CS & Reschedule.`,
                },
              ],
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
      const defaultItems = Array.isArray(task.komisi_items) && task.komisi_items.length > 0
        ? task.komisi_items
        : getDefaultWorkItemsForTask(task.jenis, 100, masterKomisi);
      setCompletionWorkItems(defaultItems);
      setCompletionForm({
        redaman: "-19.5",
        serialNumber: "",
        odpPort: task.odp || "",
        catatan: "",
        fotoBuktiUtama: null,
        fotoOpm: null,
        fotoDropcore: null,
        fotoModem: null,
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

  // ODP Real-Time Port Enrichment & Search
  const enrichedOdps = useMemo(() => {
    return enrichOdpWithPortUtilization(odpList, pelangganList);
  }, [odpList, pelangganList]);

  const filteredOdps = useMemo(() => {
    if (!odpQuery.trim()) return enrichedOdps.slice(0, 9);
    const q = odpQuery.toLowerCase().trim();
    return enrichedOdps.filter(
      (o) =>
        (o.nama || "").toLowerCase().includes(q) ||
        (o.odc || "").toLowerCase().includes(q) ||
        (o.keterangan || "").toLowerCase().includes(q)
    );
  }, [enrichedOdps, odpQuery]);

  const dbmQuality = useMemo(() => getDbmQuality(completionForm.redaman), [completionForm.redaman]);

  // Filter daftar pekerjaan selesai di tampilan Dompet & Insentif
  const filteredWalletBreakdown = useMemo(() => {
    if (!search.trim()) return teamIncentives.breakdown;
    const q = search.toLowerCase().trim();
    return teamIncentives.breakdown.filter(
      (t) =>
        (t.pelanggan || "").toLowerCase().includes(q) ||
        (t.alamat || "").toLowerCase().includes(q) ||
        (t.jenis || "").toLowerCase().includes(q) ||
        (t.odp || "").toLowerCase().includes(q)
    );
  }, [teamIncentives.breakdown, search]);

  // Handle Simpan Konfigurasi Tarif
  const handleSaveConfig = (e) => {
    e.preventDefault();
    setIncentiveConfig(configForm);
    // Sinkronkan juga tarif ke masterKomisi agar sinkron dua arah (Admin & Teknisi)
    if (configForm?.itemRates) {
      setMasterKomisi((prev) =>
        (prev || []).map((m) => ({
          ...m,
          tarif: configForm.itemRates[m.id] !== undefined ? configForm.itemRates[m.id] : m.tarif,
        }))
      );
    }
    setShowConfigModal(false);
    triggerToast("Pengaturan tarif insentif teknisi berhasil disimpan & disinkronkan ke Master Komisi.", "success");
  };

  // Handle Reset Konfigurasi Tarif
  const handleResetConfig = () => {
    setShowResetConfigConfirm(true);
  };

  const confirmResetConfig = () => {
    setConfigForm(DEFAULT_INCENTIVE_CONFIG);
    setIncentiveConfig(DEFAULT_INCENTIVE_CONFIG);
    setMasterKomisi(KOMISI_PEKERJAAN_MASTER);
    setShowConfigModal(false);
    setShowResetConfigConfirm(false);
    triggerToast("Tarif insentif dikembalikan ke standar awal.", "info");
  };

  // Render Kanban / List Card yang Informatif & Lengkap untuk Teknisi
  const renderCard = (task, runSheetIndex = null) => {
    const isCompleted = task.status === "SELESAI" || task.status === "MENUNGGU VALIDASI";
    const isScheduled = task.status === "DIJADWALKAN";
    const cleanWaPhone = task.telepon ? formatPhoneForWa(task.telepon) : null;
    const waMessage = `Halo Bpk/Ibu ${task.pelanggan}, kami dari Tim Teknisi Nexus Net (${activeTeam}). Kami sedang memproses pekerjaan ${task.jenis} di lokasi Anda: ${task.alamat}.`;

    // Direct Turn-by-Turn GPS navigation link
    const mapsNavigationUrl = task.shareloc?.startsWith("http")
      ? task.shareloc
      : task.shareloc && task.shareloc.includes(",")
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(task.shareloc.trim())}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(task.alamat || task.pelanggan || "")}`;

    // Redaman & insentif evaluasi
    const rawDbm = task.redaman ? parseFloat(task.redaman) : extractDbmFromKeterangan(task.keterangan);
    const dbmEval = getDbmQuality(rawDbm);
    const taskIncentive = isCompleted ? calculateTaskIncentive(task, incentiveConfig, masterKomisi) : null;
    const hasEvidence = Boolean(task.foto_bukti_utama || task.foto_opm || task.foto_dropcore || task.foto_modem || task.evidence);

    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing space-y-3 relative group"
      >
        {/* Top: Jenis Pekerjaan Badge + ODP Chip + Run-Sheet Index */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {runSheetIndex && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#0D1B4A] text-amber-400">
                #{runSheetIndex}
              </span>
            )}
            <span
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
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

            {/* Target ODP Badge */}
            {task.odp && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80" title="Target ODP">
                <Wifi className="w-3 h-3 text-blue-600" />
                <span>{task.odp}</span>
              </span>
            )}

            {/* Janji Jam Spesifik Pelanggan */}
            {task.janji_jam && !isCompleted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300" title="Komitmen Janji Jam Pelanggan">
                <Clock className="w-3 h-3 text-amber-700" />
                <span>Janji: {task.janji_jam}</span>
              </span>
            )}

            {/* Menunggu Validasi Badge */}
            {task.status === "MENUNGGU VALIDASI" && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Menunggu Validasi SPV
              </span>
            )}

            {/* Draft Offline (Menunggu Sinyal) Badge */}
            {task.is_offline_draft && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse" title="Tersimpan di memori HP, menunggu sinyal stabil">
                <Signal className="w-3 h-3 text-amber-700" />
                <span>Draft Lokal (Offline)</span>
              </span>
            )}

            {/* In-Progress / Sedang Dikerjakan Badge */}
            {task.is_started && !isCompleted && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                <span>Sedang Dikerjakan</span>
              </span>
            )}

            {/* Cut-Off Status Badge */}
            {task.cutoff_status && (
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                  task.cutoff_status === "TEPAT_WAKTU"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-amber-50 text-amber-900 border-amber-300"
                }`}
              >
                {task.cutoff_status === "TEPAT_WAKTU" ? "Tepat Waktu (<= 21:00)" : "Terlambat (> 21:00)"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {task.paket && (
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 hidden sm:inline-block">
                {task.paket}
              </span>
            )}
            <button className="text-slate-300 hover:text-slate-600 p-0.5 rounded cursor-pointer">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pelanggan & Alamat */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold text-sm text-slate-900 leading-snug">
              {task.pelanggan}
            </h4>
            {task.telepon && (
              <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                {formatPhoneDisplay(task.telepon)}
              </span>
            )}
          </div>
          <div className="flex items-start gap-1.5 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2 leading-relaxed">{task.alamat}</span>
          </div>
        </div>

        {/* Keterangan / Status Khusus */}
        {task.keterangan && (
          <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-xl border border-slate-100/90 line-clamp-2">
            {task.keterangan}
          </p>
        )}

        {/* Catatan Revisi dari SPV jika ada */}
        {task.revisi_catatan && task.status !== "SELESAI" && (
          <div className="p-3 bg-rose-50 border border-rose-200/90 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Perlu Revisi Dari Supervisor:</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                Revisi
              </span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed font-medium bg-white/80 p-2 rounded-xl border border-rose-200">
              "{task.revisi_catatan}"
            </p>
            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] text-rose-600 font-medium">
                Ambil ulang foto / perbarui redaman lalu kirim ulang laporan.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTask(task);
                  setSelectedOdpForTask(task.odp || "");
                  const defaultItems = Array.isArray(task.komisi_items) && task.komisi_items.length > 0
                    ? task.komisi_items
                    : getDefaultWorkItemsForTask(task.jenis, 100, masterKomisi);
                  setCompletionWorkItems(defaultItems);
                  setCompletionForm({
                    redaman: task.redaman || "-19.5",
                    serialNumber: task.sn_modem || "",
                    odp: task.odp || "",
                    catatan: task.keterangan || "",
                    fotoBuktiUtama: task.foto_bukti_utama || null,
                    fotoOpm: task.foto_opm || null,
                    fotoDropcore: task.foto_dropcore || null,
                    fotoModem: task.foto_modem || null,
                  });
                }}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1 transition-all"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Form Revisi</span>
              </button>
            </div>
          </div>
        )}

        {/* Technical Data Bar untuk Tugas Selesai */}
        {isCompleted && (
          <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-1">
              {dbmEval ? (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${dbmEval.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dbmEval.dot}`} />
                  <span>{task.redaman ? `${task.redaman} dBm` : "Redaman OK"}</span>
                  <span className="text-[9px] font-normal opacity-90">({dbmEval.status})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Redaman QC OK
                </span>
              )}

              {taskIncentive && (
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200" title="Fee Pengerjaan">
                  +{formatRupiah(taskIncentive.total)}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-600 pt-0.5">
              <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                SN: <b>{task.sn_modem || "ONT Ready"}</b>
              </span>
              {hasEvidence && (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                  <Camera className="w-3 h-3" /> Bukti OK
                </span>
              )}
            </div>

            {Array.isArray(task.komisi_items) && task.komisi_items.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-200/60">
                {task.komisi_items.map((it, idx) => {
                  const master = KOMISI_MAP[it.id];
                  return (
                    <span
                      key={idx}
                      className="text-[9px] font-medium text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200"
                    >
                      {master?.nama || it.id}: <b>{it.qty} {master?.satuan || ""}</b>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Bottom Actions Bar (Mobile Touch-Friendly Min 40px Targets) */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          {/* Quick Contact & Navigation Toolbar (PWA Field Optimized) */}
          <div className="flex items-center gap-1.5">
            {task.telepon && (
              <a
                href={`tel:${task.telepon}`}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 flex items-center justify-center border border-blue-200 transition-all active:scale-95 shadow-2xs"
                title="Panggilan Telepon Langsung"
              >
                <PhoneCall className="w-4 h-4" />
              </a>
            )}

            {cleanWaPhone && (
              <a
                href={createWhatsAppUrl(cleanWaPhone, waMessage)}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 flex items-center justify-center border border-emerald-200 transition-all active:scale-95 shadow-2xs"
                title="Chat WhatsApp Pelanggan"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            )}

            <a
              href={mapsNavigationUrl}
              target="_blank"
              rel="noreferrer"
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center border border-slate-200 transition-all active:scale-95 shadow-2xs"
              title="Navigasi Rute Langsung (Google Maps)"
            >
              <Navigation className="w-4 h-4 text-blue-600" />
            </a>
          </div>

          {/* Action Buttons Right (Comfortable Touch Target) */}
          <div className="flex items-center gap-1.5">
            {!isCompleted ? (
              <>
                {!task.is_started ? (
                  <button
                    onClick={() => handleStartTask(task)}
                    className="h-10 px-3.5 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
                    title="Tandai Mulai Kerjakan / Menuju Lokasi"
                  >
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span>Mulai</span>
                  </button>
                ) : (
                  <span className="h-10 px-3 rounded-xl inline-flex items-center gap-1.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    <span>Proses</span>
                  </span>
                )}

                <button
                  onClick={() => {
                    const taskOdp = task.odp || (odpList && odpList[0]?.nama) || "ODP 1.1";
                    setSelectedTask(task);
                    setSelectedOdpForTask(taskOdp);
                    const defaultItems = Array.isArray(task.komisi_items) && task.komisi_items.length > 0
                      ? task.komisi_items
                      : getDefaultWorkItemsForTask(task.jenis, 100, masterKomisi);
                    setCompletionWorkItems(defaultItems);
                    setCompletionForm({
                      redaman: task.jenis === "PEMUTUSAN" ? "N/A" : "-19.5",
                      serialNumber: task.sn_modem || "",
                      odp: taskOdp,
                      catatan: "",
                      fotoOpm: null,
                      fotoDropcore: null,
                      fotoModem: null,
                    });
                  }}
                  className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Selesai</span>
                </button>

                <button
                  onClick={() => {
                    setKendalaTask(task);
                    setKendalaForm({
                      alasan: "Pelanggan tidak ada di rumah / kosong",
                      catatan: "",
                    });
                  }}
                  className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 border border-rose-200 transition-all cursor-pointer flex items-center justify-center active:scale-95 shadow-2xs"
                  title="Ada Kendala"
                >
                  <AlertTriangle className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setViewEvidenceTask(task)}
                className="h-10 px-3.5 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                title="Lihat Bukti Foto & Parameter Lapangan"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bukti Foto</span>
              </button>
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

      {/* SPV Revision Request Banner (High Priority) */}
      {revisionTasks.length > 0 && (
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-amber-700 text-white p-4 rounded-2xl shadow-lg border border-rose-300/40 space-y-2.5 animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h4 className="text-sm font-black tracking-wide flex items-center gap-2">
                  <span>Perhatian: Ada {revisionTasks.length} Tiket Memerlukan Revisi dari SPV</span>
                </h4>
                <p className="text-[11px] text-rose-100">
                  Supervisor meminta perbaikan bukti foto atau data redaman sebelum komisi pekerjaan disahkan.
                </p>
              </div>
            </div>
            <span className="shrink-0 text-[10px] font-black uppercase px-2.5 py-1 bg-black/30 text-amber-200 rounded-full border border-white/20 font-mono">
              Revisi SPV
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            {revisionTasks.map((rt) => (
              <div key={rt.id} className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-white">{rt.pelanggan}</span>
                    <span className="text-amber-300 text-[11px] font-bold">({rt.jenis} - {rt.odp || "ODP"})</span>
                  </div>
                  <p className="text-[11px] text-rose-100 mt-0.5 italic">
                    Catatan SPV: "{rt.revisi_catatan}"
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTask(rt);
                    setSelectedOdpForTask(rt.odp || "");
                    const defaultItems = Array.isArray(rt.komisi_items) && rt.komisi_items.length > 0
                      ? rt.komisi_items
                      : getDefaultWorkItemsForTask(rt.jenis, 100, masterKomisi);
                    setCompletionWorkItems(defaultItems);
                    setCompletionForm({
                      redaman: rt.redaman || "-19.5",
                      serialNumber: rt.sn_modem || "",
                      odp: rt.odp || "",
                      catatan: rt.keterangan || "",
                      fotoBuktiUtama: rt.foto_bukti_utama || null,
                      fotoOpm: rt.foto_opm || null,
                      fotoDropcore: rt.foto_dropcore || null,
                      fotoModem: rt.foto_modem || null,
                    });
                  }}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-[#0D1B4A] rounded-xl text-xs font-black shadow-xs shrink-0 self-start sm:self-auto cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Buka Form Revisi</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Offline Mode Banner (PWA Field Optimized - Blankspot Resiliency) */}
      {!isOnline && (
        <div className="sticky top-2 z-40 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-3 rounded-2xl shadow-lg border border-amber-300/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-black tracking-wide">
                Mode Offline Lapangan Aktif (Anti-Blankspot)
              </p>
              <p className="text-[11px] text-amber-100">
                Sinyal terputus. Laporan & bukti foto tersimpan di memori HP ({offlineQueue.length} draft tersimpan). Akan otomatis terkirim begitu kembali online.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-black uppercase px-2.5 py-1 bg-black/25 text-amber-200 rounded-full border border-white/20 font-mono">
            {offlineQueue.length} Draft di HP
          </span>
        </div>
      )}

      {/* Auto-Sync Banner when Signal Reconnected and Queue Has Items */}
      {isOnline && offlineQueue.length > 0 && (
        <div className="sticky top-2 z-40 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-4 py-3 rounded-2xl shadow-lg border border-blue-300/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Signal className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <p className="text-xs font-black tracking-wide">
                Sinyal Pulih! Ada {offlineQueue.length} Laporan Menunggu Sinkronisasi
              </p>
              <p className="text-[11px] text-blue-100">
                Laporan pekerjaan lapangan yang disimpan offline siap dikirim ke database & SPV.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSyncingOffline}
            onClick={handleManualSyncOffline}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-60 text-white rounded-xl text-xs font-black shadow-sm shrink-0 self-end sm:self-auto cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingOffline ? "animate-spin" : ""}`} />
            <span>{isSyncingOffline ? "Sedang Mengirim..." : "⚡ Sinkronkan Sekarang"}</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NAVIGATION TABS SWITCHER & SEARCH (PERSIS KEBUTUHAN PORTAL TEKNISI)        */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Buttons Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            onClick={() => setViewMode("DASHBOARD")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === "DASHBOARD"
                ? "bg-[#0D1B4A] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <PieChart className="w-4 h-4 text-blue-400" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setViewMode("KANBAN")}
            className={`hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
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

          {/* Tab Dompet & Insentif */}
          <button
            onClick={() => setViewMode("WALLET")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === "WALLET"
                ? "bg-[#0D1B4A] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Dompet & Insentif</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-[#0D1B4A]">
              {formatRupiah(teamIncentives.grandTotal)}
            </span>
          </button>
        </div>

        {/* Status Koneksi Realtime / Offline Pill & Search Bar */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!isOnline ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs shrink-0" title="Koneksi terputus - Mode offline aktif">
              <WifiOff className="w-3.5 h-3.5 text-amber-700" />
              <span>Offline ({offlineQueue.length} Draft)</span>
            </span>
          ) : offlineQueue.length > 0 ? (
            <button
              type="button"
              disabled={isSyncingOffline}
              onClick={handleManualSyncOffline}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 shadow-2xs cursor-pointer shrink-0 transition-all active:scale-95"
              title="Klik untuk mensinkronkan laporan yang tersimpan saat offline"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-700 ${isSyncingOffline ? "animate-spin" : ""}`} />
              <span>{isSyncingOffline ? "Mengirim..." : `${offlineQueue.length} Draft (Sync)`}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs shrink-0" title="Terhubung secara realtime ke Cloud">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Online (Realtime)</span>
              <span className="sm:hidden">Online</span>
            </span>
          )}

          {/* Search Bar Right */}
          {viewMode !== "ODP_TOOL" && viewMode !== "WALLET" && (
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari tugas / pelanggan..."
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
      </div>

      {/* ========================================================================= */}
      {/* TAMPILAN UTAMA: DASHBOARD PORTAL TEKNISI (SESUAI KONSEP & LAYOUT MOCKUP)  */}
      {/* ========================================================================= */}
      {viewMode === "DASHBOARD" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* 1. HERO WELCOME BANNER (PERSIS GAMBAR MOCKUP) */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm relative overflow-hidden">
            {/* Background Graphic Tower BTS di sebelah kanan */}
            <div className="absolute right-0 top-0 bottom-0 w-72 sm:w-96 pointer-events-none opacity-25 md:opacity-35 hidden sm:block">
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

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              {/* Sisi Kiri: Greeting & Quick Action Buttons */}
              <div className="space-y-3 max-w-xl">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    DASHBOARD
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Halo, {profile?.full_name || "Demo Admin"}! 👋
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    {profile?.role === "admin"
                      ? "Anda login sebagai Administrator (Mode Supervisi Global)."
                      : profile?.role === "user"
                      ? "Anda login sebagai Operator (Mode Supervisi Operasional)."
                      : `Anda login sebagai Teknisi Lapangan Tim ${activeTeam}.`}
                  </p>
                </div>

                {/* 3 Quick Action Field Toolkit Buttons */}
                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={() => setShowOpmGuideModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/90 hover:bg-blue-100 text-blue-700 border border-blue-200/80 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                    <span>Standar Redaman OPM</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowNocContactModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50/90 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
                    <span>Hotline NOC & OLT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSopModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/90 hover:bg-amber-100 text-amber-800 border border-amber-200/80 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                    <span>SOP Instalasi & K3</span>
                  </button>
                </div>
              </div>

              {/* Sisi Kanan: Kartu Info Tim & Shift */}
              <div className="bg-slate-50/90 sm:bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs min-w-[240px] sm:min-w-[260px] space-y-3 self-start lg:self-auto">
                {/* Selector / Info Tim */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold leading-tight">Tim Lapangan</span>
                      <div className="relative">
                        {isSupervisor && !isTechnician ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-800">Tim:</span>
                            <select
                              value={activeTeam}
                              onChange={(e) => setSelectedTeam(e.target.value)}
                              className="text-xs font-black text-slate-900 bg-transparent pr-4 outline-none cursor-pointer hover:text-blue-600 appearance-none font-sans"
                            >
                              <option value="GATRA - AIS">GATRA - AIS</option>
                              <option value="AZWAR - RIO">AZWAR - RIO</option>
                              {teamMasterList
                                .filter((t) => t.nama !== "GATRA - AIS" && t.nama !== "AZWAR - RIO")
                                .map((t) => (
                                  <option key={t.id || t.nama} value={t.nama}>
                                    {t.nama}
                                  </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-black bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Tim {activeTeam} (Terkunci)</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shift Lapangan */}
                <div className="pt-2 border-t border-slate-200/70 flex items-center gap-2.5 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold leading-tight">Shift Lapangan</span>
                    <span className="text-xs font-black text-slate-800">08:00 – 17:00 WIB</span>
                  </div>
                </div>

                {/* Batas Cut-Off Laporan Harian */}
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-800 font-bold block leading-tight">Batas Laporan Harian</span>
                      <span className="text-xs font-black text-slate-900">Maks. Pk 21:00 WIB</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Jam 9 Malam
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reminder Alert Batas Cut-Off Jam 9 Malam */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-300/80 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                    Batas Laporan Pekerjaan: Maksimal Jam 9 Malam (21:00 WIB)
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    SOP Wajib
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Pastikan seluruh SPK yang dikerjakan hari ini telah dilampirkan minimal 1 foto bukti fisik sebelum jam 9 malam agar komisi divalidasi dan performa tercatat tepat waktu.
                </p>
              </div>
            </div>
            <div
              className={`flex items-center gap-2 shrink-0 self-end sm:self-auto text-xs px-3.5 py-1.5 rounded-xl font-mono shadow-2xs border transition-all ${
                cutoffRemaining.isPassed
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : cutoffRemaining.minutesRemaining <= 60
                  ? "bg-amber-100 border-amber-300 text-amber-900"
                  : "bg-white/95 border-amber-200 text-amber-900"
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  cutoffRemaining.isPassed
                    ? "bg-rose-500"
                    : cutoffRemaining.minutesRemaining <= 60
                    ? "bg-amber-600 animate-ping"
                    : "bg-amber-500 animate-pulse"
                }`}
              />
              <span className="font-bold">{cutoffRemaining.text}</span>
            </div>
          </div>

          {/* 2. BARIS 4 KARTU METRIK FINANSIAL & TARGET (PERSIS GAMBAR MOCKUP) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Komisi & Insentif Teknisi */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col justify-between relative group hover:border-slate-200 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 leading-snug">
                    Total Komisi & Insentif Teknisi
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Periode {new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {formatRupiah(teamIncentives.grandTotal)}
                </span>
                <button
                  type="button"
                  onClick={() => setViewMode("WALLET")}
                  className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-all cursor-pointer group-hover:translate-x-0.5"
                  title="Lihat Rincian Dompet"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 2: Fee Pokok */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 leading-snug">
                    Fee Pokok
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Dari {teamIncentives.totalCompleted} tugas selesai
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {formatRupiah(teamIncentives.totalBaseFee)}
                </span>
              </div>
            </div>

            {/* Card 3: Bonus Redaman (QC) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 leading-snug">
                    Bonus Redaman (QC)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {teamIncentives.primaCount || 0} titik prima
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {formatRupiah(teamIncentives.totalQualityBonus || 0)}
                </span>
              </div>
            </div>

            {/* Card 4: Target Bulanan */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 leading-snug">
                    Target Bulanan
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                    {teamIncentives.nextTier
                      ? `Target ${teamIncentives.nextTier.label} (${teamIncentives.nextTier.targetCount} Tugas)`
                      : teamIncentives.achievedTierLabel || "Target Tercapai"}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {teamIncentives.nextTier ? `${teamIncentives.nextTier.progressPercent}%` : "100%"}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {teamIncentives.totalCompleted} / {teamIncentives.nextTier?.targetCount || teamIncentives.totalCompleted}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, teamIncentives.nextTier ? teamIncentives.nextTier.progressPercent : 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. BARIS 2 GRAFIK: STATUS PEKERJAAN (DONUT) & STATISTIK PEKERJAAN (LINE AREA) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Grafik Kiri: Status Pekerjaan */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
              {/* Header Chart */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Status Pekerjaan
                  </h3>
                </div>

                <div className="relative">
                  <select
                    value={dashboardStatusPeriod}
                    onChange={(e) => setDashboardStatusPeriod(e.target.value)}
                    className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-1 pr-6 outline-none cursor-pointer hover:border-slate-300 appearance-none shadow-2xs"
                  >
                    <option value="CURRENT_MONTH">{currentMonthLabel} (Bulan Ini)</option>
                    <option value="PREV_MONTH">{prevMonthLabel} (Bulan Lalu)</option>
                    <option value="ALL">Semua Waktu</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Body Chart Donut */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-4">
                {/* SVG Donut */}
                <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r="56" fill="none" stroke="#F1F5F9" strokeWidth="18" />
                    {dashboardStats.total > 0 && (
                      <>
                        {/* Selesai: Hijau */}
                        {dashboardStats.selesai > 0 && (
                          <circle
                            cx="80"
                            cy="80"
                            r="56"
                            fill="none"
                            stroke="#10B981"
                            strokeWidth="18"
                            strokeDasharray={`${((dashboardStats.selesai / dashboardStats.total) * 351.86).toFixed(1)} 351.86`}
                            strokeDashoffset="0"
                            className="transition-all duration-700"
                          />
                        )}
                        {/* Menunggu: Amber */}
                        {dashboardStats.waiting > 0 && (
                          <circle
                            cx="80"
                            cy="80"
                            r="56"
                            fill="none"
                            stroke="#F59E0B"
                            strokeWidth="18"
                            strokeDasharray={`${((dashboardStats.waiting / dashboardStats.total) * 351.86).toFixed(1)} 351.86`}
                            strokeDashoffset={`-${((dashboardStats.selesai / dashboardStats.total) * 351.86).toFixed(1)}`}
                            className="transition-all duration-700"
                          />
                        )}
                        {/* Dalam Proses / Dijadwalkan: Biru */}
                        {dashboardStats.dijadwalkan > 0 && (
                          <circle
                            cx="80"
                            cy="80"
                            r="56"
                            fill="none"
                            stroke="#3B82F6"
                            strokeWidth="18"
                            strokeDasharray={`${((dashboardStats.dijadwalkan / dashboardStats.total) * 351.86).toFixed(1)} 351.86`}
                            strokeDashoffset={`-${(((dashboardStats.selesai + dashboardStats.waiting) / dashboardStats.total) * 351.86).toFixed(1)}`}
                            className="transition-all duration-700"
                          />
                        )}
                        {/* Gagal: Merah */}
                        {dashboardStats.gagal > 0 && (
                          <circle
                            cx="80"
                            cy="80"
                            r="56"
                            fill="none"
                            stroke="#EF4444"
                            strokeWidth="18"
                            strokeDasharray={`${((dashboardStats.gagal / dashboardStats.total) * 351.86).toFixed(1)} 351.86`}
                            strokeDashoffset={`-${(((dashboardStats.selesai + dashboardStats.waiting + dashboardStats.dijadwalkan) / dashboardStats.total) * 351.86).toFixed(1)}`}
                            className="transition-all duration-700"
                          />
                        )}
                      </>
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                      {dashboardStats.total}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 mt-1">
                      Total Tugas
                    </span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="flex-1 w-full space-y-2.5">
                  <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-semibold text-slate-700">Selesai</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {dashboardStats.selesai} ({dashboardStats.total > 0 ? Math.round((dashboardStats.selesai / dashboardStats.total) * 100) : 0}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="font-semibold text-slate-700">Menunggu</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {dashboardStats.waiting} ({dashboardStats.total > 0 ? Math.round((dashboardStats.waiting / dashboardStats.total) * 100) : 0}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="font-semibold text-slate-700">Dalam Proses</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {dashboardStats.dijadwalkan} ({dashboardStats.total > 0 ? Math.round((dashboardStats.dijadwalkan / dashboardStats.total) * 100) : 0}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                      <span className="font-semibold text-slate-700">Tertunda / Gagal</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {dashboardStats.gagal} ({dashboardStats.total > 0 ? Math.round((dashboardStats.gagal / dashboardStats.total) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grafik Kanan: Statistik Pekerjaan */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
              {/* Header Chart */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Statistik Pekerjaan
                  </h3>
                </div>

                <div className="relative">
                  <select
                    value={dashboardStatPeriod}
                    onChange={(e) => setDashboardStatPeriod(e.target.value)}
                    className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-1 pr-6 outline-none cursor-pointer hover:border-slate-300 appearance-none shadow-2xs"
                  >
                    <option value="Mingguan">Mingguan</option>
                    <option value="Bulanan">Bulanan</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Body Chart Line Kurva */}
              <div className="py-2">
                <div className="relative h-44 w-full">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="techBlueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Grid Lines Horizontal */}
                    <line x1="25" y1="25" x2="490" y2="25" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="25" y1="60" x2="490" y2="60" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="25" y1="95" x2="490" y2="95" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="25" y1="130" x2="490" y2="130" stroke="#E2E8F0" strokeWidth="1" />

                    {/* Y-axis Labels */}
                    <text x="5" y="29" className="text-[10px] fill-slate-400 font-medium">
                      {lineChartPoints[0]?.maxVal || 4}
                    </text>
                    <text x="5" y="64" className="text-[10px] fill-slate-400 font-medium">
                      {Math.round(((lineChartPoints[0]?.maxVal || 4) * 2) / 3)}
                    </text>
                    <text x="5" y="99" className="text-[10px] fill-slate-400 font-medium">
                      {Math.round((lineChartPoints[0]?.maxVal || 4) / 3)}
                    </text>
                    <text x="10" y="134" className="text-[10px] fill-slate-400 font-medium">0</text>

                    {/* Area under curve */}
                    {areaPathD && (
                      <path
                        d={areaPathD}
                        fill="url(#techBlueGrad)"
                      />
                    )}

                    {/* Smooth Curved Line */}
                    {linePathD && (
                      <path
                        d={linePathD}
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Data Points */}
                    {lineChartPoints.map((pt, i) => (
                      <g key={i}>
                        <circle
                          cx={pt.cx}
                          cy={pt.cy}
                          r="4.5"
                          fill="#2563EB"
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                          className="hover:scale-125 transition-transform cursor-pointer"
                        />
                        <title>{`${pt.label}: ${pt.count} tugas`}</title>
                      </g>
                    ))}
                  </svg>
                </div>

                {/* X-axis Labels */}
                <div className="flex items-center justify-between pl-8 pr-3 pt-1 text-[11px] font-semibold text-slate-500">
                  {lineChartPoints.map((pt, i) => (
                    <span key={i}>{pt.label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. BARIS 2 KOMPONEN: DAFTAR TUGAS (RUN-SHEET) & NOTIFIKASI & INFO */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Kiri: Daftar Tugas (Run-Sheet) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Daftar Tugas (Run-Sheet)
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewMode("LIST")}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    <span>Lihat Semua</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Table Run Sheet */}
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-2">#</th>
                        <th className="py-2.5 px-2">Pelanggan / Alamat</th>
                        <th className="py-2.5 px-2 hidden sm:table-cell">Jenis Pekerjaan</th>
                        <th className="py-2.5 px-2">Status</th>
                        <th className="py-2.5 px-2 hidden sm:table-cell">Jadwal</th>
                        <th className="py-2.5 px-1 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {teamTasks.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="font-semibold text-slate-600">Belum ada tugas lapangan</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Tidak ada antrean SPK yang ditugaskan untuk tim {activeTeam}</p>
                          </td>
                        </tr>
                      ) : (
                        teamTasks.slice(0, 5).map((task, idx) => {
                          const cleanWaPhone = formatPhoneForWa(task.telepon || "");
                          const waText = `Halo Bpk/Ibu ${task.pelanggan}, kami dari Tim Teknisi Nexus Net (${activeTeam}). Kami akan memproses pekerjaan ${task.jenis} di lokasi Anda: ${task.alamat}.`;
                          const waUrl = createWhatsAppUrl(cleanWaPhone, waText);
                          const isDone = task.status === "SELESAI";
                          const isSched = task.status === "DIJADWALKAN";

                          return (
                            <tr key={task.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-2 font-mono font-bold text-slate-400">
                                {String(idx + 1).padStart(3, "0")}
                              </td>
                              <td className="py-3 px-2">
                                <p className="font-bold text-slate-900 leading-snug">{task.pelanggan}</p>
                                <p className="text-[11px] text-slate-400 truncate max-w-[160px] sm:max-w-[200px]" title={task.alamat}>
                                  {task.alamat || "-"}
                                </p>
                              </td>
                              <td className="py-3 px-2 hidden sm:table-cell">
                                <span className="font-semibold text-slate-700">{task.jenis}</span>
                              </td>
                              <td className="py-3 px-2">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                                    isDone
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                                      : isSched
                                      ? "bg-blue-50 text-blue-700 border border-blue-200/80"
                                      : "bg-amber-50 text-amber-700 border border-amber-200/80"
                                  }`}
                                >
                                  {task.status}
                                </span>
                              </td>
                              <td className="py-3 px-2 hidden sm:table-cell">
                                <p className="font-semibold text-slate-700 text-[11px]">{task.tanggal || "-"}</p>
                                <p className="text-[10px] text-slate-400">{task.odp ? `ODP: ${task.odp}` : "-"}</p>
                              </td>
                              <td className="py-3 px-1 text-center relative">
                                <button
                                  type="button"
                                  onClick={() => setActiveActionTaskId(activeActionTaskId === task.id ? null : task.id)}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {activeActionTaskId === task.id && (
                                  <div className="absolute right-2 top-8 z-30 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 min-w-[150px] text-left text-xs font-semibold animate-in fade-in duration-150">
                                    <button
                                      onClick={() => {
                                        setActiveActionTaskId(null);
                                        setViewMode("KANBAN");
                                      }}
                                      className="w-full px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Buka di Kanban</span>
                                    </button>
                                    {cleanWaPhone ? (
                                      <a
                                        href={waUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                                      >
                                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Chat WhatsApp</span>
                                      </a>
                                    ) : null}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Kanan: Notifikasi & Info */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Bell className="w-4 h-4" />
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Notifikasi & Info
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => triggerToast("Semua riwayat notifikasi operasional termonitor secara real-time.", "info")}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    <span>Lihat Semua</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Notifications List */}
                <div className="divide-y divide-slate-100 mt-1">
                  {/* Item 1: Tugas baru masuk */}
                  <div className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-1" />
                      <div>
                        <p className="font-bold text-slate-900">Tugas baru masuk</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Instalasi baru – Budi Santoso
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      2 jam lalu
                    </span>
                  </div>

                  {/* Item 2: Tugas selesai */}
                  <div className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                      <div>
                        <p className="font-bold text-slate-900">Tugas selesai</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Perbaikan – PT. Maju Abadi
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      4 jam lalu
                    </span>
                  </div>

                  {/* Item 3: Update target bulanan */}
                  <div className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-1" />
                      <div>
                        <p className="font-bold text-slate-900">Update target bulanan</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Pencapaian 88% dari target Silver
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      6 jam lalu
                    </span>
                  </div>

                  {/* Item 4: Gangguan jaringan */}
                  <div className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-1" />
                      <div>
                        <p className="font-bold text-slate-900">Gangguan jaringan</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Laporan gangguan di area Sungai Raya
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      7 jam lalu
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. KANBAN 4 KOLOM PERSIS GAMBAR MOCKUP                                    */}
      {/* ========================================================================= */}
      {viewMode === "KANBAN" && (
        <div>
          {/* Mobile Column Quick Filter Pills (Segmented Control) */}
          <div className="sm:hidden flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl mb-3 overflow-x-auto no-scrollbar border border-slate-200/80">
            <button
              onClick={() => setMobileKanbanCol("ALL")}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[38px] cursor-pointer ${
                mobileKanbanCol === "ALL"
                  ? "bg-[#0D1B4A] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua ({searchedTasks.length})
            </button>
            {KANBAN_COLS.map((col) => {
              const count = searchedTasks.filter((t) => {
                if (col.key === "SELESAI") {
                  return t.status === "SELESAI" || t.status === "MENUNGGU VALIDASI";
                }
                return t.status === col.key;
              }).length;
              const isSelected = mobileKanbanCol === col.key;
              return (
                <button
                  key={col.key}
                  onClick={() => setMobileKanbanCol(col.key)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all min-h-[38px] cursor-pointer ${
                    isSelected
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${col.color === "blue" ? "bg-blue-500" : col.color === "emerald" ? "bg-emerald-500" : col.color === "amber" ? "bg-amber-500" : "bg-rose-500"}`} />
                  <span>{col.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isSelected ? "bg-slate-900 text-white" : "bg-slate-200/80 text-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 4 Kolom Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {KANBAN_COLS.filter((col) => mobileKanbanCol === "ALL" || mobileKanbanCol === col.key).map((col) => {
              const colTasks = searchedTasks.filter((t) => {
                if (col.key === "SELESAI") {
                  return t.status === "SELESAI" || t.status === "MENUNGGU VALIDASI";
                }
                return t.status === col.key;
              });
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
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Header Info Run-Sheet */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0D1B4A] text-amber-400 flex items-center justify-center font-bold shrink-0">
                <ListFilter className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                  Run-Sheet Harian Tim {activeTeam}
                </h3>
                <p className="text-xs text-slate-500">
                  Daftar antrean rute pengerjaan urut dari prioritas tertinggi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                {searchedTasks.filter((t) => t.status !== "SELESAI" && t.status !== "MENUNGGU VALIDASI").length} Belum Selesai
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                {searchedTasks.filter((t) => t.status === "SELESAI" || t.status === "MENUNGGU VALIDASI").length} Selesai / Validasi
              </span>
            </div>
          </div>

          {searchedTasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-30 mb-2" />
              <h3 className="text-base font-bold text-slate-800">Tidak ada tugas pada filter ini</h3>
              <p className="text-xs text-slate-400 mt-1">Semua pekerjaan terpantau aman.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...searchedTasks]
                .sort((a, b) => {
                  const priority = { DIJADWALKAN: 1, "WAITING LIST": 2, GAGAL: 3, "MENUNGGU VALIDASI": 4, SELESAI: 5 };
                  return (priority[a.status] || 99) - (priority[b.status] || 99);
                })
                .map((task, idx) => renderCard(task, idx + 1))}
            </div>
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
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{odp.odc}</span>
                    <div className="flex items-center gap-1.5">
                      {odp.port_is_full ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                          ⛔ Port Penuh
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Sisa {odp.port_sisa} Port
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isAman
                            ? "bg-slate-100 text-slate-700"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {odp.status || "Siap"}
                      </span>
                    </div>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">{odp.nama}</h4>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                    <span className="font-medium">
                      Port: <b>{odp.port_terpakai || 0}</b> / {odp.port_kapasitas || 8} Terpakai
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {odp.connected_customers?.length || 0} Pelanggan
                    </span>
                  </div>

                  {/* Progress bar kapasitas port */}
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        odp.port_is_full ? "bg-rose-500" : odp.port_is_near_full ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${odp.port_percent || 0}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-500 pt-0.5">{odp.keterangan || "Jalur fiber optik normal"}</p>
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
      {/* 6.5. DOMPET & INSENTIF TEKNISI (WALLET VIEW)                            */}
      {/* ========================================================================= */}
      {viewMode === "WALLET" && (
        <div className="space-y-5">
          {/* Header Bar Dompet */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Dompet & Insentif Tim: <span className="text-[#F59E0B]">{activeTeam}</span>
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  Akumulasi fee pokok pekerjaan, bonus redaman optik prima, dan bonus target kinerja bulanan.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {isSupervisor && (
                  <button
                    onClick={() => {
                      setConfigForm(incentiveConfig);
                      setShowConfigModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-600" />
                    <span>Atur Tarif</span>
                  </button>
                )}

                <button
                  onClick={() => setShowSlipModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#0D1B4A] hover:bg-[#1a237e] text-white shadow-xs transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Cetak Slip Insentif</span>
                </button>
              </div>
            </div>

            {/* Cut-Off Period Filter Controls */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Periode Cut-Off:
                </span>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {[
                    { id: "THIS_MONTH", label: "Bulan Ini" },
                    { id: "LAST_MONTH", label: "Bulan Lalu" },
                    { id: "ALL", label: "Semua" },
                    { id: "CUSTOM", label: "Kustom" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setWalletPeriod(p.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        walletPeriod === p.id
                          ? "bg-[#0D1B4A] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {walletPeriod === "CUSTOM" && (
                  <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
                    <input
                      type="date"
                      value={cutoffStart}
                      onChange={(e) => setCutoffStart(e.target.value)}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
                    />
                    <span className="text-slate-400 text-xs">s/d</span>
                    <input
                      type="date"
                      value={cutoffEnd}
                      onChange={(e) => setCutoffEnd(e.target.value)}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-slate-500">
                <span className="hidden sm:inline">Periode Aktif:</span>
                <span className="font-bold text-[#0D1B4A] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg text-[11px]">
                  {walletPeriodLabel}
                </span>
              </div>
            </div>
          </div>

          {/* 4 Kartu Ringkasan Insentif */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Grand Total Insentif */}
            <div className="bg-gradient-to-br from-[#0D1B4A] via-[#152355] to-[#1E293B] text-white p-5 rounded-3xl shadow-sm border border-blue-900/40 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  Total Estimasi Insentif
                </span>
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
              <div className="my-2">
                <h2 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                  {formatRupiah(teamIncentives.grandTotal)}
                </h2>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Akumulasi {teamIncentives.totalCompleted} tugas selesai
                </p>
              </div>
              <div className="text-[10px] text-amber-200/80 bg-white/10 px-2.5 py-1 rounded-lg">
                Siap diklaim pada penutupan periode
              </div>
            </div>

            {/* 2. Komisi Pekerjaan */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  Komisi Pekerjaan
                </span>
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
              </div>
              <div className="my-2">
                <h3 className="text-2xl font-black text-slate-900">
                  {formatRupiah(teamIncentives.totalBaseFee)}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dari {teamIncentives.totalCompleted} pekerjaan sukses
                </p>
              </div>
              <div className="text-[10px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
                Dihitung dari volume item pekerjaan
              </div>
            </div>

            {/* 3. Volume Item Terverifikasi */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Volume Item Dikerjakan
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div className="my-2">
                <h3 className="text-2xl font-black text-emerald-600">
                  {teamIncentives.itemsAggregated?.reduce((acc, item) => acc + item.totalQty, 0) || 0}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dari {teamIncentives.itemsAggregated?.length || 0} macam jenis pekerjaan
                </p>
              </div>
              <div className="text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                Tabel Komisi Pekerjaan Team Nexus
              </div>
            </div>

            {/* 4. Bonus Target Kinerja */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Bonus Target Kinerja
                </span>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <div className="my-2">
                <h3 className="text-2xl font-black text-amber-600">
                  {formatRupiah(teamIncentives.activeTierBonus)}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {teamIncentives.achievedTierLabel || "Belum ada bonus tier"}
                </p>
              </div>
              <div className="text-[10px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg">
                Target bulanan tim teknisi
              </div>
            </div>
          </div>

          {/* Banner Progres Target Kinerja Bulanan */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  Progres Target Kinerja Bulanan Tim
                </h4>
              </div>
              {teamIncentives.nextTier ? (
                <span className="text-xs font-bold text-slate-600">
                  {teamIncentives.totalCompleted} dari {teamIncentives.nextTier.targetCount} Tugas ({teamIncentives.nextTier.progressPercent}%)
                </span>
              ) : (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  🏆 Target Maksimal Tercapai
                </span>
              )}
            </div>

            {teamIncentives.nextTier && (
              <div className="space-y-1.5">
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${teamIncentives.nextTier.progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600">
                  Semangat! Selesaikan <b>{teamIncentives.nextTier.remainingCount} pekerjaan lagi</b> untuk membuka{" "}
                  <span className="font-bold text-amber-600">{teamIncentives.nextTier.label}</span> dan memperoleh bonus tambahan{" "}
                  <span className="font-bold text-slate-900">{formatRupiah(teamIncentives.nextTier.bonusAmount)}</span>!
                </p>
              </div>
            )}

            {/* Daftar Level Target */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              {incentiveConfig.tierTargets.map((tier) => {
                const isReached = teamIncentives.totalCompleted >= tier.targetCount;
                return (
                  <div
                    key={tier.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      isReached
                        ? "bg-amber-50/60 border-amber-300 text-amber-900"
                        : "bg-slate-50/60 border-slate-200 text-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                          isReached ? "bg-amber-400 text-[#0D1B4A]" : "bg-slate-200 text-slate-400"
                        }`}
                      >
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs sm:text-sm text-slate-900">{tier.label}</h5>
                        <p className="text-[11px] text-slate-500">
                          Bonus: <b className="text-emerald-700">{formatRupiah(tier.bonusAmount)}</b>
                        </p>
                      </div>
                    </div>
                    <div>
                      {isReached ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                          <Check className="w-3.5 h-3.5 stroke-[3]" /> Tercapai
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                          {tier.targetCount - teamIncentives.totalCompleted} lagi
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rujukan Tarif Komisi Resmi Team Nexus */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900">
                    Rekapitulasi Volume Pekerjaan Tim (Tabel Komisi Team Nexus)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Akumulasi pekerjaan lapangan yang telah diverifikasi dan siap dibayarkan
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200 w-fit">
                Total Komisi Item: {formatRupiah(teamIncentives.totalBaseFee)}
              </span>
            </div>

            {/* Tabel Ringkasan Item Terakumulasi */}
            {teamIncentives.itemsAggregated && teamIncentives.itemsAggregated.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                      <th className="py-2 px-3">Keterangan Pekerjaan</th>
                      <th className="py-2 px-3 text-center">Satuan</th>
                      <th className="py-2 px-3 text-right">Tarif Komisi</th>
                      <th className="py-2 px-3 text-center">Volume Total</th>
                      <th className="py-2 px-3 text-right">Subtotal Komisi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamIncentives.itemsAggregated.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">{item.nama}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.kategori} · {item.taskCount} tugas terkait
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {item.satuan}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                          {formatRupiah(item.tarif)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-slate-900">
                          {item.totalQty.toLocaleString("id-ID")} {item.satuan}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                          {formatRupiah(item.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50/70 font-black">
                      <td colSpan={4} className="py-2.5 px-3 text-right text-slate-700">
                        TOTAL KOMISI VOLUME PEKERJAAN:
                      </td>
                      <td className="py-2.5 px-3 text-right text-sm text-slate-900">
                        {formatRupiah(teamIncentives.totalBaseFee)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2">
                Belum ada volume pekerjaan lapangan tercatat pada periode ini.
              </p>
            )}
          </div>

          {/* Rincian Item Pekerjaan yang Selesai */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Rincian Tugas Selesai ({filteredWalletBreakdown.length} Pekerjaan)
                </h4>
                <p className="text-xs text-slate-500">
                  Daftar seluruh pekerjaan yang telah diselesaikan beserta perolehan komisi riil
                </p>
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari rincian..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#F59E0B] outline-none"
                />
              </div>
            </div>

            {filteredWalletBreakdown.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <FileCheck className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">Belum ada tugas selesai</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Selesaikan pekerjaan di tab Kanban Board atau Daftar Tugas untuk mulai mengakumulasikan komisi tim Anda.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                        <th className="py-2.5 px-3">Pelanggan / Alamat</th>
                        <th className="py-2.5 px-3">Jenis Tugas</th>
                        <th className="py-2.5 px-3">Rincian Item Dikerjakan</th>
                        <th className="py-2.5 px-3">Redaman Optik</th>
                        <th className="py-2.5 px-3 text-right">Total Komisi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredWalletBreakdown.map((task) => (
                        <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900">{task.pelanggan}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{task.alamat}</p>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                              {task.jenis}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {Array.isArray(task.incentive?.items) && task.incentive.items.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {task.incentive.items.map((it, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold"
                                  >
                                    <span>{it.nama}:</span>
                                    <b className="font-bold">{it.qty} {it.satuan}</b>
                                    <span className="text-amber-600 font-mono">({formatRupiah(it.subtotal)})</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px] italic">
                                Tarif standar jenis tugas
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {task.incentive?.redaman !== null && task.incentive?.redaman !== undefined ? (
                              <span className="font-mono font-bold text-slate-700">
                                {task.incentive.redaman} dBm
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                            {formatRupiah(task.incentive?.total || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards List */}
                <div className="md:hidden space-y-3">
                  {filteredWalletBreakdown.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200/70 text-slate-700">
                          {task.jenis}
                        </span>
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          {formatRupiah(task.incentive?.total || 0)}
                        </span>
                      </div>

                      <div>
                        <h5 className="font-bold text-sm text-slate-900">{task.pelanggan}</h5>
                        <p className="text-xs text-slate-500 line-clamp-1">{task.alamat}</p>
                      </div>

                      {Array.isArray(task.incentive?.items) && task.incentive.items.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {task.incentive.items.map((it, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[9px] font-semibold border border-amber-200"
                            >
                              <span>{it.nama}</span>
                              <b>{it.qty} {it.satuan}</b>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {task.incentive?.redaman !== null && task.incentive?.redaman !== undefined ? `${task.incentive.redaman} dBm` : "N/A"}
                          </span>
                        </div>
                        <span className="text-slate-500 text-[11px] font-bold">
                          Komisi: {formatRupiah(task.incentive?.total || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODALS (SELESAI & KENDALA)                                             */}
      {/* ========================================================================= */}
      {/* Modal Terpadu Penyelesaian Tugas & SOP 1 Foto */}
      <TaskCompletionModal
        isOpen={Boolean(selectedTask)}
        task={selectedTask}
        odpList={odpList}
        masterKomisi={masterKomisi}
        onClose={() => setSelectedTask(null)}
        onComplete={handleCompleteTaskFromModal}
      />

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

      {/* ========================================================================= */}
      {/* 8. MODAL CETAK SLIP INSENTIF RESMI                                        */}
      {/* ========================================================================= */}
      {showSlipModal && (
        <div className="print-modal-container fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="print-slip-card bg-white w-full max-w-xl rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-200 max-h-[95vh] overflow-y-auto print:p-0 print:border-none print:shadow-none">
            {/* Header Slip */}
            <div className="flex items-start justify-between pb-4 border-b-2 border-slate-900">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#0D1B4A] text-amber-400 flex items-center justify-center font-black text-xs">
                    X
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-[#0D1B4A]">
                    PT NEXUS NET NUSANTARA
                  </h3>
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                  SISTEM OPERASIONAL JARINGAN & TEKNISI FIBER OPTIK
                </p>
                <p className="text-xs font-bold text-slate-800 pt-1">
                  SLIP REKAPITULASI INSENTIF PRESTASI TEKNISI
                </p>
              </div>

              <button
                onClick={() => setShowSlipModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer print:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informasi Slip */}
            <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-100">
              <div>
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Regu / Tim Teknisi:</p>
                <p className="font-bold text-slate-900 text-sm">{activeTeam}</p>
                <p className="text-slate-500 text-[11px] mt-1">
                  Pencetak: <b>{profile?.full_name || "Teknisi"}</b>
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Periode Perhitungan / Cut-Off:</p>
                <p className="font-bold text-slate-900 text-sm">
                  {walletPeriodLabel}
                </p>
                <p className="text-slate-400 text-[10px] mt-1">
                  Dicetak pada: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>

            {/* Rincian Komponen Insentif Berdasarkan Tabel Komisi Team Nexus */}
            <div className="py-4 space-y-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase">
                    <th className="py-2 text-left">Rincian Pekerjaan Lapangan</th>
                    <th className="py-2 text-center">Volume Total</th>
                    <th className="py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {teamIncentives.itemsAggregated && teamIncentives.itemsAggregated.length > 0 ? (
                    teamIncentives.itemsAggregated.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2.5">
                          <p className="font-semibold text-slate-900">{it.nama}</p>
                          <span className="block text-[10px] text-slate-400">
                            Tarif: {formatRupiah(it.tarif)} / {it.satuan} ({it.taskCount} tugas)
                          </span>
                        </td>
                        <td className="py-2.5 text-center font-bold">
                          {it.totalQty.toLocaleString("id-ID")} {it.satuan}
                        </td>
                        <td className="py-2.5 text-right font-bold text-slate-900">
                          {formatRupiah(it.totalAmount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-2.5">Komisi Pekerjaan Selesai</td>
                      <td className="py-2.5 text-center font-bold">{teamIncentives.totalCompleted} Tugas</td>
                      <td className="py-2.5 text-right font-bold text-slate-900">
                        {formatRupiah(teamIncentives.totalBaseFee)}
                      </td>
                    </tr>
                  )}

                  {teamIncentives.activeTierBonus > 0 && (
                    <tr>
                      <td className="py-2.5">
                        Bonus Target Prestasi Bulanan
                        <span className="block text-[10px] text-slate-400">
                          {teamIncentives.achievedTierLabel}
                        </span>
                      </td>
                      <td className="py-2.5 text-center font-bold text-amber-700">
                        1 Tier
                      </td>
                      <td className="py-2.5 text-right font-bold text-amber-700">
                        {formatRupiah(teamIncentives.activeTierBonus)}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900">
                    <td colSpan={2} className="py-3 text-sm font-black text-slate-900 uppercase">
                      Total Komisi Bersih:
                    </td>
                    <td className="py-3 text-right text-base font-black text-slate-900">
                      {formatRupiah(teamIncentives.grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Tanda Tangan */}
            <div className="grid grid-cols-2 gap-8 pt-8 pb-4 text-center text-xs">
              <div className="space-y-12">
                <p className="text-slate-500 font-semibold">Penerima (Tim Teknisi):</p>
                <div className="border-b border-slate-300 w-3/4 mx-auto" />
                <p className="font-bold text-slate-900">({activeTeam})</p>
              </div>
              <div className="space-y-12">
                <p className="text-slate-500 font-semibold">Mengetahui (Supervisor / Finance):</p>
                <div className="border-b border-slate-300 w-3/4 mx-auto" />
                <p className="font-bold text-slate-900">(PT NEXUS NET)</p>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="flex gap-2 pt-4 border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={() => setShowSlipModal(false)}
                className="flex-1 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-2 py-3 text-xs font-bold bg-[#0D1B4A] hover:bg-[#1a237e] text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Cetak / Unduh PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL ATUR TARIF & BONUS INSENTIF (SUPERVISOR / ADMIN ONLY)            */}
      {/* ========================================================================= */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 border border-slate-200 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            {/* Mobile Drag Indicator Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Atur Skema Insentif & Bonus</h3>
                  <p className="text-xs text-slate-500">Konfigurasi tarif fee pokok dan bonus target teknisi</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="mt-4 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-600" /> Tabel Komisi Pekerjaan Team Nexus
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">{masterKomisi.length} Item Terdaftar</span>
                </div>

                <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                  {masterKomisi.map((item) => {
                    const currentRate = configForm.itemRates?.[item.id] !== undefined
                      ? configForm.itemRates[item.id]
                      : item.tarif;

                    return (
                      <div
                        key={item.id}
                        className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.nama}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded">
                              Per {item.satuan}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">{item.keterangan}</span>
                          </div>
                        </div>

                        <div className="w-32 shrink-0">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                              Rp
                            </span>
                            <input
                              type="number"
                              min={0}
                              step={item.satuan === "Meter" ? 50 : 500}
                              value={currentRate}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setConfigForm((prev) => ({
                                  ...prev,
                                  itemRates: {
                                    ...(prev.itemRates || {}),
                                    [item.id]: val,
                                  },
                                }));
                              }}
                              className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right focus:ring-2 focus:ring-amber-400 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Target Kinerja Bulanan */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-600" /> Target Prestasi Bulanan
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-slate-900">Target Silver</p>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Jumlah Tugas Selesai</label>
                      <input
                        type="number"
                        min={1}
                        value={configForm.tierTargets[0]?.targetCount || 25}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 25;
                          setConfigForm((prev) => {
                            const tiers = [...prev.tierTargets];
                            tiers[0] = { ...tiers[0], targetCount: val };
                            return { ...prev, tierTargets: tiers };
                          });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Bonus Nominal (Rp)</label>
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        value={configForm.tierTargets[0]?.bonusAmount || 100000}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setConfigForm((prev) => {
                            const tiers = [...prev.tierTargets];
                            tiers[0] = { ...tiers[0], bonusAmount: val };
                            return { ...prev, tierTargets: tiers };
                          });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-slate-900">Target Gold</p>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Jumlah Tugas Selesai</label>
                      <input
                        type="number"
                        min={1}
                        value={configForm.tierTargets[1]?.targetCount || 40}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 40;
                          setConfigForm((prev) => {
                            const tiers = [...prev.tierTargets];
                            tiers[1] = { ...tiers[1], targetCount: val };
                            return { ...prev, tierTargets: tiers };
                          });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Bonus Nominal (Rp)</label>
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        value={configForm.tierTargets[1]?.bonusAmount || 250000}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setConfigForm((prev) => {
                            const tiers = [...prev.tierTargets];
                            tiers[1] = { ...tiers[1], bonusAmount: val };
                            return { ...prev, tierTargets: tiers };
                          });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetConfig}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Default
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-[#0D1B4A] hover:bg-[#1a237e] text-white rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Simpan Tarif
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. MODAL PANDUAN STANDAR REDAMAN OPM (OPTICAL POWER METER)               */}
      {/* ========================================================================= */}
      {showOpmGuideModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            {/* Mobile Drag Indicator Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Standar Redaman Optik (OPM)</h3>
                  <p className="text-xs text-slate-500">Toleransi daya optik Rx ONT & panduan troubleshooting kabel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOpmGuideModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Standar Redaman Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>PRIMA (SOP)</span>
                </div>
                <p className="text-sm font-black text-emerald-900">-15.0 s/d -22.9 dBm</p>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Kualitas terbaik, bebas packet loss, dan berhak atas bonus insentif teknisi.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-800 font-extrabold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>WASPADA</span>
                </div>
                <p className="text-sm font-black text-amber-900">-23.0 s/d -25.9 dBm</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Cukup online, namun rentan drop saat hujan. Periksa tekukan kabel dropcore.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
                <div className="flex items-center gap-1.5 text-rose-800 font-extrabold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>KRITIS / LOS</span>
                </div>
                <p className="text-sm font-black text-rose-900">&gt; -26.0 dBm</p>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Potensi LOS (Lampu PON merah), wajib perbaiki sambungan sebelum ditinggal.
                </p>
              </div>
            </div>

            {/* Parameter Panjang Gelombang */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-blue-600" /> Kalibrasi Panjang Gelombang (Lambda):
              </h4>
              <ul className="space-y-1 text-slate-600 list-disc list-inside text-[11px]">
                <li><b>1490 nm:</b> Downstream data internet GPON dari OLT ke ONT (Gunakan ini saat ukur di OPM).</li>
                <li><b>1310 nm:</b> Upstream transmisi dari ONT ke OLT.</li>
                <li><b>1550 nm:</b> Jalur siaran TV kabel / RF overlay fiber optik.</li>
              </ul>
            </div>

            {/* Tips Penanganan Redaman Tinggi */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2 text-xs">
              <h4 className="font-bold text-blue-950 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-blue-600" /> Tips Mengatasi Redaman Jelek di Tiang:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-blue-900">
                <div className="p-2 rounded-xl bg-white border border-blue-100">
                  <b>1. Fast Connector Kotor</b>
                  <p className="text-slate-500 mt-0.5">Bersihkan ferrule konektor SC dengan alkohol pad 99%.</p>
                </div>
                <div className="p-2 rounded-xl bg-white border border-blue-100">
                  <b>2. Macrobending Dropcore</b>
                  <p className="text-slate-500 mt-0.5">Pastikan radius tekukan kabel minimal 3 cm di klem tiang.</p>
                </div>
                <div className="p-2 rounded-xl bg-white border border-blue-100">
                  <b>3. Cleaver Miring</b>
                  <p className="text-slate-500 mt-0.5">Kupas ulang fiber dan potong 90° dengan cleaver presisi.</p>
                </div>
                <div className="p-2 rounded-xl bg-white border border-blue-100">
                  <b>4. Splitter ODP Drop</b>
                  <p className="text-slate-500 mt-0.5">Ukur port ODP lain atau laporkan ke NOC jika port ODP drop.</p>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowOpmGuideModal(false)}
                className="px-4 py-2 bg-[#0D1B4A] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#1a237e] transition-all cursor-pointer"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. MODAL HOTLINE NOC & DISPATCHER LAPANGAN                               */}
      {/* ========================================================================= */}
      {showNocContactModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            {/* Mobile Drag Indicator Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Hotline NOC & Eskalasi</h3>
                  <p className="text-xs text-slate-500">Kontak darurat operasional jaringan OLT & Dispatcher</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNocContactModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {/* NOC OLT Core */}
              <div className="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/60 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-slate-900">NOC Network & OLT Core</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Cek Unregistered ONT / LOS OLT / Reboot PON</p>
                  <p className="text-xs font-bold text-blue-700 mt-1 font-mono">0812-8899-7701</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href="tel:081288997701"
                    className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                    title="Telepon NOC"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <a
                    href="https://wa.me/6281288997701?text=Halo%20NOC%2C%20mohon%20bantuan%20cek%20status%20GPON%20di%20lapangan."
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    title="WhatsApp NOC"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Dispatcher Lapangan */}
              <div className="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/60 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-slate-900">Dispatcher & Helpdesk</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Reschedule pelanggan / kendala akses tiang PLN</p>
                  <p className="text-xs font-bold text-blue-700 mt-1 font-mono">0813-7722-1144</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href="tel:081377221144"
                    className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                    title="Telepon Dispatcher"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <a
                    href="https://wa.me/6281377221144?text=Halo%20Dispatcher%2C%20ada%20kendala%20jadwal%20tugas%20di%20lapangan."
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    title="WhatsApp Dispatcher"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Admin Layanan & Pelanggan */}
              <div className="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/60 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-slate-900">Admin Layanan & Pelanggan</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Aktivasi akun internet pelanggan baru & reset auth</p>
                  <p className="text-xs font-bold text-blue-700 mt-1 font-mono">0811-5566-3322</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href="tel:081155663322"
                    className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                    title="Telepon Admin"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <a
                    href="https://wa.me/6281155663322?text=Halo%20Admin%2C%20mohon%20bantuan%20aktivasi%20layanan%20internet%20pelanggan."
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    title="WhatsApp Admin"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowNocContactModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 12. MODAL SOP & CHECKLIST INSTALASI K3                                    */}
      {/* ========================================================================= */}
      {showSopModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            {/* Mobile Drag Indicator Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">SOP Standar Instalasi & K3</h3>
                  <p className="text-xs text-slate-500">Checklist kepatuhan mutu kerja lapangan telekomunikasi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSopModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-xs">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-900">Periksa Ketersediaan Port & Redaman ODP</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Sebelum menarik kabel ke rumah pelanggan, ukur dahulu port splitter di ODP tiang. Pastikan sinyal normal (-15 s/d -20 dBm).
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-xs">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-900">Penarikan Dropcore & Pemasangan Klem</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Gunakan clamp S-clamp / dead-end dengan kencang tanpa meremukkan selongsong fiber. Hindari gesekan dengan kawat tegangan tinggi PLN.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-xs">
                  3
                </div>
                <div>
                  <p className="font-bold text-slate-900">Terminasi Fast Connector SC-UPC</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Kupas fiber, bersihkan dengan alkohol, dan kunci konektor dengan rapi di dalam Roset / Faceplate dinding.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-xs">
                  4
                </div>
                <div>
                  <p className="font-bold text-slate-900">Konfigurasi ONT & Tes Koneksi Speedtest</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Set PPPoE credentials, pastikan lampu PON menyala hijau solid, dan tes browsing bersama pelanggan.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black text-xs">
                  5
                </div>
                <div>
                  <p className="font-bold text-slate-900">Upload 3 Foto Bukti Ber-Watermark GPS</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Ambil foto redaman OPM, tiang ODP, dan barcode MAC modem melalui tombol Selesai di aplikasi ini.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowSopModal(false)}
                className="px-4 py-2 bg-[#0D1B4A] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#1a237e] transition-all cursor-pointer"
              >
                Saya Mengerti & Patuhi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak Slip Gaji & Insentif Resmi Teknisi */}
      {showSlipModal && (
        <SlipGajiModal
          payrollData={technicianPayrollData}
          onClose={() => setShowSlipModal(false)}
        />
      )}

      {/* Modal Bukti Dokumentasi Lapangan Teknisi */}
      {viewEvidenceTask && (
        <BuktiLapanganModal
          task={viewEvidenceTask}
          masterKomisi={masterKomisi}
          onClose={() => setViewEvidenceTask(null)}
        />
      )}

      {/* Modal Konfirmasi Reset Tarif */}
      <ConfirmModal
        isOpen={showResetConfigConfirm}
        onClose={() => setShowResetConfigConfirm(false)}
        onConfirm={confirmResetConfig}
        title="Reset Tarif Insentif?"
        message="Apakah Anda yakin ingin mengembalikan seluruh skema tarif insentif teknisi ke pengaturan standar bawaan?"
        confirmText="Reset ke Standar"
        variant="warning"
      />
    </div>
  );
}
