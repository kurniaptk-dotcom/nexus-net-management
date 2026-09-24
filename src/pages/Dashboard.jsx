import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Wrench,
  Target,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  XCircle,
  Network,
  Clock,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  Users,
  Layers,
  ChevronRight,
  Calendar,
  Filter,
  RotateCcw,
  CalendarDays,
  TrendingUp,
  Wifi,
  Activity,
  MapPin,
  CalendarClock,
  CalendarCheck,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  initialTimData,
  daftarGangguanList,
  pekerjaanList,
  leadsList,
  odpOdcList,
  odcMasterList,
} from "../data/mockData";
import { usePersistState } from "../hooks/usePersistState";

const PIE_COLORS = ["#0D1B4A", "#F59E0B", "#F97316", "#10B981", "#6366F1", "#EC4899"];

function parseRecordDate(dStr) {
  if (!dStr) return null;
  const s = String(dStr).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  // D-M-YY or DD-MM-YYYY (e.g. 21-7-26 or 21-07-2026)
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

function StatCard({ icon: Icon, label, value, subtext, changeType = "up", bgGradient, href }) {
  const content = (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 group cursor-pointer relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-1 tracking-tight truncate">{value}</p>
          {subtext && (
            <div
              className={`flex items-center gap-1 mt-2 text-xs font-semibold ${
                changeType === "up"
                  ? "text-emerald-600"
                  : changeType === "down"
                  ? "text-red-500"
                  : "text-gray-500"
              }`}
            >
              {changeType === "up" ? (
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              ) : changeType === "down" ? (
                <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
              ) : null}
              <span className="truncate">{subtext}</span>
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${bgGradient} group-hover:scale-110 shadow-sm transition-transform duration-300`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return href ? <Link to={href}>{content}</Link> : content;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0D1B4A] text-white px-4 py-3 rounded-xl shadow-xl text-sm border border-white/10">
        <p className="font-bold mb-1 text-gray-200">{label}</p>
        {payload.map((item, i) => (
          <p key={i} className="text-white/80 text-xs py-0.5 flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}:
            </span>
            <span className="font-bold text-white">{item.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  // Real-time persistent state synced across all tabs and components
  const [pekerjaanData] = usePersistState("xnet_pekerjaan", pekerjaanList);
  const [leadsData] = usePersistState("xnet_leads", leadsList);
  const [gangguanData] = usePersistState("xnet_daftar_gangguan_v2", daftarGangguanList);
  const [timData] = usePersistState("xnet_tim", initialTimData);
  const [odpData] = usePersistState("xnet_odpodc", odpOdcList);
  const [odcList] = usePersistState("xnet_odc_list", odcMasterList);

  const [, setRefreshKey] = useState(0);

  // Time Filtering State (ALL | TODAY | WEEK | MONTH | CUSTOM)
  const [timeFilter, setTimeFilter] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("2026-09-24");
  const [customStartDate, setCustomStartDate] = useState("2026-09-01");
  const [customEndDate, setCustomEndDate] = useState("2026-09-24");
  const [scheduleTab, setScheduleTab] = useState("ALL");

  const isDateInRange = (dateStr) => {
    if (timeFilter === "ALL") return true;
    const d = parseRecordDate(dateStr);
    if (!d) return false;

    const targetTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    if (timeFilter === "TODAY") {
      const target = parseRecordDate(selectedDate);
      if (!target) return false;
      const refTime = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
      return targetTime === refTime;
    }

    if (timeFilter === "WEEK") {
      const end = parseRecordDate(selectedDate) || new Date();
      const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).getTime();
      const startTime = endTime - 7 * 24 * 60 * 60 * 1000;
      return targetTime >= startTime && targetTime <= endTime;
    }

    if (timeFilter === "MONTH") {
      const ref = parseRecordDate(selectedDate) || new Date();
      return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
    }

    if (timeFilter === "CUSTOM") {
      const s = parseRecordDate(customStartDate);
      const e = parseRecordDate(customEndDate);
      const sTime = s ? new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime() : 0;
      const eTime = e ? new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59).getTime() : Infinity;
      return targetTime >= sTime && targetTime <= eTime;
    }

    return true;
  };

  // Filtered Datasets based on Time Filter
  const filteredPekerjaan = useMemo(() => {
    return pekerjaanData.filter((p) => isDateInRange(p.tanggal));
  }, [pekerjaanData, timeFilter, selectedDate, customStartDate, customEndDate]);

  const filteredLeads = useMemo(() => {
    return leadsData.filter((l) => isDateInRange(l.tanggal));
  }, [leadsData, timeFilter, selectedDate, customStartDate, customEndDate]);

  const filteredGangguan = useMemo(() => {
    return gangguanData.filter((g) => isDateInRange(g.tanggalMulai));
  }, [gangguanData, timeFilter, selectedDate, customStartDate, customEndDate]);

  // Pekerjaan Stats
  const totalPekerjaan = filteredPekerjaan.length;
  const selesai = useMemo(() => filteredPekerjaan.filter((d) => d.status === "SELESAI").length, [filteredPekerjaan]);
  const waiting = useMemo(() => filteredPekerjaan.filter((d) => d.status === "WAITING LIST").length, [filteredPekerjaan]);
  const dijadwalkan = useMemo(() => filteredPekerjaan.filter((d) => d.status === "DIJADWALKAN").length, [filteredPekerjaan]);
  const gagal = useMemo(() => filteredPekerjaan.filter((d) => d.status === "GAGAL").length, [filteredPekerjaan]);
  const completionRate = totalPekerjaan > 0 ? ((selesai / totalPekerjaan) * 100).toFixed(0) : "0";

  // Detail Pekerjaan per Kategori Layanan
  const detailPekerjaan = useMemo(() => {
    const calcJenis = (jenis) => {
      const items = filteredPekerjaan.filter((p) => p.jenis === jenis);
      const sel = items.filter((p) => p.status === "SELESAI").length;
      const wait = items.filter((p) => p.status === "WAITING LIST").length;
      const dij = items.filter((p) => p.status === "DIJADWALKAN").length;
      const gag = items.filter((p) => p.status === "GAGAL").length;
      const tot = items.length;
      const rate = tot > 0 ? Math.round((sel / tot) * 100) : 0;
      const userTerdampak = items.reduce((acc, curr) => acc + (Number(curr.userTerdampak) || 0), 0);
      return { total: tot, selesai: sel, waiting: wait, dijadwalkan: dij, gagal: gag, rate, userTerdampak };
    };

    return {
      pemasangan: calcJenis("PEMASANGAN"),
      perbaikan: calcJenis("PERBAIKAN"),
      perbaikanKhusus: calcJenis("PERBAIKAN KHUSUS (ODP/ODC)"),
      pemutusan: calcJenis("PEMUTUSAN"),
    };
  }, [filteredPekerjaan]);

  const statusSummaryPercentages = useMemo(() => {
    const tot = filteredPekerjaan.length;
    if (!tot) return { selesai: 0, waiting: 0, dijadwalkan: 0, gagal: 0 };
    return {
      selesai: Math.round((selesai / tot) * 100),
      waiting: Math.round((waiting / tot) * 100),
      dijadwalkan: Math.round((dijadwalkan / tot) * 100),
      gagal: Math.round((gagal / tot) * 100),
    };
  }, [filteredPekerjaan.length, selesai, waiting, dijadwalkan, gagal]);

  // Leads Stats
  const totalLeads = filteredLeads.length;
  const leadsKonversi = useMemo(() => filteredLeads.filter((d) => d.status === "SELESAI").length, [filteredLeads]);
  const leadsConversionRate = totalLeads > 0 ? ((leadsKonversi / totalLeads) * 100).toFixed(0) : "0";

  // Gangguan Stats (Synced with xnet_daftar_gangguan_v2)
  const totalGangguan = filteredGangguan.length;
  const gangguanAman = useMemo(
    () => filteredGangguan.filter((g) => (g.hasilFU || "").trim().toLowerCase() === "aman").length,
    [filteredGangguan]
  );
  const gangguanBermasalah = useMemo(
    () => filteredGangguan.filter((g) => (g.hasilFU || "").trim().toLowerCase() === "bermasalah").length,
    [filteredGangguan]
  );
  const gangguanNgelag = useMemo(
    () => filteredGangguan.filter((g) => (g.hasilFU || "").trim().toLowerCase().includes("ngelag")).length,
    [filteredGangguan]
  );
  const gangguanBelumFU = useMemo(
    () => filteredGangguan.filter((g) => !(g.hasilFU || "").trim()).length,
    [filteredGangguan]
  );
  const gangguanBelumSelesai = useMemo(
    () => filteredGangguan.filter((g) => (g.hasilFU || "").trim().toLowerCase() !== "aman").length,
    [filteredGangguan]
  );

  // ODP / ODC Infrastructure Stats
  const totalOdp = odpData.length;
  const totalOdc = useMemo(() => {
    const fromOdp = (odpData || []).map((o) => o.odc).filter(Boolean);
    const fromOdcList = (odcList || []).map((o) => o.nama).filter(Boolean);
    return new Set([...fromOdcList, ...fromOdp]).size;
  }, [odcList, odpData]);
  const odpLinkedCount = useMemo(() => filteredPekerjaan.filter((p) => !!p.odp).length, [filteredPekerjaan]);

  // Tim Chart Data
  const timChartData = useMemo(() => {
    return timData.map((t) => {
      const timP = filteredPekerjaan.filter((p) => p.tim === t.nama);
      return {
        name: t.nama.split(" - ")[0],
        pemasangan: timP.filter((p) => p.jenis === "PEMASANGAN" && p.status !== "GAGAL").length,
        perbaikan: timP.filter((p) => p.jenis === "PERBAIKAN" && p.status !== "GAGAL").length,
        perbaikanKhusus: timP.filter((p) => p.jenis === "PERBAIKAN KHUSUS (ODP/ODC)" && p.status !== "GAGAL").length,
        pemutusan: timP.filter((p) => p.jenis === "PEMUTUSAN" && p.status !== "GAGAL").length,
        gagal: timP.filter((p) => p.status === "GAGAL").length,
      };
    });
  }, [timData, filteredPekerjaan]);

  // Leads Sources
  const leadsBySumber = useMemo(() => {
    const counts = filteredLeads.reduce((acc, l) => {
      const src = l.sumber || "LAINNYA";
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {});
    const items = Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
      value,
    }));
    return items.length > 0 ? items : [{ name: "Belum Ada", value: 1 }];
  }, [filteredLeads]);

  // Trend Chart Data (Adapts to Week or Month)
  const trendChartData = useMemo(() => {
    if (timeFilter === "WEEK") {
      const end = parseRecordDate(selectedDate) || new Date();
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(end);
        d.setDate(d.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dayNum = String(d.getDate()).padStart(2, "0");
        const dayStr = `${y}-${m}-${dayNum}`;
        const dayLabel = `${d.getDate()} ${d.toLocaleString("id-ID", { month: "short" })}`;
        const jobs = filteredPekerjaan.filter((p) => p.tanggal === dayStr).length;
        const leads = filteredLeads.filter((l) => l.tanggal === dayStr).length;
        days.push({ name: dayLabel, pekerjaan: jobs, leads });
      }
      return days;
    }

    const parseDay = (dStr) => {
      const d = parseRecordDate(dStr);
      return d ? d.getDate() : null;
    };

    const weeks = ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"];
    return weeks.map((name, i) => {
      const start = 1 + i * 7;
      const end = Math.min(start + 6, 31);
      const jobsCount = filteredPekerjaan.filter((p) => {
        const day = parseDay(p.tanggal);
        return day !== null && day >= start && day <= end;
      }).length;
      const leadsCount = filteredLeads.filter((l) => {
        const day = parseDay(l.tanggal);
        return day !== null && day >= start && day <= end;
      }).length;
      return { name, pekerjaan: jobsCount, leads: leadsCount };
    });
  }, [filteredPekerjaan, filteredLeads, timeFilter, selectedDate]);

  // Gangguan Categories
  const gangguanKategoriList = useMemo(() => {
    const cats = {
      "LOS / Sinyal Hilang": 0,
      "Modem / Restart": 0,
      "Lelet / Ngelag": 0,
      "Putus / Tanpa Koneksi": 0,
      "Lainnya": 0,
    };
    filteredGangguan.forEach((g) => {
      const text = (g.keterangan || "").toLowerCase();
      if (text.includes("los") || text.includes("lampu merah") || text.includes("tidak ada sinyal")) {
        cats["LOS / Sinyal Hilang"]++;
      } else if (text.includes("modem") || text.includes("restart")) {
        cats["Modem / Restart"]++;
      } else if (text.includes("lelet") || text.includes("lag") || text.includes("ngelag")) {
        cats["Lelet / Ngelag"]++;
      } else if (text.includes("putus") || text.includes("tidak ada koneksi") || text.includes("tidak nyambung")) {
        cats["Putus / Tanpa Koneksi"]++;
      } else {
        cats["Lainnya"]++;
      }
    });
    return Object.entries(cats).filter(([, v]) => v > 0);
  }, [filteredGangguan]);

  // Kinerja per Tim
  const kinerjaPemasangan = useMemo(() => {
    return timData.map((t) => {
      const timP = filteredPekerjaan.filter((p) => p.tim === t.nama && p.jenis === "PEMASANGAN");
      const done = timP.filter((p) => p.status === "SELESAI").length;
      const total = timP.length;
      const fail = timP.filter((p) => p.status === "GAGAL").length;
      return { tim: t.nama, selesai: done, total, persen: total > 0 ? (done / total) * 100 : 0, gagal: fail };
    });
  }, [timData, filteredPekerjaan]);

  const kinerjaPemutusan = useMemo(() => {
    return timData.map((t) => {
      const timP = filteredPekerjaan.filter((p) => p.tim === t.nama && p.jenis === "PEMUTUSAN");
      const done = timP.filter((p) => p.status === "SELESAI").length;
      const total = timP.length;
      return { tim: t.nama, selesai: done, total, persen: total > 0 ? (done / total) * 100 : null };
    });
  }, [timData, filteredPekerjaan]);

  // Urgent pending jobs (Waiting list / Dijadwalkan)
  const pendingJobs = useMemo(() => {
    return filteredPekerjaan
      .filter((p) => p.status === "WAITING LIST" || p.status === "DIJADWALKAN")
      .slice(0, 5);
  }, [filteredPekerjaan]);

  // Complaints needing attention
  const urgentGangguan = useMemo(() => {
    return filteredGangguan
      .filter((g) => (g.hasilFU || "").trim().toLowerCase() === "bermasalah" || !(g.hasilFU || "").trim())
      .slice(0, 5);
  }, [filteredGangguan]);

  // Pekerjaan Hari Ini & Jadwal Terdekat
  const todayRefStr = selectedDate || "2026-09-24";
  const refToday = useMemo(() => parseRecordDate(todayRefStr) || new Date(), [todayRefStr]);

  const scheduleData = useMemo(() => {
    const todayTime = new Date(refToday.getFullYear(), refToday.getMonth(), refToday.getDate()).getTime();

    const mapped = (pekerjaanData || []).map((p) => {
      const d = parseRecordDate(p.tanggal);
      const itemTime = d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() : null;
      const isToday = itemTime !== null && itemTime === todayTime;
      const isUpcoming = itemTime !== null && itemTime > todayTime;
      const isPast = itemTime !== null && itemTime < todayTime;
      const isWaiting = p.status === "WAITING LIST";
      const isScheduled = p.status === "DIJADWALKAN";

      let diffDays = null;
      if (itemTime !== null) {
        diffDays = Math.round((itemTime - todayTime) / (1000 * 60 * 60 * 24));
      }

      return {
        ...p,
        parsedDate: d,
        itemTime,
        diffDays,
        isToday,
        isUpcoming,
        isPast,
        isWaiting,
        isScheduled,
      };
    });

    const todayJobs = mapped.filter((p) => p.isToday);
    const upcomingJobs = mapped
      .filter((p) => p.isUpcoming && p.status !== "GAGAL")
      .sort((a, b) => (a.itemTime || 0) - (b.itemTime || 0));
    const waitingJobs = mapped.filter((p) => p.isWaiting);

    const prioritized = [
      ...todayJobs.filter((p) => p.status !== "SELESAI"),
      ...upcomingJobs.filter((p) => p.status !== "SELESAI"),
      ...todayJobs.filter((p) => p.status === "SELESAI"),
      ...waitingJobs.filter((p) => !todayJobs.some((t) => t.id === p.id) && !upcomingJobs.some((u) => u.id === p.id)),
      ...upcomingJobs.filter((p) => p.status === "SELESAI"),
      ...mapped.filter((p) => p.isPast && p.status !== "SELESAI").sort((a, b) => (b.itemTime || 0) - (a.itemTime || 0)),
    ];

    const seen = new Set();
    const uniqueList = prioritized.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    const activeTeams = new Set(uniqueList.map((p) => p.tim).filter(Boolean)).size;

    return {
      todayJobs,
      upcomingJobs,
      waitingJobs,
      displayList: uniqueList,
      activeTeamsCount: activeTeams,
    };
  }, [pekerjaanData, refToday]);

  const filteredScheduleList = useMemo(() => {
    if (scheduleTab === "TODAY") return scheduleData.todayJobs.slice(0, 4);
    if (scheduleTab === "UPCOMING") return scheduleData.upcomingJobs.slice(0, 4);
    if (scheduleTab === "WAITING") return scheduleData.waitingJobs.slice(0, 4);
    return scheduleData.displayList.slice(0, 4);
  }, [scheduleData, scheduleTab]);

  const filterLabel = useMemo(() => {
    switch (timeFilter) {
      case "TODAY":
        return `Hari Ini (${selectedDate})`;
      case "WEEK":
        return "7 Hari Terakhir";
      case "MONTH":
        return "Bulan Ini (September 2026)";
      case "CUSTOM":
        return `${customStartDate || "..."} s/d ${customEndDate || "..."}`;
      default:
        return "Semua Waktu";
    }
  }, [timeFilter, selectedDate, customStartDate, customEndDate]);

  const filterSummaryText = useMemo(() => {
    const totalMatching = filteredPekerjaan.length + filteredLeads.length + filteredGangguan.length;
    if (timeFilter === "ALL") {
      return `Menampilkan seluruh rekapitulasi data historis (${totalMatching} total aktivitas).`;
    }
    return `Menampilkan data tersaring: ${filteredPekerjaan.length} pekerjaan, ${filteredLeads.length} leads, ${filteredGangguan.length} gangguan.`;
  }, [timeFilter, filteredPekerjaan.length, filteredLeads.length, filteredGangguan.length]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    window.dispatchEvent(new CustomEvent("xnet_storage_update", { detail: { key: "xnet_pekerjaan", value: pekerjaanData } }));
  };

  return (
    <div className="space-y-6">
      {/* Unified Minimalist Header & Filter Bar (1 Baris) */}
      <div className="bg-white rounded-2xl px-5 py-3.5 border border-gray-100 shadow-sm transition-all duration-300">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Left: Title & Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Dashboard Operasional</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold ring-1 ring-emerald-200">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Realtime Sinkron
            </span>
            <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-gray-300" />
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-500">
              <span className="text-gray-400 font-medium">Periode:</span>
              <span className="font-bold text-[#0D1B4A] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100/80">
                {filterLabel}
              </span>
            </span>
          </div>

          {/* Right: Filter Buttons & Refresh in 1 compact row */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-50/90 p-1 rounded-xl border border-gray-200/70">
              {[
                { id: "ALL", label: "Semua", icon: Layers },
                { id: "TODAY", label: "Hari Ini", icon: Clock },
                { id: "WEEK", label: "7 Hari", icon: TrendingUp },
                { id: "MONTH", label: "Bulan Ini", icon: Calendar },
                { id: "CUSTOM", label: "Rentang", icon: Filter },
              ].map((p) => {
                const Icon = p.icon;
                const isActive = timeFilter === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setTimeFilter(p.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "bg-[#0D1B4A] text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900 hover:bg-white"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#F59E0B]" : "text-gray-400"}`} />
                    <span>{p.label}</span>
                  </button>
                );
              })}

              {timeFilter !== "ALL" && (
                <button
                  onClick={() => setTimeFilter("ALL")}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Reset Filter"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors cursor-pointer shadow-2xs"
              title="Segarkan Sinkronisasi"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
          </div>
        </div>

        {/* Expandable Custom Range Controls */}
        {timeFilter === "CUSTOM" && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 animate-fadeIn text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-gray-700">Tentukan Rentang:</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">Dari:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none text-xs font-semibold text-gray-800"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">Sampai:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none text-xs font-semibold text-gray-800"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const today = new Date().toISOString().split("T")[0];
                  setCustomStartDate(today);
                  setCustomEndDate(today);
                }}
                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
              >
                Hari Ini
              </button>
              <button
                onClick={() => {
                  setCustomStartDate("2026-09-01");
                  setCustomEndDate("2026-09-30");
                }}
                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
              >
                September 2026
              </button>
            </div>
          </div>
        )}

        {/* Expandable Single Day Control */}
        {timeFilter === "TODAY" && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 animate-fadeIn text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-700">Pilih Tanggal:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none text-xs font-semibold text-gray-800"
              />
              <button
                type="button"
                onClick={() => setSelectedDate("2026-09-24")}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                Gunakan Hari Ini (24 Sep 2026)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5 Dynamic Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Wrench}
          label="Total Pekerjaan"
          value={totalPekerjaan}
          subtext={`${selesai} selesai · ${waiting} waiting`}
          changeType="up"
          bgGradient="bg-gradient-to-br from-[#0D1B4A] to-[#1a237e]"
          href="/pekerjaan"
        />
        <StatCard
          icon={Target}
          label="Total Leads"
          value={totalLeads}
          subtext={`${leadsKonversi} konversi (${leadsConversionRate}%)`}
          changeType="up"
          bgGradient="bg-gradient-to-br from-[#F59E0B] to-[#F97316]"
          href="/leads"
        />
        <StatCard
          icon={CheckCircle}
          label="Tingkat Selesai"
          value={`${completionRate}%`}
          subtext={`${selesai} dari ${totalPekerjaan} tuntas`}
          changeType="up"
          bgGradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          href="/pekerjaan"
        />
        <StatCard
          icon={AlertTriangle}
          label="Total Gangguan"
          value={totalGangguan}
          subtext={`${gangguanBelumSelesai} belum selesai · ${gangguanAman} aman`}
          changeType={gangguanBelumSelesai > 0 ? "down" : "up"}
          bgGradient="bg-gradient-to-br from-red-500 to-rose-600"
          href="/gangguan"
        />
        <StatCard
          icon={Network}
          label="Infrastruktur ODP"
          value={`${totalOdp} ODP`}
          subtext={`${totalOdc} ODC · ${odpLinkedCount} di pekerjaan`}
          changeType="up"
          bgGradient="bg-gradient-to-br from-indigo-500 to-blue-600"
          href="/odp"
        />
      </div>

      {/* Specific Dedicated Card: Detail Pekerjaan */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
        {/* Header of Detail Pekerjaan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0D1B4A] to-blue-900 flex items-center justify-center text-white shadow-md shadow-blue-950/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
                  Detail Pekerjaan & Status Operasional
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                  {totalPekerjaan} Total Pekerjaan
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                  {filterLabel}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Rincian progres, volume, dan status per kategori layanan untuk periode terpilih
              </p>
            </div>
          </div>

          <Link
            to="/pekerjaan"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#0D1B4A] bg-blue-50 hover:bg-blue-100/80 rounded-xl border border-blue-200/60 transition-all self-start sm:self-auto group shadow-2xs"
          >
            <span>Buka Manajemen Pekerjaan</span>
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* 4 Category Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Pemasangan Baru */}
          <div className="bg-gradient-to-b from-blue-50/60 to-white rounded-2xl p-4 border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <Wifi className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                  Pemasangan
                </span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-500">Pemasangan Baru</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="text-2xl font-black text-gray-900 tracking-tight">
                    {detailPekerjaan.pemasangan.total}
                  </p>
                  <span className="text-xs text-gray-400">pekerjaan</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                  <span className="text-gray-500">Tingkat Selesai</span>
                  <span className="text-blue-700 font-bold">{detailPekerjaan.pemasangan.rate}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${detailPekerjaan.pemasangan.rate}%` }}
                  />
                </div>
              </div>

              {/* Status Pills */}
              <div className="grid grid-cols-2 gap-1.5 mt-3 pt-3 border-t border-blue-100/60 text-[11px]">
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Selesai
                  </span>
                  <span className="font-bold text-gray-800">{detailPekerjaan.pemasangan.selesai}</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Waiting
                  </span>
                  <span className="font-bold text-gray-800">{detailPekerjaan.pemasangan.waiting}</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Jadwal
                  </span>
                  <span className="font-bold text-gray-800">{detailPekerjaan.pemasangan.dijadwalkan}</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Gagal
                  </span>
                  <span className="font-bold text-gray-800">{detailPekerjaan.pemasangan.gagal}</span>
                </div>
              </div>
            </div>

            <Link
              to="/pekerjaan?search=PEMASANGAN"
              className="mt-3.5 pt-2 text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center justify-between group/link border-t border-blue-50"
            >
              <span>Filter Pemasangan</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
            </Link>
          </div>

          {/* Card 2: Perbaikan Reguler */}
          <div className="bg-gradient-to-b from-orange-50/60 to-white rounded-2xl p-4 border border-orange-100 hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <Wrench className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700">
                  Perbaikan
                </span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-500">Perbaikan Reguler</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="text-2xl font-black text-gray-900 tracking-tight">
                    {detailPekerjaan.perbaikan.total}
                  </p>
                  <span className="text-xs text-gray-400">pekerjaan</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                  <span className="text-gray-500">Tingkat Selesai</span>
                  <span className="text-orange-700 font-bold">{detailPekerjaan.perbaikan.rate}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${detailPekerjaan.perbaikan.rate}%` }}
                  />
                </div>
              </div>

              {/* Status Pills */}
              <div className="grid grid-cols-2 gap-1.5 mt-3 pt-3 border-t border-orange-100/60 text-[11px]">
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Selesai
                  </span>
                  <span className="font-bold text-gray-800">{detailPekerjaan.perbaikan.selesai}</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Waiting
                  </span>
                  <span className="font-bold text-gray-800">{detailPekerjaan.perbaikan.waiting}</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Jadwal
                  </span>
                  <span className="font-bold text-gray-800">{detailPekerjaan.perbaikan.dijadwalkan}</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Gagal
                  </span>
                  <span className="font-bold text-gray-800">{detailPekerjaan.perbaikan.gagal}</span>
                </div>
              </div>
            </div>

            <Link
              to="/pekerjaan?search=PERBAIKAN"
              className="mt-3.5 pt-2 text-[11px] font-bold text-orange-600 hover:text-orange-800 flex items-center justify-between group/link border-t border-orange-50"
            >
              <span>Filter Perbaikan</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
            </Link>
          </div>

          {/* Card 3: Perbaikan Khusus (ODP/ODC) */}
          <div className="bg-gradient-to-b from-purple-50/60 to-white rounded-2xl p-4 border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <Network className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">
                  ODP / ODC
                </span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-500">Perbaikan Khusus ODP</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="text-2xl font-black text-gray-900 tracking-tight">
                    {detailPekerjaan.perbaikanKhusus.total}
                  </p>
                  <span className="text-xs text-gray-400">pekerjaan</span>
                </div>
              </div>

              {/* Impact / User Terdampak Badge */}
              <div className="mt-2.5 flex items-center justify-between px-2.5 py-1.5 bg-purple-50/90 rounded-xl border border-purple-100/90 text-[11px]">
                <span className="text-purple-700 font-semibold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  User Terdampak
                </span>
                <span className="font-extrabold text-purple-900">
                  {detailPekerjaan.perbaikanKhusus.userTerdampak} Orang
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                  <span className="text-gray-500">Tingkat Selesai</span>
                  <span className="text-purple-700 font-bold">{detailPekerjaan.perbaikanKhusus.rate}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${detailPekerjaan.perbaikanKhusus.rate}%` }}
                  />
                </div>
              </div>

              {/* Status Pills */}
              <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-purple-100/60 text-[11px]">
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Done
                  </span>
                  <span className="font-bold text-gray-800">{detailPekerjaan.perbaikanKhusus.selesai}</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Wait
                  </span>
                  <span className="font-bold text-gray-800">{detailPekerjaan.perbaikanKhusus.waiting}</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Jdwl
                  </span>
                  <span className="font-bold text-gray-800">{detailPekerjaan.perbaikanKhusus.dijadwalkan}</span>
                </div>
              </div>
            </div>

            <Link
              to="/pekerjaan?search=ODP"
              className="mt-3.5 pt-2 text-[11px] font-bold text-purple-600 hover:text-purple-800 flex items-center justify-between group/link border-t border-purple-50"
            >
              <span>Filter Khusus ODP</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
            </Link>
          </div>

          {/* Card 4: Pemutusan Layanan */}
          <div className="bg-gradient-to-b from-rose-50/60 to-white rounded-2xl p-4 border border-rose-100 hover:border-rose-300 hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <XCircle className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700">
                  Pemutusan
                </span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-500">Pemutusan Layanan</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="text-2xl font-black text-gray-900 tracking-tight">
                    {detailPekerjaan.pemutusan.total}
                  </p>
                  <span className="text-xs text-gray-400">pekerjaan</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                  <span className="text-gray-500">Tingkat Selesai</span>
                  <span className="text-rose-700 font-bold">{detailPekerjaan.pemutusan.rate}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-rose-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${detailPekerjaan.pemutusan.rate}%` }}
                  />
                </div>
              </div>

              {/* Status Pills */}
              <div className="grid grid-cols-2 gap-1.5 mt-3 pt-3 border-t border-rose-100/60 text-[11px]">
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Selesai
                  </span>
                  <span className="font-bold text-gray-800">{detailPekerjaan.pemutusan.selesai}</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Waiting
                  </span>
                  <span className="font-bold text-gray-800">{detailPekerjaan.pemutusan.waiting}</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Jadwal
                  </span>
                  <span className="font-bold text-gray-800">{detailPekerjaan.pemutusan.dijadwalkan}</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-gray-100">
                  <span className="text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Gagal
                  </span>
                  <span className="font-bold text-gray-800">{detailPekerjaan.pemutusan.gagal}</span>
                </div>
              </div>
            </div>

            <Link
              to="/pekerjaan?search=PEMUTUSAN"
              className="mt-3.5 pt-2 text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center justify-between group/link border-t border-rose-50"
            >
              <span>Filter Pemutusan</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Global Distribution Status Progress Bar */}
        <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-2">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0D1B4A]" />
                Komposisi Status Pekerjaan
              </span>
              <span className="text-gray-500 font-semibold">
                {selesai} Selesai · {waiting} Waiting · {dijadwalkan} Dijadwalkan · {gagal} Gagal
              </span>
            </div>
            {/* Segmented bar */}
            <div className="w-full h-3 bg-gray-200/80 rounded-full overflow-hidden flex shadow-inner">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${statusSummaryPercentages.selesai}%` }}
                title={`Selesai: ${selesai} (${statusSummaryPercentages.selesai}%)`}
              />
              <div
                className="bg-amber-400 transition-all duration-500"
                style={{ width: `${statusSummaryPercentages.waiting}%` }}
                title={`Waiting List: ${waiting} (${statusSummaryPercentages.waiting}%)`}
              />
              <div
                className="bg-blue-500 transition-all duration-500"
                style={{ width: `${statusSummaryPercentages.dijadwalkan}%` }}
                title={`Dijadwalkan: ${dijadwalkan} (${statusSummaryPercentages.dijadwalkan}%)`}
              />
              <div
                className="bg-red-500 transition-all duration-500"
                style={{ width: `${statusSummaryPercentages.gagal}%` }}
                title={`Gagal: ${gagal} (${statusSummaryPercentages.gagal}%)`}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold shrink-0 flex-wrap">
            <span className="flex items-center gap-1.5 text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Selesai ({statusSummaryPercentages.selesai}%)
            </span>
            <span className="flex items-center gap-1.5 text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Waiting ({statusSummaryPercentages.waiting}%)
            </span>
            <span className="flex items-center gap-1.5 text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Jadwal ({statusSummaryPercentages.dijadwalkan}%)
            </span>
            <span className="flex items-center gap-1.5 text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              Gagal ({statusSummaryPercentages.gagal}%)
            </span>
          </div>
        </div>
      </div>

      {/* Specific Dedicated Card: Pekerjaan Hari Ini & Terdekat (Minimalist) */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
        {/* Minimalist Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0D1B4A] flex items-center justify-center text-white shadow-xs">
              <CalendarClock className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                Pekerjaan Hari Ini & Jadwal Terdekat
                {scheduleData.todayJobs.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </h2>
              <p className="text-[11px] text-gray-400">
                Antrian penugasan operasional teknisi yang siap dikerjakan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Minimalist Tab Pills */}
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200/60 text-xs font-semibold">
              {[
                { id: "ALL", label: `Semua (${scheduleData.displayList.length})` },
                { id: "TODAY", label: `Hari Ini (${scheduleData.todayJobs.length})` },
                { id: "UPCOMING", label: `Mendatang (${scheduleData.upcomingJobs.length})` },
                { id: "WAITING", label: `Waiting (${scheduleData.waitingJobs.length})` },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setScheduleTab(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    scheduleTab === t.id
                      ? "bg-[#0D1B4A] text-white shadow-2xs"
                      : "text-gray-500 hover:text-gray-900 hover:bg-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <Link
              to="/pekerjaan"
              className="text-xs font-bold text-[#0D1B4A] hover:text-blue-700 flex items-center gap-1 transition-colors px-2 py-1"
            >
              <span>Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Minimalist Compact List */}
        {filteredScheduleList.length > 0 ? (
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {filteredScheduleList.map((item) => {
              const jc =
                item.jenis === "PEMASANGAN"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : item.jenis === "PERBAIKAN"
                  ? "bg-orange-50 text-orange-700 border-orange-200"
                  : item.jenis === "PERBAIKAN KHUSUS (ODP/ODC)"
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-rose-50 text-rose-700 border-rose-200";

              const sc =
                item.status === "SELESAI"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : item.status === "DIJADWALKAN"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : item.status === "GAGAL"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-amber-50 text-amber-700 border-amber-200";

              return (
                <div
                  key={item.id}
                  className="px-4 py-3 hover:bg-blue-50/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                >
                  {/* Left: Timing badge, Name, Category */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Timing Badge */}
                    <div className="shrink-0">
                      {item.isToday ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          HARI INI
                        </span>
                      ) : item.diffDays === 1 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          BESOK
                        </span>
                      ) : item.diffDays > 1 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {item.diffDays}h lagi
                        </span>
                      ) : item.isWaiting ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Waiting
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium bg-gray-100 text-gray-600">
                          {item.tanggal}
                        </span>
                      )}
                    </div>

                    {/* Customer info & tags */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/pekerjaan?search=${encodeURIComponent(item.pelanggan)}`}
                          className="font-bold text-gray-900 text-xs hover:text-blue-600 transition-colors truncate"
                        >
                          {item.pelanggan}
                        </Link>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${jc}`}>
                          {item.jenis === "PERBAIKAN KHUSUS (ODP/ODC)" ? "ODP/ODC" : item.jenis}
                        </span>
                        {item.odp && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-100 truncate max-w-[180px]">
                            <Network className="w-3 h-3 text-blue-500 shrink-0" />
                            <span className="truncate">{item.odp}</span>
                          </span>
                        )}
                        {item.userTerdampak ? (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                            {item.userTerdampak} Terdampak
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{item.alamat || "Alamat belum diatur"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Team, Status, Action */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-auto text-xs">
                    <span className="text-[11px] text-gray-500 font-semibold flex items-center gap-1">
                      <Users className="w-3 h-3 text-gray-400" />
                      {item.tim ? item.tim.split(" - ")[0] : "Belum Ditugaskan"}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${sc}`}>
                      {item.status}
                    </span>
                    <Link
                      to={`/pekerjaan?search=${encodeURIComponent(item.pelanggan)}`}
                      className="p-1 rounded-lg text-gray-400 hover:text-[#0D1B4A] hover:bg-gray-100 transition-all"
                      title="Lihat Detail Pekerjaan"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-gray-400 text-xs">
            <p>Tidak ada antrian pekerjaan pada kategori ini.</p>
          </div>
        )}
      </div>

      {/* Row 1: Weekly Trend & Leads Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0D1B4A]" />
                {timeFilter === "WEEK"
                  ? "Tren Aktivitas 7 Hari Terakhir"
                  : timeFilter === "TODAY"
                  ? "Tren Aktivitas Hari Ini"
                  : "Tren Aktivitas Periode"}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Perbandingan volume pekerjaan vs leads pada periode terpilih</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0D1B4A]" /> Pekerjaan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Leads
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendChartData}>
              <defs>
                <linearGradient id="gradPekerjaan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0D1B4A" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#0D1B4A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="pekerjaan" stroke="#0D1B4A" strokeWidth={2.5} fill="url(#gradPekerjaan)" name="Pekerjaan" />
              <Area type="monotone" dataKey="leads" stroke="#F59E0B" strokeWidth={2.5} fill="url(#gradLeads)" name="Leads" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Leads Donut */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-gray-800">Distribusi Sumber Leads</h3>
              <Link to="/leads" className="text-xs font-semibold text-[#F59E0B] hover:underline">
                Lihat Leads →
              </Link>
            </div>
            <p className="text-xs text-gray-400 mb-2">Total {totalLeads} calon pelanggan</p>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie
                data={leadsBySumber}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
              >
                {leadsBySumber.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {leadsBySumber.map((item, i) => {
              const pct = totalLeads > 0 ? ((item.value / totalLeads) * 100).toFixed(0) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-gray-700 font-medium">{item.name}</span>
                  </span>
                  <span className="font-bold text-gray-900">
                    {item.value} <span className="text-gray-400 font-normal">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Tim BarChart & Gangguan Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pekerjaan per Tim */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-gray-800">Performa Pekerjaan per Tim</h3>
            <Link to="/tim" className="text-xs font-semibold text-[#0D1B4A] hover:underline">
              Kelola Tim →
            </Link>
          </div>
          <p className="text-xs text-gray-400 mb-3">Distribusi volume pekerjaan menurut tim lapangan</p>
          <div className="flex items-center gap-3 text-xs mb-3 flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0D1B4A]" /> Pemasangan</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Perbaikan</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" /> Perbaikan Khusus (ODP/ODC)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" /> Pemutusan</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Gagal</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={timChartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pemasangan" fill="#0D1B4A" name="Pemasangan" radius={[5, 5, 0, 0]} />
              <Bar dataKey="perbaikan" fill="#F59E0B" name="Perbaikan" radius={[5, 5, 0, 0]} />
              <Bar dataKey="perbaikanKhusus" fill="#8B5CF6" name="Perbaikan Khusus" radius={[5, 5, 0, 0]} />
              <Bar dataKey="pemutusan" fill="#F97316" name="Pemutusan" radius={[5, 5, 0, 0]} />
              <Bar dataKey="gagal" fill="#EF4444" name="Gagal" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status & Kategori Gangguan */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Status Penanganan Gangguan</h3>
                <p className="text-xs text-gray-400 mt-0.5">Ringkasan status follow-up & jenis kendala</p>
              </div>
              <Link to="/gangguan" className="text-xs font-semibold text-red-600 hover:underline">
                Daftar Gangguan →
              </Link>
            </div>

            {/* Quick FU Status Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                <span className="block text-lg font-black text-emerald-700">{gangguanAman}</span>
                <span className="text-[11px] font-semibold text-emerald-600">Aman</span>
              </div>
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-100 text-center">
                <span className="block text-lg font-black text-red-700">{gangguanBermasalah}</span>
                <span className="text-[11px] font-semibold text-red-600">Bermasalah</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-center">
                <span className="block text-lg font-black text-amber-700">{gangguanNgelag}</span>
                <span className="text-[11px] font-semibold text-amber-600">Ngelag</span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-center">
                <span className="block text-lg font-black text-blue-700">{gangguanBelumFU}</span>
                <span className="text-[11px] font-semibold text-blue-600">Belum FU</span>
              </div>
            </div>

            {/* Breakdown Gejala */}
            <div className="space-y-2.5 mt-4">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Gejala Terbanyak</p>
              {gangguanKategoriList.map(([catName, val], idx) => {
                const maxVal = Math.max(...gangguanKategoriList.map(([, v]) => v));
                const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                return (
                  <div key={catName}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600 font-medium">{catName}</span>
                      <span className="font-bold text-gray-900">{val} laporan</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Kinerja Tim Lapangan (Progress Bars) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Kinerja Pemasangan */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Kinerja Pemasangan per Tim</h3>
              <p className="text-xs text-gray-400 mt-0.5">Persentase keberhasilan pemasangan</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold ring-1 ring-emerald-200">
              Total {kinerjaPemasangan.reduce((a, b) => a + b.selesai, 0)}/{kinerjaPemasangan.reduce((a, b) => a + b.total, 0)} Selesai
            </span>
          </div>
          <div className="space-y-4">
            {kinerjaPemasangan.map((item) => (
              <div key={item.tim}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-bold text-gray-800">{item.tim}</span>
                  <div className="flex items-center gap-2">
                    {item.gagal > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-bold">
                        Gagal: {item.gagal}
                      </span>
                    )}
                    <span className="font-extrabold text-gray-900">{item.persen.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      item.persen >= 90
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                        : item.persen >= 70
                        ? "bg-gradient-to-r from-amber-500 to-amber-400"
                        : "bg-gradient-to-r from-red-500 to-red-400"
                    }`}
                    style={{ width: `${item.persen}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                  <span>{item.selesai} selesai</span>
                  <span>{item.total} total penugasan</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kinerja Pemutusan */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Kinerja Pemutusan per Tim</h3>
              <p className="text-xs text-gray-400 mt-0.5">Penanganan pengajuan pemutusan layanan</p>
            </div>
            <span className="px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold ring-1 ring-orange-200">
              Total {kinerjaPemutusan.reduce((a, b) => a + b.selesai, 0)}/{kinerjaPemutusan.reduce((a, b) => a + b.total, 0)} Selesai
            </span>
          </div>
          <div className="space-y-4">
            {kinerjaPemutusan.map((item) => (
              <div key={item.tim}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-bold text-gray-800">{item.tim}</span>
                  <div className="flex items-center gap-2">
                    {item.persen === null ? (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold">N/A</span>
                    ) : (
                      <span className="font-extrabold text-gray-900">{item.persen.toFixed(0)}%</span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  {item.persen !== null && (
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        item.persen >= 90
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                          : item.persen >= 50
                          ? "bg-gradient-to-r from-amber-500 to-amber-400"
                          : "bg-gradient-to-r from-red-500 to-red-400"
                      }`}
                      style={{ width: `${item.persen}%` }}
                    />
                  )}
                </div>
                <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                  <span>{item.selesai} selesai</span>
                  <span>{item.total} total penugasan</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Actionable Operations Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pekerjaan Memerlukan Perhatian */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Pekerjaan Menunggu Tindakan
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Daftar waiting list & dijadwalkan terkini</p>
              </div>
              <Link
                to="/pekerjaan"
                className="text-xs font-semibold text-[#0D1B4A] hover:underline flex items-center gap-1"
              >
                Lihat Semua ({waiting + dijadwalkan}) →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {pendingJobs.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <span className="font-bold text-sm text-gray-900">{item.pelanggan}</span>
                      <span className="text-xs text-gray-400 ml-2">({item.tim.split(" - ")[0]})</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        item.status === "WAITING LIST"
                          ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                          : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1 mb-2">{item.alamat}</p>
                  <div className="flex items-center justify-between text-[11px]">
                    {item.odp ? (
                      <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium border border-blue-100">
                        <Network className="w-3 h-3 text-blue-500" />
                        {item.odp}
                      </span>
                    ) : (
                      <span className="text-gray-400">ODP belum diatur</span>
                    )}
                    <span className="text-gray-400 font-medium">{item.tanggal}</span>
                  </div>
                </div>
              ))}
              {pendingJobs.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  <CheckCircle className="w-10 h-10 mx-auto text-emerald-500 opacity-30 mb-2" />
                  <p className="text-sm font-semibold text-gray-600">Semua pekerjaan telah selesai!</p>
                  <p className="text-xs text-gray-400 mt-0.5">Tidak ada antrian waiting list saat ini.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gangguan Perlu Follow-Up */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Gangguan Perlu Follow-Up
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Pelanggan bermasalah & belum selesai</p>
              </div>
              <Link
                to="/gangguan"
                className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"
              >
                Lihat Semua ({gangguanBermasalah + gangguanBelumFU}) →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {urgentGangguan.map((g) => {
                const cleanPhone = (g.kontak || "").replace(/[^0-9]/g, "");
                const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;
                return (
                  <div key={g.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <span className="font-bold text-sm text-gray-900">{g.nama}</span>
                        <span className="text-xs text-gray-400 ml-2">{g.tanggalMulai}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          (g.hasilFU || "").trim().toLowerCase() === "bermasalah"
                            ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {g.hasilFU || "Belum FU"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 font-medium line-clamp-1">
                      ⚠️ {g.keterangan || "Tidak ada keterangan kendala"}
                    </p>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400 font-medium">Follow-Up: {g.followUp || "-"}</span>
                      {waUrl ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold transition-colors border border-emerald-200"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Chat WA</span>
                        </a>
                      ) : (
                        <span className="text-gray-400">Kontak -</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {urgentGangguan.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  <CheckCircle className="w-10 h-10 mx-auto text-emerald-500 opacity-30 mb-2" />
                  <p className="text-sm font-semibold text-gray-600">Semua gangguan telah tertangani aman!</p>
                  <p className="text-xs text-gray-400 mt-0.5">Tidak ada tiket gangguan yang bermasalah.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
