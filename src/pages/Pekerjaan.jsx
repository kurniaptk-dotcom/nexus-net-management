import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Wrench,
  LayoutGrid,
  List,
  GripVertical,
  Clock,
  Calendar,
  CheckCircle,
  CalendarDays,
  XCircle,
  Network,
  Users,
  UserMinus,
  ArrowUpRight,
  Phone,
  FileText,
  X,
} from "lucide-react";
import { pekerjaanList, timList, jenisPekerjaan, statusPekerjaan, odpOdcList, pengajuanPemutusanList } from "../data/mockData";
import { generatePekerjaanNotification } from "../store/notificationStore";
import { usePersistState } from "../hooks/usePersistState";
import CalendarView from "../components/CalendarView";

function notify(notif) {
  if (window.__addNotification) window.__addNotification(notif);
}

const KANBAN_COLUMNS = [
  { key: "WAITING LIST", label: "Waiting List", color: "#F59E0B", bg: "bg-amber-50", border: "border-amber-200", icon: Clock },
  { key: "DIJADWALKAN", label: "Dijadwalkan", color: "#3B82F6", bg: "bg-blue-50", border: "border-blue-200", icon: Calendar },
  { key: "SELESAI", label: "Selesai", color: "#10B981", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle },
  { key: "GAGAL", label: "Gagal", color: "#EF4444", bg: "bg-red-50", border: "border-red-200", icon: XCircle },
];

