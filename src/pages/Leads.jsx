import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Target,
  Phone,
  MapPin,
  Calendar,
  Users,
  UserPlus,
  Clock,
  CheckCircle2,
  MessageCircle,
  Sparkles,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { leadsList, sumberLeads } from "../data/mockData";
import { generateLeadsNotification } from "../store/notificationStore";
import { usePersistState } from "../hooks/usePersistState";

function notify(notif) {
  if (window.__addNotification) window.__addNotification(notif);
}

function StatusBadge({ status }) {
  const styles = {
    BARU: "bg-blue-50 text-blue-700 border-blue-200",
    KONTAK: "bg-amber-50 text-amber-700 border-amber-200",
    DIJADWALKAN: "bg-purple-50 text-purple-700 border-purple-200",
    SELESAI: "bg-emerald-50 text-emerald-700 border-emerald-200",
    BATAL: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
        styles[status] || "bg-gray-50 text-gray-700 border-gray-200"
      }`}
    >
      {status}
    </span>
  );
}

function SumberBadge({ sumber }) {
  const styles = {
    IKLAN: "bg-sky-50 text-sky-700 border-sky-200",
    AFFILIATE: "bg-indigo-50 text-indigo-700 border-indigo-200",
    MARKETING: "bg-orange-50 text-orange-700 border-orange-200",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
        styles[sumber] || "bg-gray-50 text-gray-700 border-gray-200"
      }`}
    >
      {sumber}
    </span>
  );
}

const statusOptions = ["BARU", "KONTAK", "DIJADWALKAN", "SELESAI"];

