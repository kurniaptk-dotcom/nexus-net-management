import { useState } from "react";
import { Plus, Search, Edit2, Trash2, AlertTriangle, Users, Calendar, MapPin } from "lucide-react";
import { gangguanList, kategoriGangguan } from "../data/mockData";
import { generateGangguanNotification } from "../store/notificationStore";
import { usePersistState } from "../hooks/usePersistState";

function notify(notif) {
  if (window.__addNotification) window.__addNotification(notif);
}

function StatusBadge({ status }) {
  const styles = {
    SELESAI: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    PROGRESS: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    "WAITING LIST": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${styles[status] || "bg-gray-50 text-gray-700 ring-1 ring-gray-200"}`}>
      {status}
    </span>
  );
}

export default function Gangguan() {
  const [data, setData] = usePersistState("xnet_gangguan", gangguanList);
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    tanggal: "", kategori: "Tidak Muncul", pelanggan: "", alamat: "",
    status: "WAITING LIST", keterangan: "", userTerdampak: 1,
  });

  const filtered = data.filter((item) => {
    const matchSearch = item.pelanggan.toLowerCase().includes(search.toLowerCase()) || item.alamat.toLowerCase().includes(search.toLowerCase());
    const matchKategori = filterKategori === "ALL" || item.kategori === filterKategori;
    return matchSearch && matchKategori;
  });

  const stats = {
    total: data.length,
    selesai: data.filter((d) => d.status === "SELESAI").length,
    progress: data.filter((d) => d.status === "PROGRESS").length,
    userTerdampak: data.reduce((sum, d) => sum + d.userTerdampak, 0),
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ tanggal: new Date().toISOString().split("T")[0], kategori: "Tidak Muncul", pelanggan: "", alamat: "", status: "WAITING LIST", keterangan: "", userTerdampak: 1 });
    setShowModal(true);
  };
  const handleEdit = (item) => { setEditingItem(item); setFormData({ ...item }); setShowModal(true); };
  const handleDelete = (id) => {
    if (confirm("Hapus gangguan ini?")) {
      const item = data.find((d) => d.id === id);
      setData(data.filter((d) => d.id !== id));
      if (item) notify(generateGangguanNotification(item, "dihapus"));
    }
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData, userTerdampak: Number(formData.userTerdampak) };
    if (editingItem) {
      setData(data.map((d) => (d.id === editingItem.id ? { ...d, ...submitData } : d)));
      notify(generateGangguanNotification({ ...editingItem, ...submitData }, "diperbarui"));
    } else {
      const newItem = { id: Date.now(), ...submitData };
      setData([...data, newItem]);
      notify(generateGangguanNotification(newItem, "dilaporkan"));
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Gangguan</h1>
          <p className="text-gray-500 text-sm mt-0.5">Tracking gangguan eksternal & internal</p>
        </div>
        <button onClick={handleAdd} className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-red-500/25 transition-all">
          <Plus className="w-4 h-4" /> Laporkan
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Gangguan", value: stats.total, bg: "bg-white" },
          { label: "Selesai", value: stats.selesai, bg: "bg-emerald-50" },
          { label: "Proses", value: stats.progress, bg: "bg-orange-50" },
          { label: "User Terdampak", value: stats.userTerdampak, bg: "bg-red-50" },
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
          <input type="text" placeholder="Cari pelanggan / alamat..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none" />
        </div>
        <select value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#F59E0B] outline-none">
          <option value="ALL">Semua Kategori</option>
          {kategoriGangguan.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">No</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Tanggal</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Kategori</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Pelanggan</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">User</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((item, i) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-gray-400 font-medium">{i + 1}</td>
                  <td className="px-5 py-3 text-gray-500 font-medium">{item.tanggal}</td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-semibold ring-1 ring-red-200">
                      {item.kategori}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-bold text-gray-800">{item.pelanggan}</td>
                  <td className="px-5 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-1 bg-red-100 text-red-600 rounded-md text-xs font-bold">
                      {item.userTerdampak}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#0D1B4A]">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
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
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Tidak ada data gangguan</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{editingItem ? "Edit Gangguan" : "Laporkan Gangguan Baru"}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tanggal</label>
                  <input type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kategori</label>
                  <select value={formData.kategori} onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none">
                    {kategoriGangguan.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pelanggan</label>
                <input type="text" value={formData.pelanggan} onChange={(e) => setFormData({ ...formData, pelanggan: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Alamat</label>
                <input type="text" value={formData.alamat} onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none">
                    <option value="WAITING LIST">WAITING LIST</option>
                    <option value="PROGRESS">PROGRESS</option>
                    <option value="SELESAI">SELESAI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">User Terdampak</label>
                  <input type="number" min="1" value={formData.userTerdampak}
                    onChange={(e) => setFormData({ ...formData, userTerdampak: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Keterangan</label>
                <textarea value={formData.keterangan} onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none resize-none" rows={2} />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">Batal</button>
                <button type="submit" className="px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/25 transition-all">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
