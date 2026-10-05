import { useState, useMemo } from "react";
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Coins,
  ChevronDown,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  KOMISI_PEKERJAAN_MASTER,
  formatRupiah,
  normalizeJobCategory,
  KATEGORI_KOMISI,
} from "../lib/incentives";

export default function WorkItemsChecklist({
  jenis = "PEMASANGAN",
  onChangeJenis,
  jenisList = ["PEMASANGAN", "PERBAIKAN", "PEMUTUSAN", "PERBAIKAN KHUSUS (ODP/ODC)"],
  value = [],
  onChange,
  masterList = KOMISI_PEKERJAAN_MASTER,
}) {
  const [showOtherCategories, setShowOtherCategories] = useState(false);
  const [selectedExtraId, setSelectedExtraId] = useState("");

  const activeMaster = useMemo(() => {
    return Array.isArray(masterList) && masterList.length > 0
      ? masterList
      : KOMISI_PEKERJAAN_MASTER;
  }, [masterList]);

  // Normalisasi kategori aktif
  const currentCategory = useMemo(() => {
    return normalizeJobCategory(jenis);
  }, [jenis]);

  // Master map untuk lookup cepat
  const masterMap = useMemo(() => {
    return activeMaster.reduce((acc, it) => {
      acc[it.id] = it;
      return acc;
    }, {});
  }, [activeMaster]);

  // Item utama sesuai kategori yang dipilih
  const primaryCategoryItems = useMemo(() => {
    return activeMaster.filter(
      (m) => normalizeJobCategory(m.kategori) === currentCategory
    );
  }, [activeMaster, currentCategory]);

  // Item tambahan di luar kategori utama yang tersedia untuk ditambahkan
  const otherCategoryItems = useMemo(() => {
    return activeMaster.filter(
      (m) => normalizeJobCategory(m.kategori) !== currentCategory
    );
  }, [activeMaster, currentCategory]);

  // Hitung total estimasi komisi saat ini
  const totalEstimasi = useMemo(() => {
    if (!Array.isArray(value)) return 0;
    return value.reduce((sum, it) => {
      const rate = it.tarif !== undefined ? Number(it.tarif) : (masterMap[it.id]?.tarif || 0);
      const qty = Number(it.qty) || 0;
      return sum + rate * qty;
    }, 0);
  }, [value, masterMap]);

  // Cek apakah suatu item tercentang
  const isItemChecked = (itemId) => {
    return (value || []).some((v) => v.id === itemId);
  };

  // Dapatkan data item terpilih
  const getItemValue = (itemId) => {
    return (value || []).find((v) => v.id === itemId);
  };

  // Toggle checklist
  const handleToggleCheck = (masterItem) => {
    const exists = isItemChecked(masterItem.id);
    if (exists) {
      // Hapus dari list
      const updated = (value || []).filter((v) => v.id !== masterItem.id);
      onChange(updated);
    } else {
      // Tambah ke list dengan default qty
      const defaultQty = masterItem.satuan === "Meter" ? 100 : 1;
      const newItem = {
        id: masterItem.id,
        nama: masterItem.nama,
        satuan: masterItem.satuan,
        tarif: masterItem.tarif,
        qty: defaultQty,
        subtotal: masterItem.tarif * defaultQty,
      };
      onChange([...(value || []), newItem]);
    }
  };

  // Update volume / Qty
  const handleQtyChange = (itemId, newQty) => {
    const num = Math.max(0, Number(newQty) || 0);
    const updated = (value || []).map((v) => {
      if (v.id === itemId) {
        const rate = v.tarif !== undefined ? Number(v.tarif) : (masterMap[itemId]?.tarif || 0);
        return {
          ...v,
          qty: num,
          subtotal: rate * num,
        };
      }
      return v;
    });
    onChange(updated);
  };

  // Tambah item dari kelompok lain
  const handleAddExtraItem = () => {
    if (!selectedExtraId) return;
    const master = masterMap[selectedExtraId];
    if (!master) return;

    if (!isItemChecked(selectedExtraId)) {
      const defaultQty = master.satuan === "Meter" ? 50 : 1;
      onChange([
        ...(value || []),
        {
          id: master.id,
          nama: master.nama,
          satuan: master.satuan,
          tarif: master.tarif,
          qty: defaultQty,
          subtotal: master.tarif * defaultQty,
        },
      ]);
    }
    setSelectedExtraId("");
  };

  // Item terpilih yang berasal dari kelompok luar
  const selectedOutsideItems = useMemo(() => {
    return (value || []).filter((it) => {
      const m = masterMap[it.id];
      if (!m) return false;
      return normalizeJobCategory(m.kategori) !== currentCategory;
    });
  }, [value, masterMap, currentCategory]);

  return (
    <div className="space-y-3.5 bg-slate-50/70 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 text-xs">
      {/* 1. Header Dropdown Kategori / Jenis */}
      {onChangeJenis && (
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              Kelompok / Jenis Pekerjaan <span className="text-rose-500">*</span>
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              Pilih untuk memuat checklist standar
            </span>
          </label>
          <select
            value={jenis}
            onChange={(e) => onChangeJenis(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400 outline-none cursor-pointer"
          >
            {jenisList.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 2. Checklist Lingkup Pekerjaan & Tarif */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-600" />
            Checklist Lingkup Pekerjaan & Komisi Teknisi
          </label>
          <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full">
            {value?.length || 0} Item Dipilih
          </span>
        </div>

        <p className="text-[11px] text-slate-500 mb-2.5 leading-relaxed">
          Centang pekerjaan yang ditugaskan kepada teknisi. Nominal komisi otomatis terhitung berdasarkan volume kerja.
        </p>

        {/* Daftar Checklist Item Utama */}
        <div className="space-y-2">
          {primaryCategoryItems.length === 0 ? (
            <div className="p-4 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
              Belum ada item master untuk kategori ini.
            </div>
          ) : (
            primaryCategoryItems.map((item) => {
              const checked = isItemChecked(item.id);
              const valItem = getItemValue(item.id);
              const currentQty = valItem ? valItem.qty : (item.satuan === "Meter" ? 100 : 1);
              const subtotal = item.tarif * currentQty;

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all ${
                    checked
                      ? "bg-amber-50/60 border-amber-300 ring-1 ring-amber-400/30 shadow-xs"
                      : "bg-white border-slate-200/80 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Checkbox & Nama */}
                    <div
                      onClick={() => handleToggleCheck(item)}
                      className="flex items-start gap-2.5 flex-1 cursor-pointer select-none"
                    >
                      <div className="mt-0.5">
                        {checked ? (
                          <CheckSquare className="w-4 h-4 text-amber-600 fill-amber-50" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className={`font-bold ${checked ? "text-slate-900" : "text-slate-700"}`}>
                          {item.nama}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-500">
                            {formatRupiah(item.tarif)} / {item.satuan}
                          </span>
                          {item.keterangan && (
                            <span className="text-[10px] text-slate-400 truncate max-w-xs">
                              · {item.keterangan}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Input Volume / Qty saat tercentang */}
                    {checked && (
                      <div className="flex items-center gap-2 shrink-0 animate-in fade-in duration-150">
                        <div className="flex items-center bg-white border border-amber-300 rounded-lg overflow-hidden shadow-2xs">
                          <input
                            type="number"
                            min={1}
                            step={item.satuan === "Meter" ? 5 : 1}
                            value={currentQty}
                            onChange={(e) => handleQtyChange(item.id, e.target.value)}
                            className="w-16 px-2 py-1 text-center font-bold text-slate-900 outline-none text-xs"
                          />
                          <span className="px-2 py-1 bg-amber-100/60 text-[10px] font-bold text-amber-900 border-l border-amber-200">
                            {item.satuan}
                          </span>
                        </div>
                        <div className="text-right min-w-[75px]">
                          <span className="text-[11px] font-extrabold text-emerald-700">
                            {formatRupiah(subtotal)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Item Tambahan dari Kategori Lain yang sedang dipilih */}
        {selectedOutsideItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-dashed border-slate-200 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Item Tambahan Lintas Kategori:
            </span>
            {selectedOutsideItems.map((valItem) => {
              const master = masterMap[valItem.id] || valItem;
              return (
                <div
                  key={valItem.id}
                  className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/50 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{master.nama}</p>
                    <span className="text-[10px] text-purple-700 font-semibold">
                      {formatRupiah(master.tarif)} / {master.satuan} (Kategori: {master.kategori || "Lain"})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={valItem.qty}
                      onChange={(e) => handleQtyChange(valItem.id, e.target.value)}
                      className="w-16 px-2 py-1 bg-white border border-purple-300 rounded-lg text-center font-bold text-xs outline-none"
                    />
                    <span className="text-[10px] font-bold text-slate-500">{master.satuan}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleCheck(master)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Opsi Tambah Pekerjaan Tambahan dari Kategori Lain */}
        <div className="mt-3 pt-2">
          {!showOtherCategories ? (
            <button
              type="button"
              onClick={() => setShowOtherCategories(true)}
              className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Pekerjaan Tambahan dari Kelompok Lain</span>
            </button>
          ) : (
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">
                  Pilih pekerjaan dari kelompok lain:
                </span>
                <button
                  type="button"
                  onClick={() => setShowOtherCategories(false)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                >
                  Tutup
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedExtraId}
                  onChange={(e) => setSelectedExtraId(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none text-slate-700"
                >
                  <option value="">-- Pilih item pekerjaan tambahan --</option>
                  {otherCategoryItems
                    .filter((m) => !isItemChecked(m.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        [{m.kategori}] {m.nama} — {formatRupiah(m.tarif)}/{m.satuan}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedExtraId}
                  onClick={handleAddExtraItem}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Tambah
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Banner Ringkasan Total Estimasi Komisi */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/90 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
              Total Estimasi Komisi Teknisi
            </p>
            <p className="text-[10px] text-amber-800/80">
              {value?.length || 0} item pekerjaan terdaftar di penugasan ini
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-base font-black text-slate-900">
            {formatRupiah(totalEstimasi)}
          </span>
        </div>
      </div>
    </div>
  );
}
