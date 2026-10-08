import { useState, useMemo, useEffect } from "react";
import { showToast } from "../lib/toast";
import {
  Coins,
  Plus,
  Search,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Layers,
  Sparkles,
  Info,
  X,
  SlidersHorizontal,
} from "lucide-react";
import {
  KOMISI_PEKERJAAN_MASTER,
  KATEGORI_KOMISI,
  formatRupiah,
  normalizeJobCategory,
} from "../lib/incentives";

export default function MasterKomisiTab({ masterList = [], setMasterList }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Tutup modal dengan Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowAddModal(false);
        setItemToDelete(null);
        setShowResetConfirm(false);
      }
    };
    if (showAddModal || itemToDelete || showResetConfirm) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [showAddModal, itemToDelete, showResetConfirm]);

  // Form State untuk Tambah / Edit
  const [form, setForm] = useState({
    id: "",
    nama: "",
    tarif: 5000,
    satuan: "Unit",
    kategori: "PEMASANGAN",
    keterangan: "",
  });

  // Filter & Search
  const filteredList = useMemo(() => {
    return (masterList || []).filter((item) => {
      const matchCat =
        activeCategory === "ALL" ||
        normalizeJobCategory(item.kategori) === normalizeJobCategory(activeCategory);

      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.nama?.toLowerCase().includes(q) ||
        item.keterangan?.toLowerCase().includes(q) ||
        item.satuan?.toLowerCase().includes(q);

      return matchCat && matchSearch;
    });
  }, [masterList, activeCategory, searchTerm]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    const total = masterList?.length || 0;
    const catCounts = (masterList || []).reduce((acc, it) => {
      const c = normalizeJobCategory(it.kategori);
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {});
    return {
      total,
      pemasangan: catCounts["PEMASANGAN"] || 0,
      perbaikan: catCounts["PERBAIKAN"] || 0,
      odp: catCounts["ODP"] || 0,
      pemutusan: catCounts["PEMUTUSAN"] || 0,
    };
  }, [masterList]);

  // Buka Modal Tambah
  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({
      id: "item_" + Date.now(),
      nama: "",
      tarif: 5000,
      satuan: "Unit",
      kategori: activeCategory !== "ALL" ? activeCategory : "PEMASANGAN",
      keterangan: "",
    });
    setShowAddModal(true);
  };

  // Buka Modal Edit
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setForm({
      id: item.id,
      nama: item.nama || "",
      tarif: item.tarif || 0,
      satuan: item.satuan || "Unit",
      kategori: item.kategori || "PEMASANGAN",
      keterangan: item.keterangan || "",
    });
    setShowAddModal(true);
  };

  // Submit Simpan (Create / Update)
  const handleSave = (e) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      showToast("Nama pekerjaan wajib diisi!", "warning");
      return;
    }

    if (editingItem) {
      // Update
      setMasterList((prev) =>
        prev.map((it) => (it.id === editingItem.id ? { ...it, ...form, tarif: Number(form.tarif) || 0 } : it))
      );
    } else {
      // Create
      const newSlug = form.nama
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_");
      const finalId = form.id || `${newSlug}_${Date.now()}`;
      const newItem = {
        ...form,
        id: finalId,
        tarif: Number(form.tarif) || 0,
      };
      setMasterList((prev) => [...prev, newItem]);
    }

    setShowAddModal(false);
    setEditingItem(null);
  };

  // Hapus Item
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    setMasterList((prev) => prev.filter((it) => it.id !== itemToDelete.id));
    setItemToDelete(null);
  };

  // Reset ke Standar Team Nexus
  const handleResetDefault = () => {
    setMasterList(KOMISI_PEKERJAAN_MASTER);
    setShowResetConfirm(false);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Banner / Info Header */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0D1B4A] to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Coins className="w-5 h-5 text-amber-400" />
            </span>
            <h2 className="text-xl font-extrabold tracking-tight">
              Katalog & Tarif Master Komisi Teknisi
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-950">
              Team Nexus
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Kelola daftar pekerjaan lapangan, tarif komisi per satuan (Meter, Unit, User), serta pengelompokan kategori.
            Perubahan di sini langsung tersinkron ke checklist SPK penugasan dan dompet insentif teknisi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/15"
          >
            <RotateCcw className="w-4 h-4 text-amber-300" />
            <span>Reset Standar</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-extrabold transition-all shadow-md shadow-amber-400/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Tambah Item Komisi</span>
          </button>
        </div>
      </div>

      {/* Ringkasan Metrik Kategori */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setActiveCategory("PEMASANGAN")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeCategory === "PEMASANGAN"
              ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-sm"
              : "bg-white border-slate-200/80 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pemasangan</span>
            <span className="text-xs font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
              {stats.pemasangan}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Tarik dropcore, pasang & setting ONT</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory("PERBAIKAN")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeCategory === "PERBAIKAN"
              ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-sm"
              : "bg-white border-slate-200/80 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Perbaikan</span>
            <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
              {stats.perbaikan}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Sambung fiber, fastcont, perbaikan ONT</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory("ODP")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeCategory === "ODP"
              ? "bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-sm"
              : "bg-white border-slate-200/80 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">ODP / ODC</span>
            <span className="text-xs font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
              {stats.odp}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Tarik kabel tiang, rakit & pasang boks</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory("PEMUTUSAN")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeCategory === "PEMUTUSAN"
              ? "bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20 shadow-sm"
              : "bg-white border-slate-200/80 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pemutusan</span>
            <span className="text-xs font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
              {stats.pemutusan}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Dismantle modem & cabut dropcore</p>
        </button>
      </div>

      {/* Toolbar Filter & Search */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Kategori Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveCategory("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeCategory === "ALL"
                ? "bg-[#0D1B4A] text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            Semua ({masterList.length})
          </button>
          {KATEGORI_KOMISI.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeCategory === cat.key
                  ? "bg-[#0D1B4A] text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Input Pencarian */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama pekerjaan / satuan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
          />
        </div>
      </div>

      {/* Tabel Master Komisi */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                <th className="py-3 px-4 w-12">No</th>
                <th className="py-3 px-4">Nama Pekerjaan</th>
                <th className="py-3 px-4">Kelompok Kategori</th>
                <th className="py-3 px-4">Satuan</th>
                <th className="py-3 px-4 text-right">Tarif Komisi (Rp)</th>
                <th className="py-3 px-4">Keterangan / SOP Lapangan</th>
                <th className="py-3 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <Coins className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-60" />
                    <p className="font-semibold text-slate-500">Tidak ada item komisi yang cocok</p>
                    <p className="text-[11px] mt-0.5">Ubah filter kategori atau kata kunci pencarian</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  const normCat = normalizeJobCategory(item.kategori);
                  const catMeta = KATEGORI_KOMISI.find((k) => k.key === normCat) || {
                    label: item.kategori,
                    badge: "bg-slate-100 text-slate-700 border-slate-200",
                  };

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-amber-50/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                          {item.nama}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {item.id}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catMeta.badge}`}
                        >
                          {catMeta.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-600">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md">
                          Per {item.satuan}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-extrabold text-sm text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          {formatRupiah(item.tarif)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={item.keterangan}>
                        {item.keterangan || "-"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Item"
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemToDelete(item)}
                            title="Hapus Item"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* Modal Tambah / Edit Item */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-[#0D1B4A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    {editingItem ? "Edit Item Komisi" : "Tambah Item Komisi Baru"}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Master Katalog Pekerjaan & Standar Tarif Teknisi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Pekerjaan Lapangan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Penarikan Dropcore Baru / Splicing Tiang"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kelompok Kategori <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
                  >
                    {KATEGORI_KOMISI.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Satuan Volume <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.satuan}
                    onChange={(e) => setForm({ ...form, satuan: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
                  >
                    <option value="Meter">Per Meter</option>
                    <option value="Unit">Per Unit</option>
                    <option value="User">Per User</option>
                    <option value="Titik">Per Titik</option>
                    <option value="Paket">Per Paket</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tarif Komisi per {form.satuan || "Satuan"} (Rp) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={form.satuan === "Meter" ? 50 : 500}
                    required
                    value={form.tarif}
                    onChange={(e) => setForm({ ...form, tarif: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-extrabold text-sm focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Keterangan / SOP Lapangan
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan ketentuan teknis atau SOP pengerjaan..."
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-extrabold transition-all shadow-md shadow-amber-400/20 cursor-pointer"
                >
                  {editingItem ? "Simpan Perubahan" : "Tambah Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-slate-900">Hapus Item Komisi?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus <span className="font-bold text-slate-800">"{itemToDelete.nama}"</span>?
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 cursor-pointer shadow-md shadow-rose-600/20"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Reset Standar */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-slate-900">Reset ke Standar Team Nexus?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Tindakan ini akan mengembalikan seluruh 12 item pekerjaan dan tarif ke standar resmi bawaan pabrik.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetDefault}
                className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-extrabold hover:bg-amber-400 cursor-pointer shadow-md shadow-amber-500/20"
              >
                Ya, Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
