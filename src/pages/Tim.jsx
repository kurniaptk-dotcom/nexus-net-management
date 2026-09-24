import { useState } from "react";
import { Users, Plus, Edit2, Trash2, Mail, Phone, Award } from "lucide-react";
import { initialTimData, pekerjaanList } from "../data/mockData";
import { usePersistState } from "../hooks/usePersistState";

function TeamCard({ tim, pekerjaanData, onEdit, onDelete }) {
  const timPekerjaan = pekerjaanData.filter((p) => p.tim === tim.nama);
  const pemasanganSelesai = timPekerjaan.filter((p) => p.jenis === "PEMASANGAN" && p.status === "SELESAI").length;
  const perbaikanSelesai = timPekerjaan.filter((p) => p.jenis === "PERBAIKAN" && p.status === "SELESAI").length;
  const pemutusanSelesai = timPekerjaan.filter((p) => p.jenis === "PEMUTUSAN" && p.status === "SELESAI").length;
  const totalPekerjaan = pemasanganSelesai + perbaikanSelesai + pemutusanSelesai;
  const totalWaiting = timPekerjaan.filter((p) => p.status === "WAITING LIST").length;
  const completionRate = (totalPekerjaan + totalWaiting) > 0 ? ((totalPekerjaan / (totalPekerjaan + totalWaiting)) * 100).toFixed(0) : 0;

  const colors = [
    { bg: "bg-[#0D1B4A]", accent: "#F59E0B" },
    { bg: "bg-[#F59E0B]", accent: "#0D1B4A" },
    { bg: "bg-emerald-600", accent: "#F59E0B" },
  ];
  const colorSet = colors[tim.id % colors.length];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 group">
      {/* Header */}
      <div className={`${colorSet.bg} px-5 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">{tim.nama}</h3>
              <p className="text-xs text-white/70">Tim Field Technician</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(tim)}
              className="p-2 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(tim.id)}
              className="p-2 rounded-lg hover:bg-white/20 text-white/80 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-5">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <p className="text-2xl font-extrabold text-[#0D1B4A]">{pemasanganSelesai}</p>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5">Pemasangan</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-xl">
            <p className="text-2xl font-extrabold text-[#F59E0B]">{perbaikanSelesai}</p>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5">Perbaikan</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-xl">
            <p className="text-2xl font-extrabold text-red-500">{pemutusanSelesai}</p>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5">Pemutusan</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-gray-500 font-medium">Completion</span>
            <span className="font-bold text-gray-800">{completionRate}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-[#F59E0B] rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-gray-500">Total Selesai</span>
          </div>
          <span className="text-lg font-extrabold text-gray-800">{totalPekerjaan}</span>
        </div>
      </div>
    </div>
  );
}

export default function Tim() {
  const [timData, setTimData] = usePersistState("xnet_tim", initialTimData);
  const [pekerjaanData] = usePersistState("xnet_pekerjaan", pekerjaanList);
  const [showModal, setShowModal] = useState(false);
  const [editingTim, setEditingTim] = useState(null);
  const [formData, setFormData] = useState({ nama: "" });

  const handleAdd = () => {
    setEditingTim(null);
    setFormData({ nama: "" });
    setShowModal(true);
  };

  const handleEdit = (tim) => {
    setEditingTim(tim);
    setFormData({ nama: tim.nama });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm("Hapus tim ini?")) {
      setTimData(timData.filter((t) => t.id !== id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nama.trim()) return;

    if (editingTim) {
      setTimData(
        timData.map((t) =>
          t.id === editingTim.id ? { ...t, nama: formData.nama } : t
        )
      );
    } else {
      const newTim = {
        id: Date.now(),
        nama: formData.nama,
        pemasangan: { waitingList: 0, dijadwalkan: 0, selesai: 0, gagal: 0 },
        perbaikan: { waitingList: 0, dijadwalkan: 0, selesai: 0 },
        pemutusan: { waitingList: 0, dijadwalkan: 0, selesai: 0 },
      };
      setTimData([...timData, newTim]);
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Manajemen Tim</h1>
          <p className="text-gray-500 text-sm mt-0.5">Kelola tim field technician</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-[#0D1B4A] hover:bg-[#1a237e] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Tim
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {timData.map((tim) => (
          <TeamCard
            key={tim.id}
            tim={tim}
            pekerjaanData={pekerjaanData}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingTim ? "Edit Tim" : "Tambah Tim Baru"}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Tim</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none transition-all"
                  placeholder="Contoh: BUDI - ANI"
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
                  className="px-4 py-2.5 text-sm font-semibold bg-[#F59E0B] hover:bg-[#d97706] text-white rounded-xl hover:shadow-md transition-all"
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
