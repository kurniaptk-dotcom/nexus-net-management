import { useState } from "react";
import { Users, Plus, Edit2, Trash2, Mail, Phone, Award, Coins, Wallet, Wrench, Receipt } from "lucide-react";
import { initialTimData, pekerjaanList } from "../data/mockData";
import { usePersistState } from "../hooks/usePersistState";
import { calculateTaskIncentive, formatRupiah, MASTER_KOMISI_ITEMS } from "../lib/incentives";
import Toast from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import PayrollManagementTab from "../components/PayrollManagementTab";

function TeamCard({ tim, pekerjaanData, masterKomisi, onEdit, onDelete }) {
  const timPekerjaan = pekerjaanData.filter((p) => p.tim === tim.nama);
  const pemasanganSelesai = timPekerjaan.filter((p) => p.jenis === "PEMASANGAN" && p.status === "SELESAI").length;
  const perbaikanSelesai = timPekerjaan.filter((p) => p.jenis === "PERBAIKAN" && p.status === "SELESAI").length;
  const perbaikanKhususSelesai = timPekerjaan.filter((p) => p.jenis === "PERBAIKAN KHUSUS (ODP/ODC)" && p.status === "SELESAI").length;
  const pemutusanSelesai = timPekerjaan.filter((p) => p.jenis === "PEMUTUSAN" && p.status === "SELESAI").length;
  const totalPekerjaan = pemasanganSelesai + perbaikanSelesai + perbaikanKhususSelesai + pemutusanSelesai;
  const totalWaiting = timPekerjaan.filter((p) => p.status === "WAITING LIST").length;
  const completionRate = (totalPekerjaan + totalWaiting) > 0 ? ((totalPekerjaan / (totalPekerjaan + totalWaiting)) * 100).toFixed(0) : 0;

  const totalKomisi = timPekerjaan
    .filter((p) => p.status === "SELESAI")
    .reduce((sum, p) => sum + (p.komisi_total !== undefined ? Number(p.komisi_total) : calculateTaskIncentive(p, undefined, masterKomisi).total), 0);

  const colors = [
    { bg: "bg-[#0D1B4A]", accent: "#F59E0B" },
    { bg: "bg-[#F59E0B]", accent: "#0D1B4A" },
    { bg: "bg-emerald-600", accent: "#F59E0B" },
  ];
  const colorSet = colors[tim.id % colors.length];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 group">
      {/* Header */}
      <div className={`${colorSet.bg} px-4 sm:px-5 py-3.5 sm:py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-sm sm:text-base truncate">{tim.nama}</h3>
              <p className="text-[11px] text-white/70">Tim Field Technician</p>
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => onEdit(tim)}
              className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all active:scale-95 cursor-pointer"
              title="Edit Tim"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(tim.id)}
              className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-white/90 hover:text-red-300 transition-all active:scale-95 cursor-pointer"
              title="Hapus Tim"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats (4 Kolom Lengkap Termasuk Perbaikan Khusus ODP/ODC) */}
      <div className="p-3.5 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 sm:mb-4">
          <div className="text-center p-2 bg-blue-50 rounded-xl">
            <p className="text-lg sm:text-xl font-black text-[#0D1B4A]">{pemasanganSelesai}</p>
            <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5 truncate">Pasang</p>
          </div>
          <div className="text-center p-2 bg-amber-50 rounded-xl">
            <p className="text-lg sm:text-xl font-black text-[#F59E0B]">{perbaikanSelesai}</p>
            <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5 truncate">Perbaikan</p>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded-xl">
            <p className="text-lg sm:text-xl font-black text-purple-700">{perbaikanKhususSelesai}</p>
            <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5 truncate">ODP/ODC</p>
          </div>
          <div className="text-center p-2 bg-red-50 rounded-xl">
            <p className="text-lg sm:text-xl font-black text-red-500">{pemutusanSelesai}</p>
            <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5 truncate">Putus</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs sm:text-sm mb-1.5">
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
          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
            <span className="text-gray-500">Total Selesai</span>
          </div>
          <span className="text-base sm:text-lg font-black text-gray-900">{totalPekerjaan}</span>
        </div>

        {/* Commission Badge */}
        <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-dashed border-gray-100 text-xs">
          <div className="flex items-center gap-1.5 text-gray-600 font-semibold">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>Estimasi Komisi Tim</span>
          </div>
          <span className="font-extrabold text-amber-600 font-mono text-sm bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
            {formatRupiah(totalKomisi)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Tim() {
  const [timData, setTimData] = usePersistState("xnet_tim", initialTimData);
  const [pekerjaanData] = usePersistState("xnet_pekerjaan", pekerjaanList);
  const [masterKomisi] = usePersistState("xnet_master_komisi", MASTER_KOMISI_ITEMS);
  const [activeTab, setActiveTab] = useState("TIM"); // "TIM" | "PAYROLL"
  const [showModal, setShowModal] = useState(false);
  const [editingTim, setEditingTim] = useState(null);
  const [formData, setFormData] = useState({ nama: "" });
  const [toast, setToast] = useState(null);
  const [deleteTargetTim, setDeleteTargetTim] = useState(null);

  const totalKomisiSemua = pekerjaanData
    .filter((p) => p.status === "SELESAI")
    .reduce((sum, p) => sum + (p.komisi_total !== undefined ? Number(p.komisi_total) : calculateTaskIncentive(p, undefined, masterKomisi).total), 0);

  const totalSelesaiSemua = pekerjaanData.filter((p) => p.status === "SELESAI").length;

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
    const target = timData.find((t) => t.id === id);
    if (target) {
      setDeleteTargetTim(target);
    }
  };

  const confirmDeleteTim = () => {
    if (!deleteTargetTim) return;
    setTimData(timData.filter((t) => t.id !== deleteTargetTim.id));
    setToast({ type: "success", message: `Tim ${deleteTargetTim.nama || ""} berhasil dihapus.` });
    setDeleteTargetTim(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanNama = formData.nama.trim();
    if (!cleanNama) return;

    if (editingTim) {
      setTimData(
        timData.map((t) =>
          t.id === editingTim.id ? { ...t, nama: cleanNama } : t
        )
      );
      setToast({ type: "success", message: `Data tim "${cleanNama}" berhasil diperbarui.` });
    } else {
      const newTim = {
        id: Date.now(),
        nama: cleanNama,
        pemasangan: { waitingList: 0, dijadwalkan: 0, selesai: 0, gagal: 0 },
        perbaikan: { waitingList: 0, dijadwalkan: 0, selesai: 0 },
        pemutusan: { waitingList: 0, dijadwalkan: 0, selesai: 0 },
      };
      setTimData([...timData, newTim]);
      setToast({ type: "success", message: `Tim "${cleanNama}" berhasil ditambahkan.` });
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-5">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Manajemen Tim & Penggajian</h1>
          <p className="text-gray-500 text-sm mt-0.5">Kelola tim field technician, struktur gaji, dan slip komisi kerja</p>
        </div>
        {activeTab === "TIM" && (
          <button
            onClick={handleAdd}
            className="flex items-center justify-center gap-2 bg-[#0D1B4A] hover:bg-[#1a237e] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tim</span>
          </button>
        )}
      </div>

      {/* Sub-Tabs Navigasi */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab("TIM")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "TIM"
              ? "border-[#0D1B4A] text-[#0D1B4A]"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Regu & Kinerja ({timData.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("PAYROLL")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "PAYROLL"
              ? "border-[#F59E0B] text-[#F59E0B]"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Penggajian & Slip Gaji</span>
        </button>
      </div>

      {activeTab === "PAYROLL" ? (
        <PayrollManagementTab
          timList={timData}
          pekerjaanData={pekerjaanData}
          masterKomisi={masterKomisi}
        />
      ) : (
        <>
          {/* KPI Cards Ringkasan Tim & Komisi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0D1B4A] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Regu Teknisi</p>
                <p className="text-xl font-black text-gray-900">{timData.length} Tim</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Tugas Selesai</p>
                <p className="text-xl font-black text-gray-900">{totalSelesaiSemua} Tugas</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 p-4 rounded-2xl border border-amber-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#0D1B4A] flex items-center justify-center shrink-0 shadow-xs font-bold">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Total Komisi Seluruh Tim</p>
                <p className="text-xl font-black text-amber-700 font-mono">{formatRupiah(totalKomisiSemua)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {timData.map((tim) => (
              <TeamCard
                key={tim.id}
                tim={tim}
                pekerjaanData={pekerjaanData}
                masterKomisi={masterKomisi}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {/* Modal Tambah/Edit Tim */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            {/* Mobile Drag Indicator Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 sm:hidden" />
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {editingTim ? "Edit Tim" : "Tambah Tim Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl"
              >
                ✕
              </button>
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
                  className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-sm font-semibold bg-[#F59E0B] hover:bg-[#d97706] text-white rounded-xl hover:shadow-md transition-all cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Tim */}
      <ConfirmModal
        isOpen={!!deleteTargetTim}
        onClose={() => setDeleteTargetTim(null)}
        onConfirm={confirmDeleteTim}
        title="Hapus Tim Teknisi?"
        message={`Apakah Anda yakin ingin menghapus tim "${deleteTargetTim?.nama}"? Riwayat penugasan tim ini akan tetap tersimpan.`}
        confirmText="Hapus Tim"
        variant="danger"
      />
    </div>
  );
}
