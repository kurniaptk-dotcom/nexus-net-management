import { useState } from "react";
import {
  Network,
  Wifi,
  WifiOff,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  X,
  AlertCircle
} from "lucide-react";
import { odpOdcList } from "../data/mockData";
import { usePersistState } from "../hooks/usePersistState";
import Toast from "../components/Toast";

export default function ODP() {
  const [data, setData] = usePersistState("xnet_odpodc", odpOdcList);
  const [search, setSearch] = useState("");
  const [expandedOdc, setExpandedOdc] = useState({});

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    odc: "",
    nama: "",
    keterangan: "",
    status: "Aman",
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const existingOdcs = [...new Set(data.map((d) => d.odc).filter(Boolean))];

  const filtered = data.filter(
    (item) =>
      item.nama?.toLowerCase().includes(search.toLowerCase()) ||
      item.odc?.toLowerCase().includes(search.toLowerCase()) ||
      item.keterangan?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by ODC
  const grouped = filtered.reduce((acc, item) => {
    const key = item.odc || "TANPA ODC";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const stats = {
    total: data.length,
    aman: data.filter((d) => d.status === "Aman").length,
    diperbaiki: data.filter((d) => d.status === "Diperbaiki").length,
    kosong: data.filter((d) => !d.status).length,
    totalOdc: existingOdcs.length,
  };

  const toggleOdc = (odc) => {
    setExpandedOdc((prev) => ({ ...prev, [odc]: !prev[odc] }));
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      odc: existingOdcs[0] || "ODC-01",
      nama: "",
      keterangan: "",
      status: "Aman",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      odc: item.odc || "",
      nama: item.nama || "",
      keterangan: item.keterangan || "",
      status: item.status || "Aman",
    });
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.odc.trim()) {
      showToast("error", "Nama ODP dan ODC wajib diisi!");
      return;
    }

    if (editingItem) {
      setData((prev) =>
        prev.map((item) =>
          item.id === editingItem.id ? { ...item, ...formData } : item
        )
      );
      showToast("success", `ODP ${formData.nama} berhasil diperbarui.`);
    } else {
      const newItem = {
        id: Date.now(),
        ...formData,
      };
      setData((prev) => [newItem, ...prev]);
      showToast("success", `ODP ${formData.nama} berhasil ditambahkan.`);
    }
    setIsModalOpen(false);
  };

  const handleToggleStatus = (item) => {
    const newStatus = item.status === "Aman" ? "Diperbaiki" : "Aman";
    setData((prev) =>
      prev.map((d) => (d.id === item.id ? { ...d, status: newStatus } : d))
    );
    showToast("success", `Status ${item.nama} diubah menjadi ${newStatus}.`);
  };

  const handleDelete = (item) => {
    setData((prev) => prev.filter((d) => d.id !== item.id));
    setDeleteConfirm(null);
    showToast("success", `ODP ${item.nama} telah dihapus.`);
  };

  return (
    <div className="space-y-6">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">ODP / ODC</h1>
          <p className="text-gray-500 text-sm mt-0.5">Monitoring ODP, ODC, dan kelayakan jaringan</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#F59E0B] to-amber-600 text-slate-900 font-bold rounded-xl text-sm shadow-md hover:shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4 text-slate-900" />
          <span>Tambah ODP</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total ODP", value: stats.total, bg: "bg-white", color: "text-gray-900" },
          { label: "Aman", value: stats.aman, bg: "bg-emerald-50", color: "text-emerald-600" },
          { label: "Diperbaiki", value: stats.diperbaiki, bg: "bg-amber-50", color: "text-amber-600" },
          { label: "Total ODC", value: stats.totalOdc, bg: "bg-blue-50", color: "text-blue-600" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-gray-100 shadow-sm`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-extrabold ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari ODP, ODC, atau Keterangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      {/* ODP List grouped by ODC */}
      <div className="space-y-3">
        {Object.entries(grouped).length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <Network className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-700">Tidak ada ODP / ODC yang ditemukan</p>
            <p className="text-xs text-gray-400 mt-1">Coba sesuaikan kata kunci pencarian Anda</p>
          </div>
        ) : (
          Object.entries(grouped).map(([odc, items]) => {
            const isExpanded = expandedOdc[odc] !== false;
            const amanCount = items.filter((i) => i.status === "Aman").length;
            return (
              <div key={odc} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all">
                <button
                  onClick={() => toggleOdc(odc)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0D1B4A] to-[#1a237e] flex items-center justify-center shadow-sm">
                      <Network className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-bold text-gray-800">{odc}</h3>
                      <p className="text-xs text-gray-400">{items.length} ODP · {amanCount} Aman</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-bold">
                      {items.length} ODP
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50/80 text-left">
                        <tr>
                          <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Nama ODP</th>
                          <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Keterangan</th>
                          <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                          <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                {item.status === "Aman" ? (
                                  <Wifi className="w-4 h-4 text-emerald-500 shrink-0" />
                                ) : item.status === "Diperbaiki" ? (
                                  <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
                                ) : (
                                  <Wifi className="w-4 h-4 text-gray-300 shrink-0" />
                                )}
                                <span className="font-semibold text-gray-800">{item.nama}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-gray-500">{item.keterangan || "-"}</td>
                            <td className="px-5 py-3">
                              <button
                                onClick={() => handleToggleStatus(item)}
                                title="Klik untuk ubah status"
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:scale-105 ${
                                  item.status === "Aman"
                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                                    : item.status === "Diperbaiki"
                                    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
                                    : "bg-gray-50 text-gray-500 ring-1 ring-gray-200 hover:bg-gray-100"
                                }`}
                              >
                                {item.status || "Belum Dicek"}
                              </button>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEdit(item)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit ODP"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(item)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Hapus ODP"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add/Edit ODP */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-[#0D1B4A] to-[#1a237e] text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Network className="w-4 h-4 text-amber-400" />
                {editingItem ? "Edit Data ODP" : "Tambah ODP Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  ODC (Induk)
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: ODC-01 atau ODC-BANDARA"
                    value={formData.odc}
                    onChange={(e) => setFormData({ ...formData, odc: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none"
                  />
                  {existingOdcs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[11px] text-gray-400">Pilih cepat:</span>
                      {existingOdcs.slice(0, 6).map((odc) => (
                        <button
                          type="button"
                          key={odc}
                          onClick={() => setFormData({ ...formData, odc })}
                          className={`text-[11px] px-2 py-0.5 rounded-md border ${
                            formData.odc === odc
                              ? "bg-blue-50 border-blue-300 text-blue-700 font-semibold"
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {odc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Nama ODP
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ODP-KTC-01"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Keterangan / Lokasi Tiang
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Depan Kantor Camat / Tiang PLN #42"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none bg-white"
                >
                  <option value="Aman">Aman</option>
                  <option value="Diperbaiki">Diperbaiki (Gangguan / LOS)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#0D1B4A] to-[#1a237e] text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                >
                  {editingItem ? "Simpan Perubahan" : "Tambahkan ODP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-gray-100 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 text-base">Hapus ODP Ini?</h3>
            <p className="text-gray-500 text-xs mt-1">
              Apakah Anda yakin ingin menghapus <span className="font-semibold text-gray-800">{deleteConfirm.nama}</span> ({deleteConfirm.odc})?
            </p>
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                Hapus ODP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
