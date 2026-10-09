import { useState, useMemo } from "react";
import {
  Wallet,
  Coins,
  DollarSign,
  Calendar,
  FileSpreadsheet,
  Edit2,
  Receipt,
  Send,
  CheckCircle2,
  SlidersHorizontal,
  Plus,
  X,
  Save,
  RotateCcw,
  Building2,
  Users,
} from "lucide-react";
import { formatRupiah, DEFAULT_INCENTIVE_CONFIG } from "../lib/incentives";
import {
  getTeamSalaryProfiles,
  saveTeamSalaryProfiles,
  calculateTeamPayroll,
  SKEMA_GAJI,
  generateWhatsAppSlipMessage,
} from "../lib/payroll";
import SlipGajiModal from "./SlipGajiModal";
import { showToast } from "../lib/toast";

export default function PayrollManagementTab({
  timList = [],
  pekerjaanData = [],
  masterKomisi = [],
}) {
  const [salaryProfiles, setSalaryProfiles] = useState(() => getTeamSalaryProfiles());
  const [selectedPeriod, setSelectedPeriod] = useState("THIS_MONTH"); // "THIS_MONTH", "LAST_MONTH", "ALL"
  const [selectedSlipData, setSelectedSlipData] = useState(null);
  const [editingTeamName, setEditingTeamName] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // Filter pekerjaan berdasarkan periode
  const filteredTasks = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    return pekerjaanData.filter((p) => {
      const dateStr = p.waktu_selesai || p.tanggal;
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return true;

      if (selectedPeriod === "THIS_MONTH") {
        return d.getFullYear() === curYear && d.getMonth() === curMonth;
      }
      if (selectedPeriod === "LAST_MONTH") {
        const lastMonth = new Date(curYear, curMonth - 1, 1);
        return d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth();
      }
      return true;
    });
  }, [pekerjaanData, selectedPeriod]);

  const periodLabel = useMemo(() => {
    const now = new Date();
    if (selectedPeriod === "THIS_MONTH") {
      return now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    }
    if (selectedPeriod === "LAST_MONTH") {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return prev.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    }
    return "Semua Periode";
  }, [selectedPeriod]);

  // Daftar seluruh tim unik
  const uniqueTeams = useMemo(() => {
    const names = new Set();
    timList.forEach((t) => {
      if (t.nama) names.add(t.nama);
    });
    // Sertakan tim dari data pekerjaan jika belum ada
    pekerjaanData.forEach((p) => {
      if (p.tim) names.add(p.tim);
    });
    // Fallback jika belum ada data tim
    if (names.size === 0) {
      names.add("GATRA - AIS");
      names.add("PUTRA - FAISAL");
    }
    return Array.from(names);
  }, [timList, pekerjaanData]);

  // Hitung payroll untuk seluruh tim
  const payrollList = useMemo(() => {
    return uniqueTeams.map((timNama) => {
      const profile = salaryProfiles[timNama] || salaryProfiles["DEFAULT"] || {};
      return calculateTeamPayroll({
        timNama,
        tasks: filteredTasks,
        profile,
        periodLabel,
        config: DEFAULT_INCENTIVE_CONFIG,
        masterList: masterKomisi,
      });
    });
  }, [uniqueTeams, filteredTasks, salaryProfiles, periodLabel, masterKomisi]);

  // Statistik Ringkasan Payroll
  const totals = useMemo(() => {
    let totalTHP = 0;
    let totalKomisi = 0;
    let totalGajiPokok = 0;
    let totalTunjangan = 0;
    let totalPotongan = 0;
    let totalTugas = 0;

    payrollList.forEach((p) => {
      totalTHP += p.takeHomePay;
      totalKomisi += p.totalKomisiTugas + p.bonusTarget;
      totalGajiPokok += p.gajiPokok;
      totalTunjangan += p.totalTunjangan;
      totalPotongan += p.totalPotongan;
      totalTugas += p.totalTugasSelesai;
    });

    return {
      totalTHP,
      totalKomisi,
      totalGajiPokok,
      totalTunjangan,
      totalPotongan,
      totalTugas,
    };
  }, [payrollList]);

  // Buka modal edit struktur gaji
  const handleOpenEdit = (timNama) => {
    const curProfile = salaryProfiles[timNama] || salaryProfiles["DEFAULT"] || {
      skema: "TETAP_KOMISI",
      gajiPokok: 2500000,
      uangHarian: 0,
      hariKerja: 26,
      tunjanganMakan: 300000,
      tunjanganTransport: 250000,
      tunjanganKomunikasi: 100000,
      potonganKasbon: 0,
      potonganBpjs: 50000,
      potonganLain: 0,
      rekeningBank: "-",
      atasNama: timNama,
      nomorWa: "",
    };

    setEditingTeamName(timNama);
    setEditForm({ ...curProfile });
  };

  // Simpan perubahan profil gaji
  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!editingTeamName || !editForm) return;

    const updated = {
      ...salaryProfiles,
      [editingTeamName]: { ...editForm },
    };

    setSalaryProfiles(updated);
    saveTeamSalaryProfiles(updated);
    setEditingTeamName(null);
    setEditForm(null);
    showToast(`Struktur gaji tim ${editingTeamName} berhasil diperbarui!`, "success");
  };

  // Kirim WhatsApp cepat
  const handleQuickWhatsApp = (payrollData) => {
    const rawNumber = payrollData.nomorWa || "";
    let cleanNumber = rawNumber.replace(/[^0-9]/g, "");
    if (cleanNumber.startsWith("0")) {
      cleanNumber = "62" + cleanNumber.slice(1);
    }
    const message = generateWhatsAppSlipMessage(payrollData);
    const encoded = encodeURIComponent(message);
    const url = cleanNumber ? `https://wa.me/${cleanNumber}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  // Ekspor Rekapitulasi ke Excel
  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const rows = payrollList.map((p, idx) => ({
        No: idx + 1,
        "Nama Tim": p.timNama,
        "Nama Penerima": p.atasNama,
        "Skema Gaji": p.skema,
        "Gaji Pokok (Rp)": p.gajiPokok,
        "Total Tunjangan (Rp)": p.totalTunjangan,
        "Tugas Selesai": p.totalTugasSelesai,
        "Komisi SPK (Rp)": p.totalKomisiTugas,
        "Bonus Target (Rp)": p.bonusTarget,
        "Total Kotor (Rp)": p.totalPenghasilanKotor,
        "Potongan Kasbon (Rp)": p.potonganKasbon,
        "Potongan BPJS (Rp)": p.potonganBpjs,
        "Potongan Lain (Rp)": p.potonganLain,
        "Total Potongan (Rp)": p.totalPotongan,
        "Gaji Bersih / THP (Rp)": p.takeHomePay,
        "Rekening Bank": p.rekeningBank,
        "No. WhatsApp": p.nomorWa,
        Periode: p.periodLabel,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Rekapitulasi Gaji");

      const filename = `Rekap_Gaji_Teknisi_Nexus_${periodLabel.replace(/\s+/g, "_")}.xlsx`;
      XLSX.writeFile(wb, filename);
      showToast("Berhasil mengekspor rekap gaji ke Excel!", "success");
    } catch (err) {
      showToast("Gagal mengekspor: " + err.message, "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#F59E0B] flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Penggajian & Komisi Teknisi</h2>
            <p className="text-xs text-gray-500">
              Periode Aktif: <strong className="text-gray-700">{periodLabel}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          {/* Filter Periode */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold text-gray-600">
            <button
              onClick={() => setSelectedPeriod("THIS_MONTH")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedPeriod === "THIS_MONTH" ? "bg-white text-gray-900 shadow-xs" : "hover:text-gray-900"
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setSelectedPeriod("LAST_MONTH")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedPeriod === "LAST_MONTH" ? "bg-white text-gray-900 shadow-xs" : "hover:text-gray-900"
              }`}
            >
              Bulan Lalu
            </button>
            <button
              onClick={() => setSelectedPeriod("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedPeriod === "ALL" ? "bg-white text-gray-900 shadow-xs" : "hover:text-gray-900"
              }`}
            >
              Semua
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* KPI Ringkasan Beban Finansial */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
            Total Beban Gaji (Take Home Pay)
          </span>
          <p className="text-xl sm:text-2xl font-black text-[#0D1B4A] mt-1 tracking-tight">
            {formatRupiah(totals.totalTHP)}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Siap Dicairkan
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
            Total Komisi & Bonus Lapangan
          </span>
          <p className="text-xl sm:text-2xl font-black text-[#F59E0B] mt-1 tracking-tight">
            {formatRupiah(totals.totalKomisi)}
          </p>
          <span className="text-[11px] text-gray-500 font-medium mt-1 block">
            Dari {totals.totalTugas} tugas fisik selesai
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
            Gaji Pokok & Tunjangan
          </span>
          <p className="text-xl sm:text-2xl font-black text-blue-600 mt-1 tracking-tight">
            {formatRupiah(totals.totalGajiPokok + totals.totalTunjangan)}
          </p>
          <span className="text-[11px] text-gray-500 font-medium mt-1 block">
            Komponen Tetap Bulanan
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
            Total Potongan (Kasbon/BPJS)
          </span>
          <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1 tracking-tight">
            -{formatRupiah(totals.totalPotongan)}
          </p>
          <span className="text-[11px] text-gray-500 font-medium mt-1 block">
            Pengurang Beban
          </span>
        </div>
      </div>

      {/* Tabel Daftar Penggajian Teknisi */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <h3 className="font-bold text-gray-900 text-sm">Daftar Penggajian Regu Teknisi</h3>
          </div>
          <span className="text-xs text-gray-500">{payrollList.length} Regu Aktif</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-600 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 font-bold">Tim & Penerima</th>
                <th className="px-4 py-3 font-bold">Skema</th>
                <th className="px-4 py-3 font-bold">Gaji Pokok</th>
                <th className="px-4 py-3 font-bold">Tunjangan</th>
                <th className="px-4 py-3 font-bold">Komisi SPK</th>
                <th className="px-4 py-3 font-bold">Bonus</th>
                <th className="px-4 py-3 font-bold">Potongan</th>
                <th className="px-4 py-3 font-bold">Take Home Pay</th>
                <th className="px-4 py-3 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {payrollList.map((p) => (
                <tr key={p.timNama} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-gray-900 text-sm">{p.timNama}</div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <span>{p.atasNama}</span>
                      <span className="text-gray-300">&bull;</span>
                      <span className="text-gray-400">{p.rekeningBank}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                      {p.skema === "TETAP_KOMISI" ? "Tetap + Komisi" : p.skema === "HARIAN_KOMISI" ? "Harian" : "Murni Komisi"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-800 font-semibold">{formatRupiah(p.gajiPokok)}</td>
                  <td className="px-4 py-3.5 text-gray-600">{formatRupiah(p.totalTunjangan)}</td>
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-amber-700">{formatRupiah(p.totalKomisiTugas)}</div>
                    <div className="text-[10px] text-gray-400">{p.totalTugasSelesai} tugas</div>
                  </td>
                  <td className="px-4 py-3.5">
                    {p.bonusTarget > 0 ? (
                      <span className="font-bold text-emerald-600">+{formatRupiah(p.bonusTarget)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {p.totalPotongan > 0 ? (
                      <span className="font-semibold text-rose-600">-{formatRupiah(p.totalPotongan)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-black text-[#0D1B4A] text-sm">{formatRupiah(p.takeHomePay)}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedSlipData(p)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        title="Lihat & Cetak Slip Gaji"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Slip</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(p.timNama)}
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all cursor-pointer"
                        title="Atur Struktur Gaji"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleQuickWhatsApp(p)}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all cursor-pointer"
                        title="Kirim Ringkasan WA"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit Struktur Gaji Tim */}
      {editingTeamName && editForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 border border-gray-100 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150">
            {/* Mobile Drag Indicator Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Atur Struktur Gaji: {editingTeamName}</h3>
                <p className="text-xs text-gray-500">Konfigurasi gaji pokok, tunjangan, dan nomor rekening penerima</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingTeamName(null);
                  setEditForm(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 pt-3 text-xs">
              {/* Skema Gaji */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Skema Penggajian</label>
                <select
                  value={editForm.skema}
                  onChange={(e) => setEditForm({ ...editForm, skema: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-[#F59E0B]"
                >
                  {SKEMA_GAJI.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gaji Pokok atau Uang Harian */}
              {editForm.skema === "TETAP_KOMISI" && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Gaji Pokok Bulanan (Rp)</label>
                  <input
                    type="number"
                    value={editForm.gajiPokok}
                    onChange={(e) => setEditForm({ ...editForm, gajiPokok: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-[#F59E0B]"
                  />
                </div>
              )}

              {editForm.skema === "HARIAN_KOMISI" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Uang Harian (Rp)</label>
                    <input
                      type="number"
                      value={editForm.uangHarian}
                      onChange={(e) => setEditForm({ ...editForm, uangHarian: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Hari Kerja (Hari)</label>
                    <input
                      type="number"
                      value={editForm.hariKerja}
                      onChange={(e) => setEditForm({ ...editForm, hariKerja: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Tunjangan-tunjangan */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <span className="font-bold text-gray-900 block text-[11px] uppercase tracking-wider">
                  Tunjangan Operasional
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-medium text-gray-600 mb-1">Makan (Rp)</label>
                    <input
                      type="number"
                      value={editForm.tunjanganMakan}
                      onChange={(e) => setEditForm({ ...editForm, tunjanganMakan: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-600 mb-1">Transport (Rp)</label>
                    <input
                      type="number"
                      value={editForm.tunjanganTransport}
                      onChange={(e) => setEditForm({ ...editForm, tunjanganTransport: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-600 mb-1">Pulsa (Rp)</label>
                    <input
                      type="number"
                      value={editForm.tunjanganKomunikasi}
                      onChange={(e) => setEditForm({ ...editForm, tunjanganKomunikasi: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Potongan-potongan */}
              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200 space-y-3">
                <span className="font-bold text-rose-900 block text-[11px] uppercase tracking-wider">
                  Potongan Pengurang
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-medium text-gray-600 mb-1">Kasbon (Rp)</label>
                    <input
                      type="number"
                      value={editForm.potonganKasbon}
                      onChange={(e) => setEditForm({ ...editForm, potonganKasbon: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-600 mb-1">BPJS (Rp)</label>
                    <input
                      type="number"
                      value={editForm.potonganBpjs}
                      onChange={(e) => setEditForm({ ...editForm, potonganBpjs: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-600 mb-1">Lainnya (Rp)</label>
                    <input
                      type="number"
                      value={editForm.potonganLain}
                      onChange={(e) => setEditForm({ ...editForm, potonganLain: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Data Rekening & Kontak */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nama Penerima Rekening</label>
                  <input
                    type="text"
                    value={editForm.atasNama}
                    onChange={(e) => setEditForm({ ...editForm, atasNama: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                    placeholder="Contoh: Gatra Wicaksono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Rekening Bank</label>
                  <input
                    type="text"
                    value={editForm.rekeningBank}
                    onChange={(e) => setEditForm({ ...editForm, rekeningBank: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                    placeholder="BCA - 8450192831"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nomor WhatsApp Pengiriman Slip</label>
                <input
                  type="text"
                  value={editForm.nomorWa}
                  onChange={(e) => setEditForm({ ...editForm, nomorWa: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                  placeholder="081234567890"
                />
              </div>

              {/* Tombol Simpan */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTeamName(null);
                    setEditForm(null);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0D1B4A] hover:bg-[#152763] text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-4 h-4 text-[#F59E0B]" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tampilan Slip Gaji */}
      {selectedSlipData && (
        <SlipGajiModal
          payrollData={selectedSlipData}
          onClose={() => setSelectedSlipData(null)}
        />
      )}
    </div>
  );
}
