import { useState, useMemo } from "react";
import { Download, BarChart3, Users, Wrench, AlertTriangle, Target, FileSpreadsheet, Coins, Calendar, Loader2, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  initialTimData, fuPelangganList, redamanTinggiList, pengajuanPemutusanList,
  daftarGangguanList, odpOdcList,
} from "../data/mockData";
import { usePersistState } from "../hooks/usePersistState";
import { pekerjaanList } from "../data/mockData";
import { leadsList } from "../data/mockData";
import { gangguanList } from "../data/mockData";
import { calculateTaskIncentive, formatRupiah, MASTER_KOMISI_ITEMS } from "../lib/incentives";
import Toast from "../components/Toast";

const COLORS = ["#0D1B4A", "#F59E0B", "#F97316", "#10B981", "#6366F1"];

const MONTH_OPTIONS = [
  { value: 0, label: "Januari" },
  { value: 1, label: "Februari" },
  { value: 2, label: "Maret" },
  { value: 3, label: "April" },
  { value: 4, label: "Mei" },
  { value: 5, label: "Juni" },
  { value: 6, label: "Juli" },
  { value: 7, label: "Agustus" },
  { value: 8, label: "September" },
  { value: 9, label: "Oktober" },
  { value: 10, label: "November" },
  { value: 11, label: "Desember" },
];

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

