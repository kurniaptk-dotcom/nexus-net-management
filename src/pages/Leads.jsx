import { useState } from "react";
import { Plus, Search, Edit2, Trash2, Target, Phone, MapPin, Calendar } from "lucide-react";
import { leadsList, sumberLeads } from "../data/mockData";
import { generateLeadsNotification } from "../store/notificationStore";
import { usePersistState } from "../hooks/usePersistState";

function notify(notif) {
  if (window.__addNotification) window.__addNotification(notif);
}

function StatusBadge({ status }) {
  const styles = {
    BARU: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    KONTAK: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    DIJADWALKAN: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
    SELESAI: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    BATAL: "bg-red-50 text-red-700 ring-1 ring-red-200",
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${styles[status] || "bg-gray-50 text-gray-700 ring-1 ring-gray-200"}`}>
      {status}
    </span>
  );
}

function SumberBadge({ sumber }) {
  const styles = {
    IKLAN: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    AFFILIATE: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
    MARKETING: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${styles[sumber] || "bg-gray-50 text-gray-700 ring-1 ring-gray-200"}`}>
      {sumber}
    </span>
  );
}

const statusOptions = ["BARU", "KONTAK", "DIJADWALKAN", "SELESAI"];

export default function Leads() {
  const [data, setData] = usePersistState("xnet_leads", leadsList);
  const [search, setSearch] = useState("");
  const [filterSumber, setFilterSumber] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    nama: "", sumber: "IKLAN", status: "BARU", tanggal: "", telepon: "", alamat: "",
  });

  const filtered = data.filter((item) => {
    const matchSearch = item.nama.toLowerCase().includes(search.toLowerCase()) || item.telepon.includes(search);
    const matchSumber = filterSumber === "ALL" || item.sumber === filterSumber;
    return matchSearch && matchSumber;
  });

  const stats = {
    total: data.length,
    baru: data.filter((d) => d.status === "BARU").length,
    proses: data.filter((d) => ["KONTAK", "DIJADWALKAN"].includes(d.status)).length,
    selesai: data.filter((d) => d.status === "SELESAI").length,
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ nama: "", sumber: "IKLAN", status: "BARU", tanggal: new Date().toISOString().split("T")[0], telepon: "", alamat: "" });
    setShowModal(true);
  };

  const handleEdit = (item) => { setEditingItem(item); setFormData({ ...item }); setShowModal(true); };
  const handleDelete = (id) => {
    if (confirm("Hapus lead ini?")) {
      const item = data.find((d) => d.id === id);
      setData(data.filter((d) => d.id !== id));
      if (item) notify(generateLeadsNotification(item, "dihapus"));
    }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Leads</h1>
          <p className="text-gray-500 text-sm mt-0.5">Tracking leads pemasangan WiFi</p>
        </div>
        <button onClick={handleAdd} className="flex items-center gap-2 bg-gradient-to-r from-[#F59E0B] to-[#F97316] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all">
          <Plus className="w-4 h-4" /> Tambah Lead
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Leads", value: stats.total, bg: "bg-white" },
          { label: "Baru", value: stats.baru, bg: "bg-blue-50" },
          { label: "Proses", value: stats.proses, bg: "bg-amber-50" },
          { label: "Selesai", value: stats.selesai, bg: "bg-emerald-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-gray-100`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Cari nama / telepon..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none" />
        </div>
        <select value={filterSumber} onChange={(e) => setFilterSumber(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F59E0B] outline-none">
          <option value="ALL">Semua Sumber</option>
          {sumberLeads.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-800">{item.nama}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <SumberBadge sumber={item.sumber} />
                  <StatusBadge status={item.status} />
                </div>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#0D1B4A]">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2.5"><Phone className="w-3.5 h-3.5 text-gray-400" />{item.telepon}</div>
              <div className="flex items-center gap-2.5"><MapPin className="w-3.5 h-3.5 text-gray-400" /><span className="truncate">{item.alamat}</span></div>
              <div className="flex items-center gap-2.5"><Calendar className="w-3.5 h-3.5 text-gray-400" />{item.tanggal}</div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Tidak ada data leads</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{editingItem ? "Edit Lead" : "Tambah Lead Baru"}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama</label>
                <input type="text" value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sumber</label>
                  <select value={formData.sumber} onChange={(e) => setFormData({ ...formData, sumber: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none">
                    {sumberLeads.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none">
                    {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telepon</label>
                <input type="text" value={formData.telepon} onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Alamat</label>
                <input type="text" value={formData.alamat} onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tanggal</label>
                <input type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">Batal</button>
                <button type="submit" className="px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-[#F59E0B] to-[#F97316] text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
