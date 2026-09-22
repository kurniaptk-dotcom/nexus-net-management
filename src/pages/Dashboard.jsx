import {
  LayoutDashboard,
  Wrench,
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  XCircle,
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
  gangguanList,
  pekerjaanList,
  leadsList,
} from "../data/mockData";
import { usePersistState } from "../hooks/usePersistState";

const COLORS = ["#0D1B4A", "#F59E0B", "#F97316", "#10B981", "#6366F1", "#EC4899"];

function StatCard({ icon: Icon, label, value, change, changeType, bgGradient }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-1 tracking-tight">{value}</p>
          {change && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${changeType === "up" ? "text-emerald-600" : "text-red-500"}`}>
              {changeType === "up" ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {change}
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bgGradient} group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0D1B4A] text-white px-4 py-3 rounded-xl shadow-xl text-sm">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((item, i) => (
          <p key={i} className="text-white/80">
            {item.name}: <span className="font-bold text-white">{item.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [pekerjaanData] = usePersistState("xnet_pekerjaan", pekerjaanList);
  const [leadsData] = usePersistState("xnet_leads", leadsList);
  const [gangguanDataState] = usePersistState("xnet_gangguan", gangguanList);

  // Hitung stats dari localStorage (real-time)
  const totalPekerjaan = pekerjaanData.length;
  const totalSelesai = pekerjaanData.filter((d) => d.status === "SELESAI").length;
  const totalGagal = pekerjaanData.filter((d) => d.status === "GAGAL").length;
  const totalLeads = leadsData.length;
  const totalGangguan = gangguanDataState.length;

  const timChartData = initialTimData.map((t) => {
    const timPekerjaan = pekerjaanData.filter((p) => p.tim === t.nama);
    return {
      name: t.nama.split(" - ")[0],
      pemasangan: timPekerjaan.filter((p) => p.jenis === "PEMASANGAN" && p.status !== "GAGAL").length,
      perbaikan: timPekerjaan.filter((p) => p.jenis === "PERBAIKAN" && p.status !== "GAGAL").length,
      pemutusan: timPekerjaan.filter((p) => p.jenis === "PEMUTUSAN" && p.status !== "GAGAL").length,
      gagal: timPekerjaan.filter((p) => p.status === "GAGAL").length,
    };
  });

  const gangguanByKategori = gangguanDataState.reduce((acc, g) => {
    acc[g.kategori] = (acc[g.kategori] || 0) + 1;
    return acc;
  }, {});
  const gangguanChartData = Object.entries(gangguanByKategori)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => ({ name: k, value: v }));

  const leadsBySumberMap = leadsData.reduce((acc, l) => {
    acc[l.sumber] = (acc[l.sumber] || 0) + 1;
    return acc;
  }, {});
  const leadsBySumber = [
    { name: "Iklan", value: leadsBySumberMap["IKLAN"] || 0 },
    { name: "Affiliate", value: leadsBySumberMap["AFFILIATE"] || 0 },
    { name: "Marketing", value: leadsBySumberMap["MARKETING"] || 0 },
  ];

  const weeklyData = (() => {
    const weeks = ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"];
    const getDateRange = (weekIdx) => {
      const start = 1 + weekIdx * 7;
      const end = Math.min(start + 6, 30);
      return { start, end };
    };
    return weeks.map((name, i) => {
      const { start, end } = getDateRange(i);
      const pekerjaan = pekerjaanData.filter((p) => {
        const day = parseInt(p.tanggal?.split("-")[2], 10);
        return day >= start && day <= end;
      }).length;
      const leads = leadsData.filter((l) => {
        const day = parseInt(l.tanggal?.split("-")[2], 10);
        return day >= start && day <= end;
      }).length;
      return { name, pekerjaan, leads };
    });
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Monitor performa semua tim dan pekerjaan</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold ring-1 ring-emerald-200">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Live
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Wrench}
          label="Total Pekerjaan"
          value={totalPekerjaan}
          change={`${totalSelesai} selesai`}
          changeType="up"
          bgGradient="bg-gradient-to-br from-[#0D1B4A] to-[#1a237e]"
        />
        <StatCard
          icon={Target}
          label="Total Leads"
          value={totalLeads}
          change={`${leadsData.filter((d) => d.status === "SELESAI").length} konversi`}
          changeType="up"
          bgGradient="bg-gradient-to-br from-[#F59E0B] to-[#F97316]"
        />
        <StatCard
          icon={CheckCircle}
          label="Selesai"
          value={totalSelesai}
          change={totalPekerjaan > 0 ? `${((totalSelesai / totalPekerjaan) * 100).toFixed(0)}% completion` : "0%"}
          changeType="up"
          bgGradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Gangguan"
          value={totalGangguan}
          change={`${gangguanDataState.reduce((a, b) => a + (b.userTerdampak || 0), 0)} user terdampak`}
          changeType="down"
          bgGradient="bg-gradient-to-br from-red-500 to-red-600"
        />
        <StatCard
          icon={XCircle}
          label="Gagal"
          value={totalGagal}
          change="Perlu review"
          changeType="down"
          bgGradient="bg-gradient-to-br from-gray-500 to-gray-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Tren Mingguan</h3>
              <p className="text-xs text-gray-400 mt-0.5">Pekerjaan & leads per minggu</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0D1B4A]" /> Pekerjaan</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Leads</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="gradPekerjaan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0D1B4A" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#0D1B4A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.15} />
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

        {/* Leads Pie */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-1">Sumber Leads</h3>
          <p className="text-xs text-gray-400 mb-4">Distribusi per sumber</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={leadsBySumber}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {leadsBySumber.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {leadsBySumber.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-gray-600">{item.name}</span>
                </span>
                <span className="font-bold text-gray-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pekerjaan per Tim + Gangguan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pekerjaan per Tim */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-1">Pekerjaan per Tim</h3>
          <p className="text-xs text-gray-400 mb-4">Komparasi performa tim</p>
          <div className="flex items-center gap-4 text-xs mb-3">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0D1B4A]" /> Pemasangan</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Perbaikan</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" /> Pemutusan</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Gagal</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={timChartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pemasangan" fill="#0D1B4A" name="Pemasangan" radius={[6, 6, 0, 0]} />
              <Bar dataKey="perbaikan" fill="#F59E0B" name="Perbaikan" radius={[6, 6, 0, 0]} />
              <Bar dataKey="pemutusan" fill="#F97316" name="Pemutusan" radius={[6, 6, 0, 0]} />
              <Bar dataKey="gagal" fill="#EF4444" name="Gagal" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gangguan */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Gangguan Eksternal</h3>
              <p className="text-xs text-gray-400 mt-0.5">Distribusi gangguan bulan ini</p>
            </div>
            <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-semibold ring-1 ring-red-200">
              {gangguanDataState.length} total
            </span>
          </div>
          <div className="space-y-3">
            {gangguanChartData
              .map((item, i) => {
                const maxVal = Math.max(...gangguanChartData.map((d) => d.value));
                const pct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 font-medium">{item.name}</span>
                      <span className="font-bold text-gray-800">{item.value}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Kinerja Progress */}
      {(() => {
        // Hitung kinerja dari localStorage (real-time)
        const kinerjaPemasangan = initialTimData.map((t) => {
          const timPekerjaan = pekerjaanData.filter((p) => p.tim === t.nama && p.jenis === "PEMASANGAN");
          const selesai = timPekerjaan.filter((p) => p.status === "SELESAI").length;
          const total = timPekerjaan.length;
          const gagal = timPekerjaan.filter((p) => p.status === "GAGAL").length;
          return { tim: t.nama, selesai, total, persen: total > 0 ? (selesai / total) * 100 : 0, gagal };
        });
        const kinerjaPemutusan = initialTimData.map((t) => {
          const timPekerjaan = pekerjaanData.filter((p) => p.tim === t.nama && p.jenis === "PEMUTUSAN");
          const selesai = timPekerjaan.filter((p) => p.status === "SELESAI").length;
          const total = timPekerjaan.length;
          return { tim: t.nama, selesai, total, persen: total > 0 ? (selesai / total) * 100 : null };
        });

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Kinerja Pemasangan */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Kinerja Pemasangan</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Progress pemasangan per tim</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold ring-1 ring-emerald-200">
                  Total {kinerjaPemasangan.reduce((a, b) => a + b.selesai, 0)}/{kinerjaPemasangan.reduce((a, b) => a + b.total, 0)}
                </span>
              </div>
              <div className="space-y-4">
                {kinerjaPemasangan.map((item) => (
                  <div key={item.tim}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-semibold text-gray-700">{item.tim}</span>
                      <div className="flex items-center gap-2">
                        {item.gagal > 0 && (
                          <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-bold">Gagal {item.gagal}</span>
                        )}
                        <span className="font-bold text-gray-900">{item.persen.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          item.persen >= 90 ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                            : item.persen >= 70 ? "bg-gradient-to-r from-amber-500 to-amber-400"
                            : "bg-gradient-to-r from-red-500 to-red-400"
                        }`}
                        style={{ width: `${item.persen}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>{item.selesai} selesai</span>
                      <span>{item.total} total</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kinerja Pemutusan */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Kinerja Pemutusan</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Progress pemutusan per tim</p>
                </div>
                <span className="px-2.5 py-1 bg-orange-50 text-orange-600 rounded-lg text-xs font-semibold ring-1 ring-orange-200">
                  Total {kinerjaPemutusan.reduce((a, b) => a + b.selesai, 0)}/{kinerjaPemutusan.reduce((a, b) => a + b.total, 0)}
                </span>
              </div>
              <div className="space-y-4">
                {kinerjaPemutusan.map((item) => (
                  <div key={item.tim}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-semibold text-gray-700">{item.tim}</span>
                      <div className="flex items-center gap-2">
                        {item.persen === null ? (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold">N/A</span>
                        ) : (
                          <span className="font-bold text-gray-900">{item.persen.toFixed(0)}%</span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      {item.persen !== null && (
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            item.persen >= 90 ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                              : item.persen >= 50 ? "bg-gradient-to-r from-amber-500 to-amber-400"
                              : "bg-gradient-to-r from-red-500 to-red-400"
                          }`}
                          style={{ width: `${item.persen}%` }}
                        />
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>{item.selesai} selesai</span>
                      <span>{item.total} total</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Gangguan Terbaru */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Gangguan Terbaru</h3>
            <p className="text-xs text-gray-400 mt-0.5">Daftar gangguan yang perlu ditangani</p>
          </div>
          <button className="text-xs font-semibold text-[#F59E0B] hover:text-[#D97706] transition-colors">
            Lihat Semua →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Tanggal</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Kategori</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Pelanggan</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">User Terdampak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {gangguanDataState.slice(-5).reverse().map((g) => (
                <tr key={g.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-gray-500 font-medium">{g.tanggal}</td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-semibold ring-1 ring-red-200">
                      {g.kategori}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-gray-800">{g.pelanggan}</td>
                  <td className="px-5 py-3"><StatusBadge status={g.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-red-600 font-bold">
                      <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-[10px]">
                        {g.userTerdampak}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
