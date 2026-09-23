import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Wrench,
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  XCircle,
  Network,
  Clock,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  Users,
  Layers,
  ChevronRight,
  TrendingUp,
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
} from "../data/mockData";
import { usePersistState } from "../hooks/usePersistState";

const PIE_COLORS = ["#0D1B4A", "#F59E0B", "#F97316", "#10B981", "#6366F1", "#EC4899"];

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

  const [refreshKey, setRefreshKey] = useState(0);

  // Pekerjaan Stats
  const totalPekerjaan = pekerjaanData.length;
  const selesai = useMemo(() => pekerjaanData.filter((d) => d.status === "SELESAI").length, [pekerjaanData]);
  const waiting = useMemo(() => pekerjaanData.filter((d) => d.status === "WAITING LIST").length, [pekerjaanData]);
  const dijadwalkan = useMemo(() => pekerjaanData.filter((d) => d.status === "DIJADWALKAN").length, [pekerjaanData]);
  const gagal = useMemo(() => pekerjaanData.filter((d) => d.status === "GAGAL").length, [pekerjaanData]);
  const completionRate = totalPekerjaan > 0 ? ((selesai / totalPekerjaan) * 100).toFixed(0) : "0";

  // Leads Stats
  const totalLeads = leadsData.length;
  const leadsKonversi = useMemo(() => leadsData.filter((d) => d.status === "SELESAI").length, [leadsData]);
  const leadsConversionRate = totalLeads > 0 ? ((leadsKonversi / totalLeads) * 100).toFixed(0) : "0";

  // Gangguan Stats (Synced with xnet_daftar_gangguan_v2)
  const totalGangguan = gangguanData.length;
  const gangguanAman = useMemo(
    () => gangguanData.filter((g) => (g.hasilFU || "").trim().toLowerCase() === "aman").length,
    [gangguanData]
  );
  const gangguanBermasalah = useMemo(
    () => gangguanData.filter((g) => (g.hasilFU || "").trim().toLowerCase() === "bermasalah").length,
    [gangguanData]
  );
  const gangguanNgelag = useMemo(
    () => gangguanData.filter((g) => (g.hasilFU || "").trim().toLowerCase().includes("ngelag")).length,
    [gangguanData]
  );
  const gangguanBelumFU = useMemo(
    () => gangguanData.filter((g) => !(g.hasilFU || "").trim()).length,
    [gangguanData]
  );

  // ODP / ODC Infrastructure Stats
  const totalOdp = odpData.length;
  const totalOdc = useMemo(() => new Set(odpData.map((o) => o.odc)).size, [odpData]);
  const odpLinkedCount = useMemo(() => pekerjaanData.filter((p) => !!p.odp).length, [pekerjaanData]);

  // Tim Chart Data
  const timChartData = useMemo(() => {
    return timData.map((t) => {
      const timP = pekerjaanData.filter((p) => p.tim === t.nama);
      return {
        name: t.nama.split(" - ")[0],
        pemasangan: timP.filter((p) => p.jenis === "PEMASANGAN" && p.status !== "GAGAL").length,
        perbaikan: timP.filter((p) => p.jenis === "PERBAIKAN" && p.status !== "GAGAL").length,
        perbaikanKhusus: timP.filter((p) => p.jenis === "PERBAIKAN KHUSUS (ODP/ODC)" && p.status !== "GAGAL").length,
        pemutusan: timP.filter((p) => p.jenis === "PEMUTUSAN" && p.status !== "GAGAL").length,
        gagal: timP.filter((p) => p.status === "GAGAL").length,
      };
    });
  }, [timData, pekerjaanData]);

  // Leads Sources
  const leadsBySumber = useMemo(() => {
    const counts = leadsData.reduce((acc, l) => {
      const src = l.sumber || "LAINNYA";
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {});
    const items = Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
      value,
    }));
    return items.length > 0 ? items : [{ name: "Belum Ada", value: 1 }];
  }, [leadsData]);

  // Weekly Trend
  const weeklyData = useMemo(() => {
    const parseDay = (dStr) => {
      if (!dStr) return null;
      if (dStr.includes("-")) {
        const parts = dStr.split("-");
        if (parts[0].length === 4) return parseInt(parts[2], 10);
        return parseInt(parts[0], 10);
      }
      return null;
    };

    const weeks = ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"];
    return weeks.map((name, i) => {
      const start = 1 + i * 7;
      const end = Math.min(start + 6, 31);
      const jobsCount = pekerjaanData.filter((p) => {
        const day = parseDay(p.tanggal);
        return day !== null && day >= start && day <= end;
      }).length;
      const leadsCount = leadsData.filter((l) => {
        const day = parseDay(l.tanggal);
        return day !== null && day >= start && day <= end;
      }).length;
      return { name, pekerjaan: jobsCount, leads: leadsCount };
    });
  }, [pekerjaanData, leadsData]);

  // Gangguan Categories
  const gangguanKategoriList = useMemo(() => {
    const cats = {
      "LOS / Sinyal Hilang": 0,
      "Modem / Restart": 0,
      "Lelet / Ngelag": 0,
      "Putus / Tanpa Koneksi": 0,
      "Lainnya": 0,
    };
    gangguanData.forEach((g) => {
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
  }, [gangguanData]);

  // Kinerja per Tim
  const kinerjaPemasangan = useMemo(() => {
    return timData.map((t) => {
      const timP = pekerjaanData.filter((p) => p.tim === t.nama && p.jenis === "PEMASANGAN");
      const done = timP.filter((p) => p.status === "SELESAI").length;
      const total = timP.length;
      const fail = timP.filter((p) => p.status === "GAGAL").length;
      return { tim: t.nama, selesai: done, total, persen: total > 0 ? (done / total) * 100 : 0, gagal: fail };
    });
  }, [timData, pekerjaanData]);

  const kinerjaPemutusan = useMemo(() => {
    return timData.map((t) => {
      const timP = pekerjaanData.filter((p) => p.tim === t.nama && p.jenis === "PEMUTUSAN");
      const done = timP.filter((p) => p.status === "SELESAI").length;
      const total = timP.length;
      return { tim: t.nama, selesai: done, total, persen: total > 0 ? (done / total) * 100 : null };
    });
  }, [timData, pekerjaanData]);

  // Urgent pending jobs (Waiting list / Dijadwalkan)
  const pendingJobs = useMemo(() => {
    return pekerjaanData
      .filter((p) => p.status === "WAITING LIST" || p.status === "DIJADWALKAN")
      .slice(0, 5);
  }, [pekerjaanData]);

  // Complaints needing attention
  const urgentGangguan = useMemo(() => {
    return gangguanData
      .filter((g) => (g.hasilFU || "").trim().toLowerCase() === "bermasalah" || !(g.hasilFU || "").trim())
      .slice(0, 5);
  }, [gangguanData]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    window.dispatchEvent(new CustomEvent("xnet_storage_update", { detail: { key: "xnet_pekerjaan", value: pekerjaanData } }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard Operasional</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold ring-1 ring-emerald-200">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Realtime Sinkron
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Pantauan sinkron realtime seluruh fungsi: Pekerjaan, Tim, Leads, Gangguan, dan ODP/ODC.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
            title="Segarkan Sinkronisasi"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            <span>Segarkan</span>
          </button>
          <Link
            to="/pekerjaan"
            className="flex items-center gap-1 px-3.5 py-2 text-xs font-semibold bg-[#0D1B4A] text-white rounded-xl hover:bg-[#1a237e] transition-colors shadow-sm"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>+ Pekerjaan</span>
          </Link>
          <Link
            to="/gangguan"
            className="flex items-center gap-1 px-3.5 py-2 text-xs font-semibold bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:shadow-md transition-all shadow-sm"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>+ Gangguan</span>
          </Link>
        </div>
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
          label="Gangguan Aktif"
          value={totalGangguan}
          subtext={`${gangguanBermasalah} bermasalah · ${gangguanBelumFU} belum FU`}
          changeType={gangguanBermasalah > 0 ? "down" : "neutral"}
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

      {/* Row 1: Weekly Trend & Leads Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0D1B4A]" />
                Tren Aktivitas Mingguan
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Perbandingan volume pekerjaan vs leads per minggu</p>
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
            <AreaChart data={weeklyData}>
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
