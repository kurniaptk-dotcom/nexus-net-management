import { useState } from "react";
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
  Filter,
  Download,
  CalendarDays,
  XCircle,
} from "lucide-react";
import { pekerjaanList, timList, jenisPekerjaan, statusPekerjaan } from "../data/mockData";
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
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${styles[jenis] || "bg-gray-50 text-gray-700 ring-1 ring-gray-200"}`}>
      {jenis}
    </span>
  );
}

function KanbanCard({ item, onEdit, onDelete, onDragStart }) {
  const jc = jenisColors[item.jenis] || jenisColors.PEMASANGAN;
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
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
      <h4 className="font-bold text-gray-800 text-sm mb-1">{item.pelanggan}</h4>
      <p className="text-xs text-gray-400 mb-3 line-clamp-2">{item.alamat}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#0D1B4A]/5 text-[#0D1B4A] font-bold">
          {item.tim.split(" - ")[0]}
        </span>
        <span className="text-[10px] text-gray-400 font-medium">{item.tanggal}</span>
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
  const [search, setSearch] = useState("");
  const [filterJenis, setFilterJenis] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterTim, setFilterTim] = useState("ALL");
  const [viewMode, setViewMode] = useState("kanban");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [formData, setFormData] = useState({
    tim: "",
    jenis: "PEMASANGAN",
    alamat: "",
    pelanggan: "",
    status: "WAITING LIST",
    tanggal: "",
    keterangan: "",
  });

  const filtered = data.filter((item) => {
    const matchSearch =
      item.pelanggan.toLowerCase().includes(search.toLowerCase()) ||
      item.alamat.toLowerCase().includes(search.toLowerCase());
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

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      tim: timList[0]?.nama || "",
      jenis: "PEMASANGAN",
      alamat: "",
      pelanggan: "",
      status: "WAITING LIST",
      tanggal: new Date().toISOString().split("T")[0],
      keterangan: "",
    });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      tim: item.tim,
      jenis: item.jenis,
      alamat: item.alamat,
      pelanggan: item.pelanggan,
      status: item.status,
      tanggal: item.tanggal,
      keterangan: item.keterangan,
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
    if (editingItem) {
      setData(data.map((d) => (d.id === editingItem.id ? { ...d, ...formData } : d)));
      notify(generatePekerjaanNotification({ ...editingItem, ...formData }, "diperbarui"));
    } else {
      const newItem = { id: Date.now(), ...formData };
      setData([...data, newItem]);
      notify(generatePekerjaanNotification(newItem, "ditambahkan"));
    }
    setShowModal(false);
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
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Pekerjaan</h1>
          <p className="text-gray-500 text-sm mt-0.5">Drag & drop untuk ubah status pekerjaan</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white border border-gray-200 rounded-xl flex p-1 shadow-sm">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                viewMode === "kanban"
                  ? "bg-[#0D1B4A] text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Board
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                viewMode === "table"
                  ? "bg-[#0D1B4A] text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <List className="w-4 h-4" />
              Tabel
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                viewMode === "calendar"
                  ? "bg-[#0D1B4A] text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Kalender
            </button>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-[#F59E0B] to-[#F97316] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-gray-900", bg: "bg-white" },
          { label: "Selesai", value: stats.selesai, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Dijadwalkan", value: stats.dijadwalkan, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Waiting", value: stats.waiting, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Gagal", value: stats.gagal, color: "text-red-600", bg: "bg-red-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-gray-100`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-extrabold ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari pelanggan / alamat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none transition-all"
          />
        </div>
        <select
          value={filterJenis}
          onChange={(e) => setFilterJenis(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F59E0B] outline-none"
        >
          <option value="ALL">Semua Jenis</option>
          {jenisPekerjaan.map((j) => (
            <option key={j} value={j}>{j}</option>
          ))}
        </select>
        <select
          value={filterTim}
          onChange={(e) => setFilterTim(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F59E0B] outline-none"
        >
          <option value="ALL">Semua Tim</option>
          {timList.map((t) => (
            <option key={t.id} value={t.nama}>{t.nama}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F59E0B] outline-none"
        >
          <option value="ALL">Semua Status</option>
          {statusPekerjaan.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Kanban Board */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colItems = filtered.filter((item) => item.status === col.key);
            const Icon = col.icon;
            const isOver = dragOverCol === col.key;
            return (
              <div
                key={col.key}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.key)}
                className={`rounded-2xl border-2 border-dashed transition-all duration-200 min-h-[400px] ${
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
                    />
                  ))}
                  {colItems.length === 0 && (
                    <div className="text-center py-10 text-gray-300">
                      <GripVertical className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs font-medium">Drop pekerjaan ke sini</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <CalendarView data={filtered} />
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">No</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Tim</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Jenis</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Pelanggan</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Alamat</th>
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
                        {item.tim.split(" - ")[0]}
                      </span>
                    </td>
                    <td className="px-5 py-3"><JenisBadge jenis={item.jenis} /></td>
                    <td className="px-5 py-3 font-bold text-gray-800">{item.pelanggan}</td>
                    <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">{item.alamat}</td>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tim</label>
                  <select
                    value={formData.tim}
                    onChange={(e) => setFormData({ ...formData, tim: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none"
                  >
                    {timList.map((t) => (
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
                  className="px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-[#F59E0B] to-[#F97316] text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
