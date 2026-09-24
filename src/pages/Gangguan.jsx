import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Search,
  Plus,
  Edit2,
  Trash2,
  Phone,
  MessageCircle,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  HelpCircle,
  Download,
  X,
  FileSpreadsheet,
  Check,
  RefreshCw,
} from "lucide-react";
import { daftarGangguanList } from "../data/mockData";
import { usePersistState } from "../hooks/usePersistState";
import Toast from "../components/Toast";
import * as XLSX from "xlsx";

function getStatusBadge(hasil) {
  const norm = (hasil || "").trim().toLowerCase();
  if (norm === "aman") {
    return {
      label: "Aman",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200/80 font-bold",
      rowClass: "bg-emerald-50/20 hover:bg-emerald-50/40",
      icon: CheckCircle2,
    };
  }
  if (norm === "bermasalah") {
    return {
      label: "Bermasalah",
      className: "bg-red-50 text-red-700 border-red-200/80 font-bold",
      rowClass: "bg-red-50/20 hover:bg-red-50/40",
      icon: AlertCircle,
    };
  }
  if (norm.includes("ngelag") || norm.includes("kadang")) {
    return {
      label: hasil,
      className: "bg-amber-50 text-amber-700 border-amber-200/80 font-bold",
      rowClass: "bg-amber-50/20 hover:bg-amber-50/40",
      icon: Clock,
    };
  }
  return {
    label: hasil || "Belum Follow-Up",
    className: "bg-gray-100 text-gray-600 border-gray-200 font-medium",
    rowClass: "hover:bg-gray-50/60",
    icon: HelpCircle,
  };
}

// Clean phone number for wa.me link
function formatWaLink(kontak, nama, keterangan) {
  if (!kontak) return null;
  // ambil angka pertama jika ada beberapa nomor
  const matches = kontak.match(/\d{9,15}/g);
  if (!matches || matches.length === 0) return null;
  let phone = matches[0];
  if (phone.startsWith("0")) phone = "62" + phone.substring(1);
  if (!phone.startsWith("62")) phone = "62" + phone;

  const text = encodeURIComponent(
    `Halo Kak ${nama || "Pelanggan"}, kami dari Support Nexus Net ingin menindaklanjuti kendala WiFi (${keterangan || "layanan"}). Apakah koneksi saat ini sudah berjalan aman dan normal? Terima kasih 🙏`
  );
  return `https://wa.me/${phone}?text=${text}`;
}

const KENDALA_PRESETS = [
  "Lelet/Restart",
  "Wifi tidak ada Koneksi & modem Hidup mati",
  "LOS/Kabel Putus",
  "Restart/Tidak ada sinyal setelah mati lampu",
  "Ngelag/Putus Nyambung",
  "Lampu Modem Tidak Hidup",
  "Redaman Tinggi",
  "Online/Tidak ada Konfirmasi",
];