const jenisColors = {
  PEMASANGAN: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200", dot: "bg-blue-500" },
  PERBAIKAN: { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200", dot: "bg-orange-500" },
  PEMUTUSAN: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200", dot: "bg-red-500" },
  "PERBAIKAN KHUSUS (ODP/ODC)": { bg: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-200", dot: "bg-purple-500" },
};

function StatusBadge({ status }) {
  const styles = {
    SELESAI: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    "WAITING LIST": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    DIJADWALKAN: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    GAGAL: "bg-red-50 text-red-700 ring-1 ring-red-200",
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${styles[status] || "bg-gray-50 text-gray-700 ring-1 ring-gray-200"}`}>
      {status}
    </span>
  );
}

function JenisBadge({ jenis }) {
  const styles = {
    PEMASANGAN: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    PERBAIKAN: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    PEMUTUSAN: "bg-red-50 text-red-700 ring-1 ring-red-200",
    "PERBAIKAN KHUSUS (ODP/ODC)": "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${styles[jenis] || "bg-gray-50 text-gray-700 ring-1 ring-gray-200"}`}>
      {jenis}
    </span>
  );
}

function KanbanCard({ item, onEdit, onDelete, onDragStart, onDragEnd }) {
  const jc = jenisColors[item.jenis] || jenisColors.PEMASANGAN;
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onDragEnd={onDragEnd}
      className="bg-white rounded-xl border border-gray-200 p-4 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-300 transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${jc.bg} ring-1 ${jc.ring}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${jc.dot}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wide ${jc.text}`}>
            {item.jenis}
          </span>
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-[#0D1B4A]"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <h4 className="font-bold text-gray-800 text-sm mb-1">{item.pelanggan || "Tanpa Nama"}</h4>
      <p className="text-xs text-gray-400 mb-2 line-clamp-2">{item.alamat || "Alamat belum diatur"}</p>
      {item.odp && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-700 bg-blue-50/80 px-2 py-1 rounded-lg mb-2 border border-blue-100/80">
          <Network className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="truncate">{item.odp}</span>
        </div>
      )}
      {item.userTerdampak ? (
        <div className="flex items-center justify-between text-[11px] font-semibold text-purple-700 bg-purple-50/90 px-2 py-1 rounded-lg mb-2 border border-purple-100">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>{item.userTerdampak} User Terdampak</span>
          </span>
          {item.tanggalSelesai && (
            <span className="text-[10px] text-purple-500 font-normal">Selesai: {item.tanggalSelesai}</span>
          )}
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#0D1B4A]/5 text-[#0D1B4A] font-bold">
          {item.tim ? item.tim.split(" - ")[0] : "-"}
        </span>
        <span className="text-[10px] text-gray-400 font-medium">{item.tanggal || "-"}</span>
      </div>
      {item.keterangan && (
        <p className="text-[11px] text-gray-400 mt-2.5 pt-2.5 border-t border-gray-100 line-clamp-1">
          {item.keterangan}
        </p>
      )}
    </div>
  );
}

export default function Pekerjaan() {
  const [data, setData] = usePersistState("xnet_pekerjaan", pekerjaanList);
  const [timData] = usePersistState("xnet_tim", timList);
  const [odpData] = usePersistState("xnet_odpodc", odpOdcList);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [prevQuery, setPrevQuery] = useState(searchParams.get("search"));
  if (searchParams.get("search") !== prevQuery) {
    setPrevQuery(searchParams.get("search"));
    setSearch(searchParams.get("search") || "");
  }
  const [filterJenis, setFilterJenis] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterTim, setFilterTim] = useState("ALL");
  const [viewMode, setViewMode] = useState("kanban");
  const [mobileKanbanCol, setMobileKanbanCol] = useState("ALL");
  const [activeTab, setActiveTab] = useState("pekerjaan");
  const [pengajuanData, setPengajuanData] = usePersistState("xnet_pengajuan_pemutusan", pengajuanPemutusanList);
  const [searchPemutusan, setSearchPemutusan] = useState("");
  const [showAddPemutusanModal, setShowAddPemutusanModal] = useState(false);
  const [pemutusanForm, setPemutusanForm] = useState({
    nama: "",
    kontak: "",
    alasan: "",
    tanggal: new Date().toISOString().split("T")[0],
  });
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [formData, setFormData] = useState({
    tim: "",
    jenis: "PEMASANGAN",
    pelanggan: "",
    alamat: "",
    odc: "",
    odp: "",
    userTerdampak: "",
    tanggalSelesai: "",
    status: "WAITING LIST",
    tanggal: "",
    keterangan: "",
  });

  const odcList = useMemo(() => {
    const odcs = Array.from(new Set((odpData || []).map((o) => o.odc))).filter(Boolean);
    return odcs.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });
  }, [odpData]);

  const availableOdps = useMemo(() => {
    if (!formData.odc) return [];
    return (odpData || []).filter((o) => o.odc === formData.odc);
  }, [odpData, formData.odc]);

  const groupedOdp = useMemo(() => {
    const groups = {};
    (odpData || []).forEach((item) => {
      const key = item.odc || "Lainnya";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [odpData]);

  const filtered = data.filter((item) => {
    const q = (search || "").toLowerCase().trim();
    const matchSearch =
      !q ||
      (item.pelanggan && item.pelanggan.toLowerCase().includes(q)) ||
      (item.alamat && item.alamat.toLowerCase().includes(q)) ||
      (item.odp && item.odp.toLowerCase().includes(q)) ||
      (item.keterangan && item.keterangan.toLowerCase().includes(q));
    const matchJenis = filterJenis === "ALL" || item.jenis === filterJenis;
    const matchStatus = filterStatus === "ALL" || item.status === filterStatus;
    const matchTim = filterTim === "ALL" || item.tim === filterTim;
    return matchSearch && matchJenis && matchStatus && matchTim;
  });

  const stats = {
    total: data.length,
    selesai: data.filter((d) => d.status === "SELESAI").length,
    waiting: data.filter((d) => d.status === "WAITING LIST").length,
    dijadwalkan: data.filter((d) => d.status === "DIJADWALKAN").length,
    gagal: data.filter((d) => d.status === "GAGAL").length,
  };

  const handleAdd = (defaultJenis = "PEMASANGAN") => {
    setEditingItem(null);
    setFormData({
      tim: timData[0]?.nama || "",
      jenis: defaultJenis,
      pelanggan: "",
      alamat: "",
      odc: "",
      odp: "",
      userTerdampak: "",
      tanggalSelesai: "",
      status: "WAITING LIST",
      tanggal: new Date().toISOString().split("T")[0],
      keterangan: "",
    });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    let inferredOdc = item.odc || "";
    let inferredOdp = item.odp || "";
    if (inferredOdp.includes(" - ")) {
      const parts = inferredOdp.split(" - ");
      if (!inferredOdc) inferredOdc = parts[0];
      inferredOdp = parts.slice(1).join(" - ");
    }
    setFormData({
      tim: item.tim,
      jenis: item.jenis,
      pelanggan: item.pelanggan,
      alamat: item.alamat,
      odc: inferredOdc,
      odp: inferredOdp,
      userTerdampak: item.userTerdampak ?? "",
      tanggalSelesai: item.tanggalSelesai || "",
      status: item.status,
      tanggal: item.tanggal,
      keterangan: item.keterangan || "",
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm("Hapus pekerjaan ini?")) {
      const item = data.find((d) => d.id === id);
      setData(data.filter((d) => d.id !== id));
      if (item) notify(generatePekerjaanNotification(item, "dihapus"));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let finalPayload = { ...formData };
    if (formData.jenis === "PERBAIKAN KHUSUS (ODP/ODC)") {
      if (!formData.odc) {
        alert("Silakan pilih ODC terlebih dahulu!");
        return;
      }
      const odpLabel = formData.odp ? `${formData.odc} - ${formData.odp}` : formData.odc;
      finalPayload.odp = odpLabel;
      finalPayload.pelanggan = formData.pelanggan || `Perbaikan ${odpLabel}`;
      finalPayload.alamat = formData.alamat || `Area Distribusi ${formData.odc}`;
      finalPayload.userTerdampak = formData.userTerdampak ? Number(formData.userTerdampak) : 0;
      finalPayload.tanggalSelesai = formData.tanggalSelesai || "";
    }

    if (editingItem) {
      setData(data.map((d) => (d.id === editingItem.id ? { ...d, ...finalPayload } : d)));
      notify(generatePekerjaanNotification({ ...editingItem, ...finalPayload }, "diperbarui"));
    } else {
      const newItem = { id: Date.now(), ...finalPayload };
      setData([...data, newItem]);
      notify(generatePekerjaanNotification(newItem, "ditambahkan"));
    }
    setShowModal(false);
  };

  const filteredPemutusan = useMemo(() => {
    const q = (searchPemutusan || "").toLowerCase().trim();
    if (!q) return pengajuanData || [];
    return (pengajuanData || []).filter((item) => {
      return (
        (item.nama && item.nama.toLowerCase().includes(q)) ||
        (item.kontak && item.kontak.toLowerCase().includes(q)) ||
        (item.alasan && item.alasan.toLowerCase().includes(q)) ||
        (item.tanggal && item.tanggal.toLowerCase().includes(q))
      );
    });
  }, [pengajuanData, searchPemutusan]);

  const handleDisposisiKePekerjaan = (item) => {
    setEditingItem(null);
    let inferredOdp = "";
    if (item.nama && item.nama.includes("-")) {
      inferredOdp = item.nama.split("-")[0].trim();
    }
    setFormData({
      tim: timData[0]?.nama || "GATRA - AIS",
      jenis: "PEMUTUSAN",
      pelanggan: item.nama,
      alamat: inferredOdp ? `Area Distribusi ${inferredOdp}` : "Alamat pelanggan",
      odc: "",
      odp: inferredOdp,
      userTerdampak: "",
      tanggalSelesai: "",
      status: "WAITING LIST",
      tanggal: item.tanggal || new Date().toISOString().split("T")[0],
      keterangan: `Pengajuan Pemutusan: ${item.alasan || "-"} | Kontak: ${item.kontak || "-"}`,
    });
    setActiveTab("pekerjaan");
    setShowModal(true);
  };

  const handleDeletePemutusan = (id) => {
    if (confirm("Hapus data pengajuan pemutusan ini?")) {
      setPengajuanData((prev) => (prev || []).filter((p) => p.id !== id));
    }
  };

  const handleSavePemutusan = (e) => {
    e.preventDefault();
    if (!pemutusanForm.nama.trim()) {
      alert("Nama pelanggan / ODP wajib diisi!");
      return;
    }
    const newItem = {
      id: Date.now(),
      nama: pemutusanForm.nama.trim(),
      kontak: pemutusanForm.kontak.trim(),
      alasan: pemutusanForm.alasan.trim(),
      tanggal: pemutusanForm.tanggal || new Date().toISOString().split("T")[0],
    };
    setPengajuanData((prev) => [newItem, ...(prev || [])]);
    setShowAddPemutusanModal(false);
    setPemutusanForm({
      nama: "",
      kontak: "",
      alasan: "",
      tanggal: new Date().toISOString().split("T")[0],
    });
  };

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id.toString());
    setTimeout(() => {
      e.target.style.opacity = "0.4";
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = "1";
    setDraggedId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(colKey);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData("text/plain"));
    setData((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item && item.status !== targetStatus) {
        notify(generatePekerjaanNotification({ ...item, status: targetStatus }, "status"));
      }
      return prev.map((item) =>
        item.id === id ? { ...item, status: targetStatus } : item
      );
    });
    setDraggedId(null);
    setDragOverCol(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Pekerjaan & Disposisi</h1>
          <p className="text-gray-500 text-sm mt-0.5">Kelola antrian teknisi lapangan dan pengajuan pemutusan pelanggan</p>
        </div>
      </div>

      {/* Primary Tab Switcher */}
      <div className="flex border-b border-gray-200 gap-3 sm:gap-6 overflow-x-auto no-scrollbar whitespace-nowrap">
        <button
          onClick={() => setActiveTab("pekerjaan")}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === "pekerjaan"
              ? "border-[#0D1B4A] text-[#0D1B4A]"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Wrench className="w-4 h-4 shrink-0" />
          <span>Pekerjaan Lapangan</span>
          <span className="ml-1 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-extrabold">
            {data.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("pemutusan")}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === "pemutusan"
              ? "border-red-500 text-red-600"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <UserMinus className="w-4 h-4 shrink-0" />
          <span>Pengajuan Pemutusan Masuk</span>
          <span className="ml-1 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-extrabold">
            {pengajuanData?.length || 0}
          </span>
        </button>
      </div>

      {activeTab === "pekerjaan" ? (
        <>
          {/* Controls: View Mode & Add */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="bg-white border border-gray-200 rounded-xl flex p-1 shadow-sm w-full sm:w-auto">
              <button
                onClick={() => setViewMode("kanban")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  viewMode === "kanban"
                    ? "bg-[#0D1B4A] text-white shadow-md font-bold"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Board
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-[#0D1B4A] text-white shadow-md font-bold"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <List className="w-4 h-4" />
                Tabel
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  viewMode === "calendar"
                    ? "bg-[#0D1B4A] text-white shadow-md font-bold"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Kalender
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleAdd("PERBAIKAN KHUSUS (ODP/ODC)")}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold hover:shadow-md transition-all truncate cursor-pointer active:scale-95"
              >
                <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>+ ODP/ODC</span>
              </button>
              <button
                onClick={() => handleAdd("PEMASANGAN")}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-[#F59E0B] hover:bg-[#d97706] text-white px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold hover:shadow-md transition-all shrink-0 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Tambah</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-4">
            {[
              { label: "Total", value: stats.total, color: "text-gray-900", bg: "bg-white" },
              { label: "Selesai", value: stats.selesai, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Dijadwalkan", value: stats.dijadwalkan, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Waiting", value: stats.waiting, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Gagal", value: stats.gagal, color: "text-red-600", bg: "bg-red-50" },
            ].map((s) => (
              <div
                key={s.label}
                className={`${s.bg} rounded-2xl p-3 sm:p-4 border border-gray-100 last:col-span-2 sm:last:col-span-1 shadow-2xs`}
              >
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
                <p className={`text-xl sm:text-2xl font-black ${s.color} mt-0.5 sm:mt-1`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-sm grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 sm:gap-3">
            <div className="col-span-2 sm:col-span-1 sm:flex-1 min-w-0 sm:min-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari pelanggan / alamat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none transition-all"
              />
            </div>
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="px-2.5 sm:px-3 py-2 sm:py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#F59E0B] outline-none bg-white cursor-pointer"
            >
              <option value="ALL">Semua Jenis</option>
              {jenisPekerjaan.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
            <select
              value={filterTim}
              onChange={(e) => setFilterTim(e.target.value)}
              className="px-2.5 sm:px-3 py-2 sm:py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#F59E0B] outline-none bg-white cursor-pointer"
            >
              <option value="ALL">Semua Tim</option>
              {timData.map((t) => (
                <option key={t.id} value={t.nama}>{t.nama}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="col-span-2 sm:col-span-1 px-2.5 sm:px-3 py-2 sm:py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#F59E0B] outline-none bg-white cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              {statusPekerjaan.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Kanban Board */}
          {viewMode === "kanban" && (
            <div>
              {/* Mobile Column Tabs Filter */}
              <div className="md:hidden flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl mb-3 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setMobileKanbanCol("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    mobileKanbanCol === "ALL"
                      ? "bg-[#0D1B4A] text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Semua Kolom
                </button>
                {KANBAN_COLUMNS.map((col) => {
                  const count = filtered.filter((item) => item.status === col.key).length;
                  return (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => setMobileKanbanCol(col.key)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                        mobileKanbanCol === col.key
                          ? "bg-[#0D1B4A] text-white shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <span>{col.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                          mobileKanbanCol === col.key ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Kanban Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {KANBAN_COLUMNS.filter(
                  (col) => mobileKanbanCol === "ALL" || col.key === mobileKanbanCol
                ).map((col) => {
                  const colItems = filtered.filter((item) => item.status === col.key);
                  const Icon = col.icon;
                  const isOver = dragOverCol === col.key;
                  return (
                    <div
                      key={col.key}
                      onDragOver={(e) => handleDragOver(e, col.key)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, col.key)}
                      className={`rounded-2xl border-2 border-dashed transition-all duration-200 min-h-[280px] md:min-h-[400px] ${
                        isOver
                          ? "shadow-lg scale-[1.01]"
                          : "border-gray-200 bg-gray-50/50"
                      }`}
                      style={isOver ? { borderColor: col.color, backgroundColor: col.color + "08" } : {}}
                    >
                      {/* Column Header */}
                      <div className={`px-4 py-3.5 border-b ${col.border} ${col.bg} rounded-t-2xl`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: col.color + "15" }}>
                              <Icon className="w-4 h-4" style={{ color: col.color }} />
                            </div>
                            <span className="font-bold text-sm text-gray-700">{col.label}</span>
                          </div>
                          <span
                            className="text-xs font-bold px-2.5 py-0.5 rounded-lg text-white"
                            style={{ backgroundColor: col.color }}
                          >
                            {colItems.length}
                          </span>
                        </div>
                      </div>

                      {/* Cards */}
                      <div className="p-3 space-y-3">
                        {colItems.map((item) => (
                          <KanbanCard
                            key={item.id}
                            item={item}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                          />
                        ))}
                        {colItems.length === 0 && (
                          <div className="text-center py-10 text-gray-300">
                            <GripVertical className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="text-xs font-medium">Belum ada pekerjaan di kolom ini</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Calendar View */}
          {viewMode === "calendar" && (
            <CalendarView data={filtered} />
          )}

          {/* Table View */}
          {viewMode === "table" && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-gray-100">
                {filtered.map((item, idx) => (
                  <div key={item.id} className="p-3.5 space-y-2 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-400">#{idx + 1}</span>
                          <h4 className="font-bold text-gray-900 text-sm truncate">{item.pelanggan || "Tanpa Nama"}</h4>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.alamat || "-"}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <JenisBadge jenis={item.jenis} />
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#0D1B4A]/5 text-[#0D1B4A] font-bold">
                        {item.tim ? item.tim.split(" - ")[0] : "-"}
                      </span>
                      {item.odp && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 truncate max-w-[170px]">
                          <Network className="w-3 h-3 text-blue-500 shrink-0" />
                          {item.odp}
                        </span>
                      )}
                      {item.userTerdampak ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                          <Users className="w-3 h-3 text-purple-600 shrink-0" />
                          {item.userTerdampak} User
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400 pt-1.5 border-t border-gray-50">
                      <span className="font-medium">{item.tanggal || "-"}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#0D1B4A] transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">No</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Tim</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Jenis</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Pelanggan / Target</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Alamat</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">ODP / ODC</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Terdampak</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Tanggal</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                      <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((item, i) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 text-gray-400 font-medium">{i + 1}</td>
                        <td className="px-5 py-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#0D1B4A]/5 text-[#0D1B4A] font-bold">
                            {item.tim ? item.tim.split(" - ")[0] : "-"}
                          </span>
                        </td>
                        <td className="px-5 py-3"><JenisBadge jenis={item.jenis} /></td>
                        <td className="px-5 py-3 font-bold text-gray-800">{item.pelanggan || "Tanpa Nama"}</td>
                        <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">{item.alamat || "-"}</td>
                        <td className="px-5 py-3">
                          {item.odp ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                              <Network className="w-3 h-3 text-blue-500 shrink-0" />
                              <span className="truncate max-w-[150px]">{item.odp}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {item.userTerdampak ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                              <Users className="w-3 h-3 text-purple-600 shrink-0" />
                              {item.userTerdampak}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-500 font-medium">{item.tanggal}</td>
                        <td className="px-5 py-3"><StatusBadge status={item.status} /></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#0D1B4A] transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Tidak ada data pekerjaan</p>
                </div>
              )}
            </div>
          )}
        </>
  ) : (
    <div className="space-y-4">
      {/* Card Summary Banner */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-5 border border-red-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <UserMinus className="w-5 h-5 text-red-500" />
            Antrian Pengajuan Pemutusan Pelanggan ({pengajuanData?.length || 0})
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Data permohonan pemutusan riil dari pelanggan. Klik <b>"Disposisi ke Tim"</b> untuk menugaskan teknisi lapangan mencopot kabel / perangkat modem.
          </p>
        </div>
        <button
          onClick={() => setShowAddPemutusanModal(true)}
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          + Input Pengajuan Baru
        </button>
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama pelanggan, ODP, alasan, atau kontak..."
            value={searchPemutusan}
            onChange={(e) => setSearchPemutusan(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">No</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Pelanggan / Target ODP</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Kontak</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Tanggal</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Alasan Pemutusan</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPemutusan.map((item, i) => (
                <tr key={item.id || i} className="hover:bg-red-50/20 transition-colors">
                  <td className="px-5 py-3 text-gray-400 font-medium">{i + 1}</td>
                  <td className="px-5 py-3">
                    <div className="font-bold text-gray-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                      <span>{item.nama || "-"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600 font-medium">
                    {item.kontak ? (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {item.kontak}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {item.tanggal || "-"}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium bg-red-50 text-red-700 border border-red-100 px-2.5 py-1 rounded-lg inline-block max-w-[300px] truncate">
                      {item.alasan || "Pengajuan pemutusan layanan"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleDisposisiKePekerjaan(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0D1B4A] hover:bg-[#0D1B4A]/90 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                        title="Buat tiket pekerjaan pemutusan untuk teknisi"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Disposisi ke Tim</span>
                      </button>
                      <button
                        onClick={() => handleDeletePemutusan(item.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Hapus Pengajuan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPemutusan.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <UserMinus className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-sm">Tidak ada antrian pengajuan pemutusan</p>
          </div>
        )}
      </div>
    </div>
  )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingItem ? "Edit Pekerjaan" : "Tambah Pekerjaan Baru"}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formData.jenis === "PERBAIKAN KHUSUS (ODP/ODC)" ? (
                <>
                  {/* Banner Info Khusus */}
                  <div className="bg-purple-50 border border-purple-200/80 rounded-xl p-3.5 flex items-start gap-3">
                    <div className="p-2 bg-purple-100 text-purple-700 rounded-lg shrink-0">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wide flex items-center gap-1.5">
                        Form Khusus Perbaikan ODP / ODC
                        <span className="text-[10px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-semibold">Khusus Jaringan</span>
                      </h4>
                      <p className="text-[11px] text-purple-700/90 mt-0.5">
                        Form khusus penanganan gangguan perangkat distribusi fiber optik.
                      </p>
                    </div>
                  </div>

                  {/* Tim & Jenis */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                        TIM TEKNISI <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.tim}
                        onChange={(e) => setFormData({ ...formData, tim: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                      >
                        {timData.map((t) => (
                          <option key={t.id} value={t.nama}>{t.nama}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                        JENIS PEKERJAAN
                      </label>
                      <select
                        value={formData.jenis}
                        onChange={(e) => setFormData({ ...formData, jenis: e.target.value })}
                        className="w-full px-4 py-2.5 border border-purple-300 bg-purple-50/40 rounded-xl text-sm font-semibold text-purple-900 focus:ring-2 focus:ring-purple-400 outline-none"
                      >
                        {jenisPekerjaan.map((j) => (
                          <option key={j} value={j}>{j}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Cascading ODC -> ODP */}
                  <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200/70 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                      <span className="flex items-center gap-1.5">
                        <Network className="w-4 h-4 text-purple-700" />
                        PILIH JARINGAN (ODC & ODP)
                      </span>
                      <span className="text-[10px] font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                        Wajib Diisi
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                          <span>1. Pilih ODC <span className="text-red-500">*</span></span>
                          <span className="text-[10px] text-purple-600 font-normal">{odcList.length} ODC</span>
                        </label>
                        <select
                          value={formData.odc}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              odc: e.target.value,
                              odp: "", // reset odp ketika odc berganti
                            });
                          }}
                          className="w-full px-3.5 py-2.5 bg-white border border-purple-200 rounded-xl text-sm font-medium text-gray-800 focus:ring-2 focus:ring-purple-400 outline-none"
                          required
                        >
                          <option value="">-- Pilih ODC --</option>
                          {odcList.map((odc) => (
                            <option key={odc} value={odc}>{odc}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                          <span>2. Pilih ODP <span className="text-red-500">*</span></span>
                          {formData.odc && (
                            <span className="text-[10px] text-purple-600 font-normal">{availableOdps.length} titik</span>
                          )}
                        </label>
                        <select
                          value={formData.odp}
                          disabled={!formData.odc}
                          onChange={(e) => setFormData({ ...formData, odp: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium outline-none transition-all ${
                            !formData.odc
                              ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                              : "bg-white text-gray-800 border border-purple-200 focus:ring-2 focus:ring-purple-400"
                          }`}
                          required
                        >
                          <option value="">
                            {!formData.odc ? "-- Pilih ODC Dulu --" : "-- Pilih ODP --"}
                          </option>
                          {availableOdps.map((odp) => (
                            <option key={odp.id} value={odp.nama}>
                              {odp.nama} {odp.keterangan ? `(${odp.keterangan})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {!formData.odc && (
                      <p className="text-[11px] text-amber-600 font-medium">
                        ⚠️ Silakan pilih ODC terlebih dahulu untuk menampilkan daftar ODP di bawahnya.
                      </p>
                    )}
                  </div>

                  {/* Tanggal Perbaikan & Tanggal Selesai */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                        TANGGAL PERBAIKAN <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.tanggal}
                        onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center justify-between">
                        <span>TANGGAL SELESAI</span>
                        <span className="text-[10px] text-gray-400 font-normal">Opsional</span>
                      </label>
                      <input
                        type="date"
                        value={formData.tanggalSelesai}
                        onChange={(e) => setFormData({ ...formData, tanggalSelesai: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                      />
                    </div>
                  </div>

                  {/* Jumlah User Terdampak & Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-purple-600" />
                          USER TERDAMPAK
                        </span>
                        <span className="text-[10px] text-gray-400 font-normal">Estimasi</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          placeholder="Contoh: 16"
                          value={formData.userTerdampak}
                          onChange={(e) => setFormData({ ...formData, userTerdampak: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none pr-14"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                          User
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                        STATUS PEKERJAAN
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                      >
                        {statusPekerjaan.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Keterangan */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      KETERANGAN KENDALA & TINDAKAN
                    </label>
                    <textarea
                      value={formData.keterangan}
                      onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none resize-none"
                      rows={3}
                      placeholder="Deskripsikan kendala teknis (redaman tinggi, kabel putus, dsb.) dan penanganan yang dilakukan..."
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Form Standar (Pemasangan, Perbaikan Pelanggan, Pemutusan) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tim</label>
                      <select
                        value={formData.tim}
                        onChange={(e) => setFormData({ ...formData, tim: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none"
                      >
                        {timData.map((t) => (
                          <option key={t.id} value={t.nama}>{t.nama}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Jenis</label>
                      <select
                        value={formData.jenis}
                        onChange={(e) => setFormData({ ...formData, jenis: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none"
                      >
                        {jenisPekerjaan.map((j) => (
                          <option key={j} value={j}>{j}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pelanggan</label>
                    <input
                      type="text"
                      value={formData.pelanggan}
                      onChange={(e) => setFormData({ ...formData, pelanggan: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Alamat</label>
                    <input
                      type="text"
                      value={formData.alamat}
                      onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Network className="w-4 h-4 text-blue-600" />
                        Informasi ODP / ODC
                      </span>
                      <span className="text-[11px] font-normal text-gray-400">Opsional</span>
                    </label>
                    <select
                      value={formData.odp}
                      onChange={(e) => setFormData({ ...formData, odp: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] bg-white text-gray-800 outline-none"
                    >
                      <option value="">-- Pilih ODP / ODC --</option>
                      {Object.entries(groupedOdp).map(([odcGroup, items]) => (
                        <optgroup key={odcGroup} label={`📁 ${odcGroup}`}>
                          {items.map((odp) => (
                            <option key={odp.id} value={`${odp.odc} - ${odp.nama}`}>
                              {odp.odc} - {odp.nama} {odp.status ? `(${odp.status})` : ""}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tanggal</label>
                      <input
                        type="date"
                        value={formData.tanggal}
                        onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none"
                      >
                        {statusPekerjaan.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Keterangan</label>
                    <textarea
                      value={formData.keterangan}
                      onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none resize-none"
                      rows={2}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all shadow-md ${
                    formData.jenis === "PERBAIKAN KHUSUS (ODP/ODC)"
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "bg-[#F59E0B] hover:bg-[#d97706]"
                  }`}
                >
                  Simpan Pekerjaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Pengajuan Pemutusan */}
      {showAddPemutusanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserMinus className="w-5 h-5 text-red-500" />
                Tambah Pengajuan Pemutusan
              </h3>
              <button
                onClick={() => setShowAddPemutusanModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePemutusan} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Nama Pelanggan / Format ODP
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ODP.1.2-Yusmin"
                  value={pemutusanForm.nama}
                  onChange={(e) => setPemutusanForm({ ...pemutusanForm, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Nomor Kontak / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789"
                  value={pemutusanForm.kontak}
                  onChange={(e) => setPemutusanForm({ ...pemutusanForm, kontak: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Tanggal Pengajuan
                </label>
                <input
                  type="date"
                  value={pemutusanForm.tanggal}
                  onChange={(e) => setPemutusanForm({ ...pemutusanForm, tanggal: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Alasan Pemutusan
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Pindah rumah ke luar kota / Kendala biaya"
                  value={pemutusanForm.alasan}
                  onChange={(e) => setPemutusanForm({ ...pemutusanForm, alasan: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPemutusanModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md shadow-red-200"
                >
                  Simpan Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