function escapeCSV(val) {
  const str = String(val ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportToCSV(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map((row) => Object.values(row).map(escapeCSV).join(","));
  const csv = [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportToExcel(pekerjaanData, leadsData, gangguanDataState, timData, odpData, masterKomisi, filename, periodLabel) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const totalSelesai = pekerjaanData.filter((d) => d.status === "SELESAI").length;
  const totalGagal = pekerjaanData.filter((d) => d.status === "GAGAL").length;
  const pemasanganSelesai = pekerjaanData.filter((d) => d.jenis === "PEMASANGAN" && d.status === "SELESAI").length;
  const perbaikanSelesai = pekerjaanData.filter((d) => d.jenis === "PERBAIKAN" && d.status === "SELESAI").length;
  const perbaikanKhususSelesai = pekerjaanData.filter((d) => d.jenis === "PERBAIKAN KHUSUS (ODP/ODC)" && d.status === "SELESAI").length;
  const pemutusanSelesai = pekerjaanData.filter((d) => d.jenis === "PEMUTUSAN" && d.status === "SELESAI").length;

  const totalBebanKomisi = pekerjaanData
    .filter((d) => d.status === "SELESAI")
    .reduce((sum, p) => sum + (p.komisi_total !== undefined ? Number(p.komisi_total) : calculateTaskIncentive(p, undefined, masterKomisi).total), 0);

  const summaryRows = [
    ["RINGKASAN PERIODE", periodLabel || new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })],
    ["Waktu Ekspor", new Date().toLocaleString("id-ID")],
    [""],
    ["Total Pekerjaan", pekerjaanData.length],
    ["Total Leads", leadsData.length],
    ["Pemasangan Selesai", pemasanganSelesai],
    ["Perbaikan Selesai", perbaikanSelesai],
    ["Perbaikan Khusus (ODP/ODC) Selesai", perbaikanKhususSelesai],
    ["Pemutusan Selesai", pemutusanSelesai],
    ["Selesai Total", totalSelesai],
    ["Gagal Total", totalGagal],
    ["Total Beban Komisi Teknisi (Rp)", totalBebanKomisi],
    ["Total Beban Komisi Teknisi (Format)", formatRupiah(totalBebanKomisi)],
    ["Gangguan Total", gangguanDataState.length],
    ["User Terdampak", gangguanDataState.reduce((sum, d) => sum + (d.userTerdampak || 0), 0)],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  const timRows = timData.map((t) => {
    const timP = pekerjaanData.filter((p) => p.tim === t.nama);
    const timSelesai = timP.filter((p) => p.status === "SELESAI");
    const komisiTim = timSelesai.reduce(
      (sum, p) => sum + (p.komisi_total !== undefined ? Number(p.komisi_total) : calculateTaskIncentive(p, undefined, masterKomisi).total),
      0
    );
    return {
      Tim: t.nama,
      "Pemasangan Selesai": timP.filter((p) => p.jenis === "PEMASANGAN" && p.status === "SELESAI").length,
      "Perbaikan Selesai": timP.filter((p) => p.jenis === "PERBAIKAN" && p.status === "SELESAI").length,
      "Perbaikan Khusus Selesai": timP.filter((p) => p.jenis === "PERBAIKAN KHUSUS (ODP/ODC)" && p.status === "SELESAI").length,
      "Pemutusan Selesai": timP.filter((p) => p.jenis === "PEMUTUSAN" && p.status === "SELESAI").length,
      "Total Selesai": timSelesai.length,
      "Total Komisi (Rp)": komisiTim,
    };
  });
  const wsTim = XLSX.utils.json_to_sheet(timRows);
  XLSX.utils.book_append_sheet(wb, wsTim, "Data Tim");

  // Sheet Komisi & Insentif Detail per Pekerjaan Selesai
  const komisiDetailRows = pekerjaanData
    .filter((p) => p.status === "SELESAI")
    .map((p, idx) => {
      const inc = calculateTaskIncentive(p, undefined, masterKomisi);
      const itemsStr = Array.isArray(p.komisi_items) && p.komisi_items.length > 0
        ? p.komisi_items.map((i) => `${i.nama} (${i.qty} ${i.satuan || "x"})`).join("; ")
        : (p.keterangan || "-");
      return {
        No: idx + 1,
        "ID Tugas": p.id,
        Tanggal: p.tanggal || "-",
        Tim: p.tim || "-",
        "Jenis Tugas": p.jenis,
        Pelanggan: p.pelanggan || "-",
        Alamat: p.alamat || "-",
        "ODP / Jalur": p.odp || "-",
        "Item Dikerjakan": itemsStr,
        "Redaman (dBm)": p.redaman || "-",
        "Total Komisi (Rp)": p.komisi_total !== undefined ? Number(p.komisi_total) : inc.total,
      };
    });
  const wsKomisi = XLSX.utils.json_to_sheet(komisiDetailRows);
  XLSX.utils.book_append_sheet(wb, wsKomisi, "Komisi & Insentif");

  const kinerjaPemasangan = timData.map((t) => {
    const timP = pekerjaanData.filter((p) => p.tim === t.nama && p.jenis === "PEMASANGAN");
    const selesai = timP.filter((p) => p.status === "SELESAI").length;
    const total = timP.length;
    const gagal = timP.filter((p) => p.status === "GAGAL").length;
    return { Tim: t.nama, Selesai: selesai, Total: total, Persentase: total > 0 ? `${((selesai / total) * 100).toFixed(2)}%` : "N/A", Gagal: gagal };
  });
  const wsKinerja = XLSX.utils.json_to_sheet(kinerjaPemasangan);
  XLSX.utils.book_append_sheet(wb, wsKinerja, "Kinerja Pemasangan");

  const kinerjaPemutusan = timData.map((t) => {
    const timP = pekerjaanData.filter((p) => p.tim === t.nama && p.jenis === "PEMUTUSAN");
    const selesai = timP.filter((p) => p.status === "SELESAI").length;
    const total = timP.length;
    return { Tim: t.nama, Selesai: selesai, Total: total, Persentase: total > 0 ? `${((selesai / total) * 100).toFixed(0)}%` : "N/A" };
  });
  const wsPemutusan = XLSX.utils.json_to_sheet(kinerjaPemutusan);
  XLSX.utils.book_append_sheet(wb, wsPemutusan, "Kinerja Pemutusan");

  const gangguanByKat = (gangguanDataState || []).reduce((acc, g) => {
    const kat = g.kategori || g.keterangan || "Lainnya";
    acc[kat] = (acc[kat] || 0) + 1;
    return acc;
  }, {});
  const gangguanRows = Object.entries(gangguanByKat).map(([kategori, jumlah]) => ({ Kategori: kategori, Jumlah: jumlah }));
  const wsGangguan = XLSX.utils.json_to_sheet(gangguanRows);
  XLSX.utils.book_append_sheet(wb, wsGangguan, "Gangguan");

  const leadsBySumber = leadsData.reduce((acc, l) => {
    acc[l.sumber] = (acc[l.sumber] || 0) + 1;
    return acc;
  }, {});
  const leadsRows = [
    { Sumber: "IKLAN", Jumlah: leadsBySumber["IKLAN"] || 0 },
    { Sumber: "AFFILIATE", Jumlah: leadsBySumber["AFFILIATE"] || 0 },
    { Sumber: "MARKETING", Jumlah: leadsBySumber["MARKETING"] || 0 },
  ];
  const wsLeads = XLSX.utils.json_to_sheet(leadsRows);
  XLSX.utils.book_append_sheet(wb, wsLeads, "Leads");

  const wsFU = XLSX.utils.json_to_sheet(fuPelangganList.map((f) => ({
    ID: f.id, Pelanggan: f.pelanggan, Tanggal: f.tanggal, Status: f.status,
    Keterangan: f.keterangan, Prioritas: f.prioritas,
  })));
  XLSX.utils.book_append_sheet(wb, wsFU, "FU Pelanggan");

  const wsRedaman = XLSX.utils.json_to_sheet(redamanTinggiList.map((r) => ({
    ID: r.id, Lokasi: r.lokasi, "Nilai Redaman": r.nilaiRedaman, Status: r.status, Teknisi: r.teknisi,
  })));
  XLSX.utils.book_append_sheet(wb, wsRedaman, "Redaman Tinggi");

  const wsPengajuan = XLSX.utils.json_to_sheet(pengajuanPemutusanList.map((p) => ({
    ID: p.id, Nama: p.nama, Kontak: p.kontak, Alasan: p.alasan, Tanggal: p.tanggal,
  })));
  XLSX.utils.book_append_sheet(wb, wsPengajuan, "Pengajuan Pemutusan");

  const wsDaftarGangguan = XLSX.utils.json_to_sheet((gangguanDataState || []).map((g) => ({
    ID: g.id, Nama: g.nama, Keterangan: g.keterangan, Kontak: g.kontak,
    "Tanggal Mulai": g.tanggalMulai, "Follow Up": g.followUp, "Hasil FU": g.hasilFU,
  })));
  XLSX.utils.book_append_sheet(wb, wsDaftarGangguan, "Daftar Gangguan");

  const wsOdp = XLSX.utils.json_to_sheet(odpData.map((o) => ({
    ID: o.id, ODC: o.odc, "Nama ODP": o.nama, Keterangan: o.keterangan || "-", Status: o.status || "Belum Dicek",
  })));
  XLSX.utils.book_append_sheet(wb, wsOdp, "ODP ODC");

  XLSX.writeFile(wb, filename);
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

export default function Laporan() {
  const [pekerjaanData] = usePersistState("xnet_pekerjaan", pekerjaanList);
  const [leadsData] = usePersistState("xnet_leads", leadsList);
  const [gangguanDataState] = usePersistState("xnet_daftar_gangguan_v2", daftarGangguanList);
  const [timData] = usePersistState("xnet_tim", initialTimData);
  const [odpData] = usePersistState("xnet_odpodc", odpOdcList);
  const [masterKomisi] = usePersistState("xnet_master_komisi", MASTER_KOMISI_ITEMS);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState(null);

  // Filter Data berdasarkan Bulan & Tahun Terpilih
  const filteredPekerjaan = useMemo(() => {
    if (selectedMonth === -1) return pekerjaanData;
    return pekerjaanData.filter((p) => {
      const d = parseRecordDate(p.tanggal);
      if (!d) return true;
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [pekerjaanData, selectedMonth, selectedYear]);

  const filteredLeads = useMemo(() => {
    if (selectedMonth === -1) return leadsData;
    return leadsData.filter((l) => {
      const d = parseRecordDate(l.tanggal);
      if (!d) return true;
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [leadsData, selectedMonth, selectedYear]);

  const filteredGangguan = useMemo(() => {
    if (selectedMonth === -1) return gangguanDataState;
    return gangguanDataState.filter((g) => {
      const d = parseRecordDate(g.tanggalMulai);
      if (!d) return true;
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [gangguanDataState, selectedMonth, selectedYear]);

  const periodLabel = selectedMonth === -1
    ? `Semua Periode (${selectedYear})`
    : `${MONTH_OPTIONS[selectedMonth]?.label || "Bulan"} ${selectedYear}`;
  const periodSlug = selectedMonth === -1
    ? `semua-periode-${selectedYear}`
    : `${(MONTH_OPTIONS[selectedMonth]?.label || "bulan").toLowerCase()}-${selectedYear}`;

  const totalSelesai = filteredPekerjaan.filter((d) => d.status === "SELESAI").length;
  const totalGagal = filteredPekerjaan.filter((d) => d.status === "GAGAL").length;

  const totalBebanKomisi = filteredPekerjaan
    .filter((d) => d.status === "SELESAI")
    .reduce((sum, p) => sum + (p.komisi_total !== undefined ? Number(p.komisi_total) : calculateTaskIncentive(p, undefined, masterKomisi).total), 0);

  const getTeamKomisi = (teamName) => {
    return filteredPekerjaan
      .filter((p) => p.tim === teamName && p.status === "SELESAI")
      .reduce((sum, p) => sum + (p.komisi_total !== undefined ? Number(p.komisi_total) : calculateTaskIncentive(p, undefined, masterKomisi).total), 0);
  };

  const timChartData = timData.map((t) => {
    const timP = filteredPekerjaan.filter((p) => p.tim === t.nama);
    return {
      name: t.nama.split(" - ")[0],
      pemasangan: timP.filter((p) => p.jenis === "PEMASANGAN" && p.status === "SELESAI").length,
      perbaikan: timP.filter((p) => p.jenis === "PERBAIKAN" && p.status === "SELESAI").length,
      perbaikanKhusus: timP.filter((p) => p.jenis === "PERBAIKAN KHUSUS (ODP/ODC)" && p.status === "SELESAI").length,
      pemutusan: timP.filter((p) => p.jenis === "PEMUTUSAN" && p.status === "SELESAI").length,
    };
  });

  const leadsBySumberMap = filteredLeads.reduce((acc, l) => {
    acc[l.sumber] = (acc[l.sumber] || 0) + 1;
    return acc;
  }, {});
  const leadsBySumber = [
    { name: "Iklan", value: leadsBySumberMap["IKLAN"] || 0 },
    { name: "Affiliate", value: leadsBySumberMap["AFFILIATE"] || 0 },
    { name: "Marketing", value: leadsBySumberMap["MARKETING"] || 0 },
  ];

  const gangguanByKat = (filteredGangguan || []).reduce((acc, g) => {
    const kat = g.kategori || g.keterangan || "Lainnya";
    acc[kat] = (acc[kat] || 0) + 1;
    return acc;
  }, {});
  const gangguanChartData = Object.entries(gangguanByKat)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => ({ name: k, value: v }));

  const summaryExport = [
    { Metrik: "Periode", Nilai: periodLabel },
    { Metrik: "Total Pekerjaan", Nilai: filteredPekerjaan.length },
    { Metrik: "Total Leads", Nilai: filteredLeads.length },
    { Metrik: "Selesai", Nilai: totalSelesai },
    { Metrik: "Gagal", Nilai: totalGagal },
    { Metrik: "Beban Komisi Teknisi (Rp)", Nilai: totalBebanKomisi },
    { Metrik: "Gangguan Total", Nilai: filteredGangguan.length },
    { Metrik: "User Terdampak", Nilai: filteredGangguan.reduce((a, b) => a + (b.userTerdampak || 0), 0) },
  ];

  const timExport = timData.map((t) => {
    const timP = filteredPekerjaan.filter((p) => p.tim === t.nama);
    const timSelesai = timP.filter((p) => p.status === "SELESAI");
    return {
      Tim: t.nama,
      "Pemasangan Selesai": timP.filter((p) => p.jenis === "PEMASANGAN" && p.status === "SELESAI").length,
      "Perbaikan Selesai": timP.filter((p) => p.jenis === "PERBAIKAN" && p.status === "SELESAI").length,
      "Perbaikan Khusus Selesai": timP.filter((p) => p.jenis === "PERBAIKAN KHUSUS (ODP/ODC)" && p.status === "SELESAI").length,
      "Pemutusan Selesai": timP.filter((p) => p.jenis === "PEMUTUSAN" && p.status === "SELESAI").length,
      "Total Selesai": timSelesai.length,
      "Total Komisi (Rp)": getTeamKomisi(t.nama),
    };
  });

  const gangguanExport = Object.entries(gangguanByKat).map(([kategori, jumlah]) => ({ Kategori: kategori, Jumlah: jumlah }));

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await exportToExcel(
        filteredPekerjaan,
        filteredLeads,
        filteredGangguan,
        timData,
        odpData,
        masterKomisi,
        `laporan-${periodSlug}.xlsx`,
        periodLabel
      );
      setToast({ type: "success", message: `Laporan Excel ${periodLabel} berhasil diekspor!` });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: `Gagal mengekspor Excel: ${err.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsvSummary = () => {
    exportToCSV(summaryExport, `summary-${periodSlug}.csv`);
    setToast({ type: "success", message: `Summary CSV ${periodLabel} berhasil diunduh.` });
  };

  const handleExportCsvTim = () => {
    exportToCSV(timExport, `tim-komisi-${periodSlug}.csv`);
    setToast({ type: "success", message: `Data Tim CSV ${periodLabel} berhasil diunduh.` });
  };

  const handleExportJson = () => {
    exportToJSON({ periode: periodLabel, summary: summaryExport, tim: timExport, gangguan: gangguanExport }, `laporan-${periodSlug}.json`);
    setToast({ type: "success", message: `Berkas JSON ${periodLabel} berhasil diunduh.` });
  };

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header & Filter Periode */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Laporan & Ekspor</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            Periode aktif: <span className="font-bold text-[#0D1B4A]">{periodLabel}</span>
          </p>
        </div>

        {/* Filter Bulan & Tahun */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-amber-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs sm:text-sm font-semibold text-gray-800 outline-none cursor-pointer"
            >
              <option value={-1}>Semua Bulan</option>
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-800 outline-none cursor-pointer"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>

          <button
            type="button"
            onClick={() => {
              const d = new Date();
              setSelectedMonth(d.getMonth());
              setSelectedYear(d.getFullYear());
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Reset ke Bulan Ini"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Bulan Ini</span>
          </button>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-sm font-bold text-gray-800">Export Data ({periodLabel})</h3>
          <span className="text-[11px] text-gray-400 font-medium">Format: .xlsx / .csv / .json</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 sm:gap-3">
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-[#0D1B4A] hover:bg-[#1a237e] disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold hover:shadow-md transition-all cursor-pointer active:scale-95"
          >
            {isExporting ? <Loader2 className="w-4 h-4 shrink-0 animate-spin text-amber-400" /> : <FileSpreadsheet className="w-4 h-4 shrink-0 text-amber-400" />}
            <span>{isExporting ? "Menyiapkan Excel..." : "Export Excel (Termasuk Sheet Komisi)"}</span>
          </button>
          <button
            onClick={handleExportCsvSummary}
            className="flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold hover:shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Summary CSV</span>
          </button>
          <button
            onClick={handleExportCsvTim}
            className="flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Data Tim & Komisi CSV</span>
          </button>
          <button
            onClick={handleExportJson}
            className="flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-semibold hover:shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Full JSON</span>
          </button>
        </div>
      </div>

      {/* Summary 6 Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
        {[
          { label: "Pekerjaan", value: filteredPekerjaan.length, icon: Wrench, bg: "bg-white", highlight: false },
          { label: "Leads", value: filteredLeads.length, icon: Target, bg: "bg-amber-50", highlight: false },
          { label: "Selesai", value: totalSelesai, icon: BarChart3, bg: "bg-emerald-50", highlight: false },
          { label: "Beban Komisi", value: formatRupiah(totalBebanKomisi), icon: Coins, bg: "bg-amber-50/70 border-amber-200", highlight: true },
          { label: "Gangguan", value: filteredGangguan.length, icon: AlertTriangle, bg: "bg-red-50", highlight: false },
          { label: "Tim", value: timData.length, icon: Users, bg: "bg-blue-50", highlight: false },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-3.5 sm:p-4 border ${s.highlight ? "border-amber-300 ring-2 ring-amber-100" : "border-gray-100"} transition-all`}>
            <s.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${s.highlight ? "text-amber-600" : "text-gray-400"} mb-1.5 sm:mb-2`} />
            <p className={`text-base sm:text-xl font-black ${s.highlight ? "text-amber-700 font-mono tracking-tight" : "text-gray-900"} truncate`}>
              {s.value}
            </p>
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mt-0.5 truncate">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Pekerjaan per Tim</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={timChartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pemasangan" fill="#0D1B4A" name="Pemasangan" radius={[6, 6, 0, 0]} />
              <Bar dataKey="perbaikan" fill="#F59E0B" name="Perbaikan" radius={[6, 6, 0, 0]} />
              <Bar dataKey="perbaikanKhusus" fill="#8B5CF6" name="Perbaikan Khusus" radius={[6, 6, 0, 0]} />
              <Bar dataKey="pemutusan" fill="#F97316" name="Pemutusan" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Sumber Leads</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={leadsBySumber} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                {leadsBySumber.map((_, i) => <Cell key={i} fill={COLORS[i]} strokeWidth={0} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Gangguan Eksternal</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={gangguanChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Jumlah" radius={[6, 6, 0, 0]}>
                {gangguanChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Detail & Rekap Komisi per Tim</h3>
            <p className="text-xs text-gray-400">Akumulasi komisi pekerjaan sukses masing-masing regu teknisi</p>
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 self-start sm:self-auto">
            Total Beban: {formatRupiah(totalBebanKomisi)}
          </span>
        </div>

        {/* Mobile Card View for Komisi */}
        <div className="sm:hidden p-3.5 space-y-3 divide-y divide-gray-100">
          {timData.map((t) => {
            const timP = filteredPekerjaan.filter((p) => p.tim === t.nama);
            const pemasangan = timP.filter((p) => p.jenis === "PEMASANGAN" && p.status === "SELESAI").length;
            const perbaikan = timP.filter((p) => p.jenis === "PERBAIKAN" && p.status === "SELESAI").length;
            const perbaikanKhusus = timP.filter((p) => p.jenis === "PERBAIKAN KHUSUS (ODP/ODC)" && p.status === "SELESAI").length;
            const pemutusan = timP.filter((p) => p.jenis === "PEMUTUSAN" && p.status === "SELESAI").length;
            const total = pemasangan + perbaikan + perbaikanKhusus + pemutusan;
            const timKomisi = getTeamKomisi(t.nama);
            return (
              <div key={t.id || t.nama} className="pt-3 first:pt-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-gray-900 text-sm">{t.nama}</h4>
                  <span className="font-extrabold text-amber-600 font-mono text-xs bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                    {formatRupiah(timKomisi)}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                  <div className="bg-blue-50/70 p-1.5 rounded-lg">
                    <span className="text-gray-400 block font-bold">Pasang</span>
                    <span className="font-black text-[#0D1B4A]">{pemasangan}</span>
                  </div>
                  <div className="bg-amber-50/70 p-1.5 rounded-lg">
                    <span className="text-gray-400 block font-bold">Perbaikan</span>
                    <span className="font-black text-[#F59E0B]">{perbaikan}</span>
                  </div>
                  <div className="bg-purple-50/70 p-1.5 rounded-lg">
                    <span className="text-gray-400 block font-bold">Khusus</span>
                    <span className="font-black text-[#8B5CF6]">{perbaikanKhusus}</span>
                  </div>
                  <div className="bg-orange-50/70 p-1.5 rounded-lg">
                    <span className="text-gray-400 block font-bold">Putus</span>
                    <span className="font-black text-[#F97316]">{pemutusan}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Tim</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Pemasangan</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Perbaikan</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Perbaikan Khusus</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Pemutusan</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Total Tugas</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Total Komisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {timData.map((t) => {
                const timP = filteredPekerjaan.filter((p) => p.tim === t.nama);
                const pemasangan = timP.filter((p) => p.jenis === "PEMASANGAN" && p.status === "SELESAI").length;
                const perbaikan = timP.filter((p) => p.jenis === "PERBAIKAN" && p.status === "SELESAI").length;
                const perbaikanKhusus = timP.filter((p) => p.jenis === "PERBAIKAN KHUSUS (ODP/ODC)" && p.status === "SELESAI").length;
                const pemutusan = timP.filter((p) => p.jenis === "PEMUTUSAN" && p.status === "SELESAI").length;
                const total = pemasangan + perbaikan + perbaikanKhusus + pemutusan;
                const timKomisi = getTeamKomisi(t.nama);
                return (
                  <tr key={t.id || t.nama} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-bold text-gray-800">{t.nama}</td>
                    <td className="px-5 py-3 text-center text-[#0D1B4A] font-bold">{pemasangan}</td>
                    <td className="px-5 py-3 text-center text-[#F59E0B] font-bold">{perbaikan}</td>
                    <td className="px-5 py-3 text-center text-[#8B5CF6] font-bold">{perbaikanKhusus}</td>
                    <td className="px-5 py-3 text-center text-[#F97316] font-bold">{pemutusan}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-800">{total}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-extrabold text-amber-600 font-mono">{formatRupiah(timKomisi)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kinerja Progress Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">Kinerja Progress Pemasangan</h3>
        </div>

        {/* Mobile Card View for Kinerja */}
        <div className="sm:hidden p-3.5 space-y-2.5 divide-y divide-gray-100">
          {timData.map((t) => {
            const timP = filteredPekerjaan.filter((p) => p.tim === t.nama && p.jenis === "PEMASANGAN");
            const selesai = timP.filter((p) => p.status === "SELESAI").length;
            const total = timP.length;
            const gagal = timP.filter((p) => p.status === "GAGAL").length;
            const persen = total > 0 ? (selesai / total) * 100 : 0;
            return (
              <div key={t.nama} className="pt-2.5 first:pt-0 flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">{t.nama}</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Selesai: <b className="text-emerald-700">{selesai}</b> / {total} {gagal > 0 ? `· (${gagal} gagal)` : ""}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${
                  persen >= 90 ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : persen >= 70 ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                    : "bg-red-50 text-red-700 ring-1 ring-red-200"
                }`}>
                  {persen.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Tim</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Selesai</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Total</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Persentase</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Gagal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {timData.map((t) => {
                const timP = filteredPekerjaan.filter((p) => p.tim === t.nama && p.jenis === "PEMASANGAN");
                const selesai = timP.filter((p) => p.status === "SELESAI").length;
                const total = timP.length;
                const gagal = timP.filter((p) => p.status === "GAGAL").length;
                const persen = total > 0 ? (selesai / total) * 100 : 0;
                return (
                  <tr key={t.nama} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-bold text-gray-800">{t.nama}</td>
                    <td className="px-5 py-3 text-center text-emerald-600 font-bold">{selesai}</td>
                    <td className="px-5 py-3 text-center text-gray-800 font-bold">{total}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        persen >= 90 ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          : persen >= 70 ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                          : "bg-red-50 text-red-700 ring-1 ring-red-200"
                      }`}>
                        {persen.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {gagal > 0 ? (
                        <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-bold">{gagal}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FU Pelanggan */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">FU Pelanggan (Follow Up)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Tanggal</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Pelanggan</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Keterangan</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Prioritas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {fuPelangganList.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-gray-500 font-medium">{f.tanggal}</td>
                  <td className="px-5 py-3 font-semibold text-gray-800">{f.pelanggan}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      f.status === "Selesai" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : f.status === "Proses" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                        : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                    }`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{f.keterangan}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      f.prioritas === "Tinggi" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"
                    }`}>
                      {f.prioritas}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Redaman Tinggi */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">Redaman Tinggi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Lokasi</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Nilai Redaman</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Teknisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {redamanTinggiList.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-gray-800">{r.lokasi}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      r.nilaiRedaman > 30 ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                        : r.nilaiRedaman > 25 ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                        : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    }`}>
                      {r.nilaiRedaman} dB
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      r.status === "Selesai" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : r.status === "Proses" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                        : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{r.teknisi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pengajuan Pemutusan */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Pengajuan Pemutusan</h3>
            <p className="text-xs text-gray-400 mt-0.5">{pengajuanPemutusanList.length} pengajuan</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">No</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Nama</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Kontak</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Sebab/Alasan</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pengajuanPemutusanList.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-gray-400 font-medium">{p.id}</td>
                  <td className="px-5 py-3 font-semibold text-gray-800">{p.nama}</td>
                  <td className="px-5 py-3 text-gray-500 font-mono text-xs">{p.kontak}</td>
                  <td className="px-5 py-3 text-gray-600">{p.alasan || <span className="text-gray-300">-</span>}</td>
                  <td className="px-5 py-3 text-gray-500 font-medium">{p.tanggal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daftar Gangguan Detail */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Daftar Gangguan (Detail)</h3>
            <p className="text-xs text-gray-400 mt-0.5">{daftarGangguanList.length} gangguan tercatat</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">No</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Nama</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Keterangan</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Kontak</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Tgl Mulai</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Follow Up</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Hasil FU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {daftarGangguanList.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-gray-400 font-medium">{g.id}</td>
                  <td className="px-5 py-3 font-semibold text-gray-800">{g.nama}</td>
                  <td className="px-5 py-3 text-gray-600">{g.keterangan || <span className="text-gray-300">-</span>}</td>
                  <td className="px-5 py-3 text-gray-500 font-mono text-xs">{g.kontak || <span className="text-gray-300">-</span>}</td>
                  <td className="px-5 py-3 text-gray-500 font-medium">{g.tanggalMulai}</td>
                  <td className="px-5 py-3 text-gray-500 font-medium">{g.followUp || <span className="text-gray-300">-</span>}</td>
                  <td className="px-5 py-3">
                    {g.hasilFU ? (
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        g.hasilFU === "Aman" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          : g.hasilFU === "Bermasalah" ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                      }`}>
                        {g.hasilFU}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
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