export default function Gangguan() {
  const [data, setData] = usePersistState("xnet_daftar_gangguan_v2", daftarGangguanList);
  const [search, setSearch] = useState("");
  const [filterHasil, setFilterHasil] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    nama: "",
    keterangan: "",
    kontak: "",
    tanggalMulai: "",
    followUp: "",
    hasilFU: "Aman",
  });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Filtered
  const filtered = useMemo(() => {
    return data.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        (item.nama || "").toLowerCase().includes(q) ||
        (item.keterangan || "").toLowerCase().includes(q) ||
        (item.kontak || "").toLowerCase().includes(q);

      const normHasil = (item.hasilFU || "").trim().toLowerCase();
      let matchFilter = true;
      if (filterHasil === "AMAN") matchFilter = normHasil === "aman";
      else if (filterHasil === "BERMASALAH") matchFilter = normHasil === "bermasalah";
      else if (filterHasil === "NGELAG") matchFilter = normHasil.includes("ngelag") || normHasil.includes("kadang");
      else if (filterHasil === "PENDING") matchFilter = !item.hasilFU || normHasil === "";

      return matchSearch && matchFilter;
    });
  }, [data, search, filterHasil]);

  // Statistics
  const stats = useMemo(() => {
    let aman = 0;
    let bermasalah = 0;
    let ngelag = 0;
    let pending = 0;

    data.forEach((d) => {
      const norm = (d.hasilFU || "").trim().toLowerCase();
      if (norm === "aman") aman++;
      else if (norm === "bermasalah") bermasalah++;
      else if (norm.includes("ngelag") || norm.includes("kadang")) ngelag++;
      else pending++;
    });

    return {
      total: data.length,
      aman,
      bermasalah,
      ngelag,
      pending,
    };
  }, [data]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    const today = new Date();
    const d = today.getDate();
    const m = today.getMonth() + 1;
    const y = String(today.getFullYear()).slice(-2);
    const dateFormatted = `${d}-${m}-${y}`;

    setFormData({
      nama: "",
      keterangan: "",
      kontak: "",
      tanggalMulai: dateFormatted,
      followUp: dateFormatted,
      hasilFU: "",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      nama: item.nama || "",
      keterangan: item.keterangan || "",
      kontak: item.kontak || "",
      tanggalMulai: item.tanggalMulai || "",
      followUp: item.followUp || "",
      hasilFU: item.hasilFU || "",
    });
    setShowModal(true);
  };

  const handleQuickStatusChange = (id, newStatus) => {
    setData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, hasilFU: newStatus } : item))
    );
    showToast("success", `Status follow up diubah menjadi "${newStatus || "Pending"}"`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      showToast("error", "Nama pelanggan wajib diisi!");
      return;
    }

    if (editingItem) {
      setData((prev) =>
        prev.map((item) =>
          item.id === editingItem.id ? { ...item, ...formData } : item
        )
      );
      showToast("success", `Data gangguan ${formData.nama} berhasil diperbarui!`);
    } else {
      const newItem = {
        id: Date.now(),
        ...formData,
      };
      setData((prev) => [newItem, ...prev]);
      showToast("success", `Laporan gangguan ${formData.nama} berhasil ditambahkan!`);
    }
    setShowModal(false);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    setData((prev) => prev.filter((d) => d.id !== deleteConfirm.id));
    showToast("success", `Laporan gangguan ${deleteConfirm.nama} dihapus.`);
    setDeleteConfirm(null);
  };

  const handleExportExcel = () => {
    const rows = data.map((d, idx) => ({
      No: idx + 1,
      Nama: d.nama,
      Keterangan: d.keterangan || "-",
      Kontak: d.kontak || "-",
      "Tanggal Mulai": d.tanggalMulai || "-",
      FollUp: d.followUp || "-",
      "Hasil FU": d.hasilFU || "Belum FU",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daftar Gangguan");
    XLSX.writeFile(wb, `daftar-gangguan-${new Date().toISOString().split("T")[0]}.xlsx`);
    showToast("success", "Export Excel Daftar Gangguan berhasil diunduh!");
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Daftar Gangguan</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
              {stats.total} Tiket
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            Log penanganan kendala WiFi & riwayat follow-up pelanggan
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold hover:shadow-md active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Gangguan</span>
          </button>
        </div>
      </div>

      {/* Stats Cards (Mirrors Spreadsheet Status Categories) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <button
          onClick={() => setFilterHasil("ALL")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterHasil === "ALL"
              ? "bg-[#0D1B4A] text-white border-[#0D1B4A] shadow-md"
              : "bg-white text-gray-800 border-gray-100 hover:border-gray-200 shadow-sm"
          }`}
        >
          <p className={`text-xs font-bold uppercase tracking-wider ${filterHasil === "ALL" ? "text-white/70" : "text-gray-400"}`}>
            Total Kasus
          </p>
          <p className="text-2xl font-black mt-1">{stats.total}</p>
          <p className={`text-[11px] mt-1 font-medium ${filterHasil === "ALL" ? "text-white/60" : "text-gray-400"}`}>
            Semua catatan
          </p>
        </button>

        <button
          onClick={() => setFilterHasil("AMAN")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterHasil === "AMAN"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
              : "bg-white text-gray-800 border-emerald-100 hover:border-emerald-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-bold uppercase tracking-wider ${filterHasil === "AMAN" ? "text-white/80" : "text-emerald-700"}`}>
              Hasil Aman
            </p>
            <CheckCircle2 className={`w-4 h-4 ${filterHasil === "AMAN" ? "text-white" : "text-emerald-500"}`} />
          </div>
          <p className={`text-2xl font-black mt-1 ${filterHasil === "AMAN" ? "text-white" : "text-emerald-600"}`}>
            {stats.aman}
          </p>
          <p className={`text-[11px] mt-1 font-medium ${filterHasil === "AMAN" ? "text-white/70" : "text-emerald-600/80"}`}>
            Sudah teratasi
          </p>
        </button>

        <button
          onClick={() => setFilterHasil("BERMASALAH")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterHasil === "BERMASALAH"
              ? "bg-red-600 text-white border-red-600 shadow-md"
              : "bg-white text-gray-800 border-red-100 hover:border-red-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-bold uppercase tracking-wider ${filterHasil === "BERMASALAH" ? "text-white/80" : "text-red-700"}`}>
              Bermasalah
            </p>
            <AlertCircle className={`w-4 h-4 ${filterHasil === "BERMASALAH" ? "text-white" : "text-red-500"}`} />
          </div>
          <p className={`text-2xl font-black mt-1 ${filterHasil === "BERMASALAH" ? "text-white" : "text-red-600"}`}>
            {stats.bermasalah}
          </p>
          <p className={`text-[11px] mt-1 font-medium ${filterHasil === "BERMASALAH" ? "text-white/70" : "text-red-600/80"}`}>
            Perlu teknisi segera
          </p>
        </button>

        <button
          onClick={() => setFilterHasil("NGELAG")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterHasil === "NGELAG"
              ? "bg-amber-500 text-white border-amber-500 shadow-md"
              : "bg-white text-gray-800 border-amber-100 hover:border-amber-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-bold uppercase tracking-wider ${filterHasil === "NGELAG" ? "text-white/80" : "text-amber-700"}`}>
              Kadang Ngelag
            </p>
            <Clock className={`w-4 h-4 ${filterHasil === "NGELAG" ? "text-white" : "text-amber-500"}`} />
          </div>
          <p className={`text-2xl font-black mt-1 ${filterHasil === "NGELAG" ? "text-white" : "text-amber-600"}`}>
            {stats.ngelag}
          </p>
          <p className={`text-[11px] mt-1 font-medium ${filterHasil === "NGELAG" ? "text-white/70" : "text-amber-600/80"}`}>
            Perlu dipantau
          </p>
        </button>

        <button
          onClick={() => setFilterHasil("PENDING")}
          className={`p-4 rounded-2xl border text-left transition-all col-span-2 sm:col-span-1 ${
            filterHasil === "PENDING"
              ? "bg-gray-700 text-white border-gray-700 shadow-md"
              : "bg-white text-gray-800 border-gray-100 hover:border-gray-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-bold uppercase tracking-wider ${filterHasil === "PENDING" ? "text-white/80" : "text-gray-500"}`}>
              Belum di-FU
            </p>
            <HelpCircle className={`w-4 h-4 ${filterHasil === "PENDING" ? "text-white" : "text-gray-400"}`} />
          </div>
          <p className={`text-2xl font-black mt-1 ${filterHasil === "PENDING" ? "text-white" : "text-gray-700"}`}>
            {stats.pending}
          </p>
          <p className={`text-[11px] mt-1 font-medium ${filterHasil === "PENDING" ? "text-white/70" : "text-gray-400"}`}>
            Menunggu kontak
          </p>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="w-full md:w-96 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama, keluhan, no HP/WA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "ALL", label: "Semua" },
            { id: "AMAN", label: "Aman" },
            { id: "BERMASALAH", label: "Bermasalah" },
            { id: "NGELAG", label: "Kadang Ngelag" },
            { id: "PENDING", label: "Belum FU" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterHasil(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterHasil === f.id
                  ? "bg-red-50 text-red-600 font-bold border border-red-200"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table: Exact Columns as Spreadsheet */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#FFF8E7] border-b border-amber-200/80 text-amber-950">
              <tr>
                <th className="px-4 py-3.5 font-bold text-xs uppercase tracking-wider text-center w-14">No</th>
                <th className="px-5 py-3.5 font-bold text-xs uppercase tracking-wider min-w-[180px]">Nama Pelanggan</th>
                <th className="px-5 py-3.5 font-bold text-xs uppercase tracking-wider min-w-[220px]">Keterangan Gangguan</th>
                <th className="px-5 py-3.5 font-bold text-xs uppercase tracking-wider min-w-[180px]">Kontak (WhatsApp)</th>
                <th className="px-4 py-3.5 font-bold text-xs uppercase tracking-wider min-w-[110px]">Tgl Mulai</th>
                <th className="px-4 py-3.5 font-bold text-xs uppercase tracking-wider min-w-[110px]">Follow-Up</th>
                <th className="px-5 py-3.5 font-bold text-xs uppercase tracking-wider min-w-[170px]">Hasil FU</th>
                <th className="px-4 py-3.5 font-bold text-xs uppercase tracking-wider text-center min-w-[90px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    <AlertTriangle className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-gray-600">Tidak ada data gangguan ditemukan</p>
                    <p className="text-xs text-gray-400 mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item, index) => {
                  const badge = getStatusBadge(item.hasilFU);
                  const waUrl = formatWaLink(item.kontak, item.nama, item.keterangan);

                  return (
                    <tr key={item.id} className={`transition-colors ${badge.rowClass}`}>
                      {/* No */}
                      <td className="px-4 py-3.5 text-center font-bold text-gray-500 text-xs">
                        {index + 1}
                      </td>

                      {/* Nama Pelanggan (Bold & Highlighted like sheet) */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                              item.hasilFU === "Aman"
                                ? "bg-emerald-500"
                                : item.hasilFU === "Bermasalah"
                                ? "bg-red-500 ring-2 ring-red-200"
                                : item.hasilFU?.includes("Ngelag")
                                ? "bg-amber-400"
                                : "bg-gray-300"
                            }`}
                          />
                          <span className="font-bold text-gray-900 tracking-tight">{item.nama}</span>
                        </div>
                      </td>

                      {/* Keterangan */}
                      <td className="px-5 py-3.5">
                        <p className="text-gray-700 text-xs leading-relaxed font-medium">
                          {item.keterangan || <span className="text-gray-300 italic">-</span>}
                        </p>
                      </td>

                      {/* Kontak + Direct WhatsApp Link */}
                      <td className="px-5 py-3.5">
                        {item.kontak ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-700 select-all font-semibold">
                              {item.kontak}
                            </span>
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Kirim Chat WhatsApp ke Pelanggan"
                                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-sm transition-all active:scale-95"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>Chat WA</span>
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs italic">Tanpa No. HP</span>
                        )}
                      </td>

                      {/* Tanggal Mulai */}
                      <td className="px-4 py-3.5 font-mono text-xs text-gray-600 font-medium">
                        {item.tanggalMulai || "-"}
                      </td>

                      {/* Tanggal Follow Up */}
                      <td className="px-4 py-3.5 font-mono text-xs text-gray-600 font-medium">
                        {item.followUp || "-"}
                      </td>

                      {/* Hasil FU: Interactive Quick Status Selector */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={item.hasilFU || ""}
                            onChange={(e) => handleQuickStatusChange(item.id, e.target.value)}
                            className={`px-2.5 py-1.5 rounded-xl border text-xs outline-none cursor-pointer transition-all shadow-sm ${badge.className}`}
                          >
                            <option value="">(Belum Follow-Up)</option>
                            <option value="Aman">🟢 Aman</option>
                            <option value="Bermasalah">🔴 Bermasalah</option>
                            <option value="Kadang Ngelag">🟡 Kadang Ngelag</option>
                          </select>
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Laporan"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(item)}
                            title="Hapus Laporan"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer info */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
          <span>
            Menampilkan <b>{filtered.length}</b> dari <b>{data.length}</b> data gangguan
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Aman: {stats.aman}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Bermasalah: {stats.bermasalah}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Kadang Ngelag: {stats.ngelag}
            </span>
          </div>
        </div>
      </div>

      {/* Modal Add / Edit Gangguan */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div>
                <h3 className="font-extrabold text-lg text-gray-900">
                  {editingItem ? "Edit Data Gangguan" : "Tambah Laporan Gangguan"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Format sesuai catatan sheet tim WiFi</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nama Pelanggan */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Nama Pelanggan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Mohammad Yunus / Pak Budi"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                />
              </div>

              {/* Keterangan Kendala */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Keterangan Kendala / Teknisi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Lelet/Restart, LOS/Iqbal, Wifi Tidak Ada Koneksi"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none mb-2"
                />
                {/* Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {KENDALA_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setFormData({ ...formData, keterangan: preset })}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-medium transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kontak WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Kontak (No. WhatsApp / HP)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Contoh: 6289693923263 / 0812..."
                    value={formData.kontak}
                    onChange={(e) => setFormData({ ...formData, kontak: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Tanggal Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Tanggal Mulai
                  </label>
                  <input
                    type="text"
                    placeholder="Format: 21-7-26"
                    value={formData.tanggalMulai}
                    onChange={(e) => setFormData({ ...formData, tanggalMulai: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Tanggal Follow-Up
                  </label>
                  <input
                    type="text"
                    placeholder="Format: 27-7-26"
                    value={formData.followUp}
                    onChange={(e) => setFormData({ ...formData, followUp: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Hasil FU */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Hasil Follow-Up
                </label>
                <select
                  value={formData.hasilFU}
                  onChange={(e) => setFormData({ ...formData, hasilFU: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-semibold"
                >
                  <option value="">(Belum Ada Hasil / Pending)</option>
                  <option value="Aman">🟢 Aman (Normal / Beres)</option>
                  <option value="Bermasalah">🔴 Bermasalah (Perlu Penanganan Lanjut)</option>
                  <option value="Kadang Ngelag">🟡 Kadang Ngelag (Pantau)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold hover:shadow-md active:scale-95 transition-all shadow-sm"
                >
                  {editingItem ? "Simpan Perubahan" : "Tambahkan Gangguan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg text-gray-900 mb-1">Hapus Data Gangguan?</h3>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Laporan gangguan atas nama <b>{deleteConfirm.nama}</b> akan dihapus dari sistem.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 shadow-md active:scale-95 transition-all"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