export default function Leads() {
  const [data, setData] = usePersistState("xnet_leads", leadsList);
  const [search, setSearch] = useState("");
  const [filterSumber, setFilterSumber] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    nama: "",
    sumber: "IKLAN",
    status: "BARU",
    tanggal: "",
    telepon: "",
    alamat: "",
  });

  const stats = useMemo(() => {
    const total = data.length;
    const baru = data.filter((d) => d.status === "BARU").length;
    const kontak = data.filter((d) => d.status === "KONTAK").length;
    const dijadwalkan = data.filter((d) => d.status === "DIJADWALKAN").length;
    const proses = kontak + dijadwalkan;
    const selesai = data.filter((d) => d.status === "SELESAI").length;
    const conversionRate = total > 0 ? Math.round((selesai / total) * 100) : 0;
    return { total, baru, kontak, dijadwalkan, proses, selesai, conversionRate };
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        (item.nama || "").toLowerCase().includes(q) ||
        (item.telepon || "").includes(q) ||
        (item.alamat || "").toLowerCase().includes(q);
      const matchSumber = filterSumber === "ALL" || item.sumber === filterSumber;

      let matchStatus = true;
      if (filterStatus === "BARU") matchStatus = item.status === "BARU";
      else if (filterStatus === "PROSES") matchStatus = ["KONTAK", "DIJADWALKAN"].includes(item.status);
      else if (filterStatus === "SELESAI") matchStatus = item.status === "SELESAI";

      return matchSearch && matchSumber && matchStatus;
    });
  }, [data, search, filterSumber, filterStatus]);

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      nama: "",
      sumber: "IKLAN",
      status: "BARU",
      tanggal: new Date().toISOString().split("T")[0],
      telepon: "",
      alamat: "",
    });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm("Hapus data lead ini?")) {
      const item = data.find((d) => d.id === id);
      setData(data.filter((d) => d.id !== id));
      if (item) notify(generateLeadsNotification(item, "dihapus"));
    }
  };

  const handleQuickStatus = (id, newStatus) => {
    setData((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, status: newStatus };
          notify(generateLeadsNotification(updated, `status diubah ke ${newStatus}`));
          return updated;
        }
        return item;
      })
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      setData(data.map((d) => (d.id === editingItem.id ? { ...d, ...formData } : d)));
      notify(generateLeadsNotification({ ...editingItem, ...formData }, "diperbarui"));
    } else {
      const newItem = { id: Date.now(), ...formData };
      setData([...data, newItem]);
      notify(generateLeadsNotification(newItem, "baru masuk"));
    }
    setShowModal(false);
  };

  const getWaLink = (telepon, nama) => {
    if (!telepon) return null;
    const clean = telepon.replace(/\D/g, "").replace(/^0/, "62");
    const msg = encodeURIComponent(
      `Halo Kak ${nama}, kami dari tim sales Nexus Net WiFi. Terkait pengajuan pemasangan WiFi Anda, ada yang bisa kami bantu?`
    );
    return `https://wa.me/${clean}?text=${msg}`;
  };

  const getInitials = (name) => {
    if (!name) return "L";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-5">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Leads Calon Pelanggan</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0D1B4A] text-white">
              {stats.total} Total
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-0.5">
            Tracking prospek pemasangan WiFi, follow-up penjualan, dan konversi closing
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#F59E0B] to-[#F97316] text-white px-4 py-2 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-orange-500/25 active:scale-95 transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Lead</span>
        </button>
      </div>

      {/* Interactive Metric Cards ("Dashboard Card Leads") */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Leads */}
        <button
          onClick={() => setFilterStatus("ALL")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            filterStatus === "ALL"
              ? "bg-[#0D1B4A] text-white border-[#0D1B4A] shadow-md shadow-blue-950/20"
              : "bg-white text-gray-800 border-gray-100 hover:border-gray-200 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${
                filterStatus === "ALL" ? "text-blue-200" : "text-gray-400"
              }`}
            >
              Total Leads
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                filterStatus === "ALL" ? "bg-white/10 text-white" : "bg-blue-50 text-[#0D1B4A]"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-1 tracking-tight">{stats.total}</p>
          <p
            className={`text-[11px] mt-1 font-medium truncate ${
              filterStatus === "ALL" ? "text-white/70" : "text-gray-400"
            }`}
          >
            Semua calon pelanggan
          </p>
          {filterStatus === "ALL" && (
            <span className="absolute bottom-0 left-0 right-0 h-1 bg-[#F59E0B]" />
          )}
        </button>

        {/* Card 2: Leads Baru */}
        <button
          onClick={() => setFilterStatus("BARU")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            filterStatus === "BARU"
              ? "bg-[#0D1B4A] text-white border-[#0D1B4A] shadow-md shadow-blue-950/20"
              : "bg-white text-gray-800 border-gray-100 hover:border-blue-200 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                filterStatus === "BARU" ? "text-blue-200" : "text-blue-600"
              }`}
            >
              Baru
              {stats.baru > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                filterStatus === "BARU" ? "bg-white/10 text-white" : "bg-blue-50 text-blue-600"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-1 tracking-tight">{stats.baru}</p>
          <p
            className={`text-[11px] mt-1 font-medium truncate ${
              filterStatus === "BARU" ? "text-white/70" : "text-gray-400"
            }`}
          >
            {stats.baru > 0 ? "Perlu segera difollow-up" : "Tidak ada antrian baru"}
          </p>
          {filterStatus === "BARU" && (
            <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-400" />
          )}
        </button>

        {/* Card 3: Dalam Proses */}
        <button
          onClick={() => setFilterStatus("PROSES")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            filterStatus === "PROSES"
              ? "bg-[#0D1B4A] text-white border-[#0D1B4A] shadow-md shadow-blue-950/20"
              : "bg-white text-gray-800 border-gray-100 hover:border-amber-200 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${
                filterStatus === "PROSES" ? "text-amber-200" : "text-amber-600"
              }`}
            >
              Dalam Proses
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                filterStatus === "PROSES" ? "bg-white/10 text-white" : "bg-amber-50 text-amber-600"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-1 tracking-tight">{stats.proses}</p>
          <p
            className={`text-[11px] mt-1 font-medium truncate ${
              filterStatus === "PROSES" ? "text-white/70" : "text-gray-400"
            }`}
          >
            {stats.kontak} kontak · {stats.dijadwalkan} dijadwalkan
          </p>
          {filterStatus === "PROSES" && (
            <span className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400" />
          )}
        </button>

        {/* Card 4: Selesai Closing */}
        <button
          onClick={() => setFilterStatus("SELESAI")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            filterStatus === "SELESAI"
              ? "bg-[#0D1B4A] text-white border-[#0D1B4A] shadow-md shadow-blue-950/20"
              : "bg-white text-gray-800 border-gray-100 hover:border-emerald-200 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${
                filterStatus === "SELESAI" ? "text-emerald-200" : "text-emerald-600"
              }`}
            >
              Selesai Closing
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                filterStatus === "SELESAI" ? "bg-white/10 text-white" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-1 tracking-tight">{stats.selesai}</p>
          <p
            className={`text-[11px] mt-1 font-medium truncate ${
              filterStatus === "SELESAI" ? "text-white/70" : "text-gray-400"
            }`}
          >
            {stats.conversionRate}% rasio konversi closing
          </p>
          {filterStatus === "SELESAI" && (
            <span className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-400" />
          )}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama pelanggan, nomor telepon, atau alamat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0D1B4A]/20 focus:border-[#0D1B4A] outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterSumber}
            onChange={(e) => setFilterSumber(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-[#0D1B4A]/20 outline-none cursor-pointer bg-white"
          >
            <option value="ALL">Semua Sumber</option>
            {sumberLeads.map((s) => (
              <option key={s} value={s}>
                Sumber: {s}
              </option>
            ))}
          </select>

          {(search || filterSumber !== "ALL" || filterStatus !== "ALL") && (
            <button
              onClick={() => {
                setSearch("");
                setFilterSumber("ALL");
                setFilterStatus("ALL");
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              title="Reset Filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          <div className="text-[11px] text-gray-400 font-semibold px-1 shrink-0">
            {filtered.length} Leads
          </div>
        </div>
      </div>

      {/* Leads Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filtered.map((item) => {
          const waLink = getWaLink(item.telepon, item.nama);
          const initials = getInitials(item.nama);

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all flex flex-col justify-between group space-y-3"
            >
              {/* Card Header: Avatar, Name, Badges & Action Buttons */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0D1B4A] to-blue-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-xs truncate group-hover:text-blue-600 transition-colors">
                      {item.nama}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <SumberBadge sumber={item.sumber} />
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1 rounded-lg text-gray-400 hover:text-[#0D1B4A] hover:bg-gray-100 transition-colors"
                    title="Edit Lead"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Hapus Lead"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Body: Phone, Address, Date */}
              <div className="space-y-1.5 text-xs text-gray-600 border-y border-gray-50 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="font-semibold text-gray-800">{item.telepon || "-"}</span>
                  </div>
                  {waLink && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-all shrink-0"
                      title="Follow up via WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>Chat WA</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2 text-gray-500 truncate">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{item.alamat || "Alamat belum dicatat"}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-400 text-[11px]">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Masuk: {item.tanggal || "-"}</span>
                </div>
              </div>

              {/* Card Footer: Quick Status Switcher */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
                  Ubah Status:
                </span>
                <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                  {statusOptions.map((st) => (
                    <button
                      key={st}
                      onClick={() => handleQuickStatus(item.id, st)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                        item.status === st
                          ? "bg-[#0D1B4A] text-white shadow-2xs"
                          : "bg-gray-50 text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-200/60"
                      }`}
                    >
                      {st === "DIJADWALKAN" ? "JADWAL" : st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-8">
          <Target className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="font-bold text-gray-700 text-sm">Tidak ada data leads yang sesuai</p>
          <p className="text-gray-400 text-xs mt-1">
            Coba ubah kata kunci pencarian atau reset filter sumber/status
          </p>
          <button
            onClick={() => {
              setSearch("");
              setFilterSumber("ALL");
              setFilterStatus("ALL");
            }}
            className="mt-3 px-3 py-1.5 text-xs font-semibold text-[#0D1B4A] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Tampilkan Semua Leads</span>
          </button>
        </div>
      )}

      {/* Modal Add / Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-base font-extrabold text-gray-900">
                {editingItem ? "Edit Data Lead" : "Tambah Lead Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Budi Prasetyo"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0D1B4A]/20 focus:border-[#0D1B4A] outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Sumber</label>
                  <select
                    value={formData.sumber}
                    onChange={(e) => setFormData({ ...formData, sumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#0D1B4A]/20 focus:border-[#0D1B4A] outline-none bg-white"
                  >
                    {sumberLeads.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#0D1B4A]/20 focus:border-[#0D1B4A] outline-none bg-white"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Nomor Telepon / WA</label>
                <input
                  type="text"
                  value={formData.telepon}
                  onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  placeholder="081234567890"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0D1B4A]/20 focus:border-[#0D1B4A] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Alamat Pemasangan</label>
                <input
                  type="text"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  placeholder="Jl. Melati No. 12"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0D1B4A]/20 focus:border-[#0D1B4A] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Tanggal Masuk</label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0D1B4A]/20 focus:border-[#0D1B4A] outline-none"
                />
              </div>
              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-[#F59E0B] to-[#F97316] text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all"
                >
                  Simpan Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
