import { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  X,
  XCircle,
  Gauge,
  Wifi,
  Coins,
  Trash2,
  Camera,
  ShieldCheck,
  Check,
} from "lucide-react";
import OpticalPowerGauge, { evaluateDbm } from "./OpticalPowerGauge";
import {
  formatRupiah,
  KOMISI_PEKERJAAN_MASTER,
  KOMISI_MAP,
  getDefaultWorkItemsForTask,
} from "../lib/incentives";
import { showToast } from "../lib/toast";

export default function TaskCompletionModal({
  isOpen,
  task,
  masterKomisi = KOMISI_PEKERJAAN_MASTER,
  odpList = [],
  onClose,
  onComplete,
}) {
  const [form, setForm] = useState({
    redaman: "-19.5",
    serialNumber: "",
    odp: "",
    catatan: "",
    fotoOpm: null,
    fotoDropcore: null,
    fotoModem: null,
  });

  const [workItems, setWorkItems] = useState([]);
  const [selectedAddItem, setSelectedAddItem] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inisialisasi data form ketika modal dibuka
  useEffect(() => {
    if (isOpen && task) {
      const defaultItems = Array.isArray(task.komisi_items) && task.komisi_items.length > 0
        ? task.komisi_items
        : getDefaultWorkItemsForTask(task.jenis, 100, masterKomisi);

      setWorkItems(defaultItems);
      setForm({
        redaman: task.redaman || (task.jenis === "PEMUTUSAN" ? "N/A" : "-19.5"),
        serialNumber: task.sn_modem || "",
        odp: task.odp || (odpList[0]?.nama || "ODP 1.1"),
        catatan: task.keterangan || "",
        fotoOpm: task.foto_opm || task.evidence?.foto_opm || null,
        fotoDropcore: task.evidence?.foto_dropcore || null,
        fotoModem: task.foto_modem || task.evidence?.foto_modem || null,
      });
      setSelectedAddItem("");
      setIsSubmitting(false);
    }
  }, [isOpen, task, masterKomisi, odpList]);

  // Evaluasi dBm Real-time
  const dbmQuality = useMemo(() => {
    if (!task || task.jenis === "PEMUTUSAN") return null;
    return evaluateDbm(form.redaman);
  }, [form.redaman, task]);

  // Hitung Total Komisi Tugas Real-time
  const totalKomisi = useMemo(() => {
    return (workItems || []).reduce((acc, it) => {
      const master = KOMISI_MAP[it.id] || masterKomisi.find((m) => m.id === it.id);
      const rate = master?.tarif || 0;
      return acc + (Number(it.qty) || 0) * rate;
    }, 0);
  }, [workItems, masterKomisi]);

  // Handle Photo Upload (Base64)
  const handlePhotoUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Baca sebagai base64
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        [type]: reader.result,
      }));
      showToast("Foto berhasil dilampirkan!", "success");
    };
    reader.onerror = () => {
      showToast("Gagal membaca file foto", "error");
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (type) => {
    setForm((prev) => ({
      ...prev,
      [type]: null,
    }));
  };

  // Submit Handler dengan Validasi SOP Ketat
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!task || isSubmitting) return;

    const isPemutusan = task.jenis === "PEMUTUSAN";
    const isPemasangan = task.jenis === "PEMASANGAN";
    const hasPhoto = Boolean(form.fotoOpm || form.fotoDropcore || form.fotoModem);

    // === VALIDASI SOP WAJIB MUTLAK ===
    if (isPemasangan) {
      if (!form.redaman || isNaN(parseFloat(form.redaman))) {
        showToast("SOP Wajib: Masukkan hasil ukur redaman OPM yang valid (contoh: -19.5 dBm).", "error");
        return;
      }
      if (!form.serialNumber || !form.serialNumber.trim()) {
        showToast("SOP Wajib: Nomor Seri (SN) / MAC modem ONT wajib diisi untuk pemasangan baru.", "error");
        return;
      }
      if (!hasPhoto) {
        showToast("SOP Wajib: Lampirkan minimal 1 foto bukti fisik (Foto OPM atau Foto ONT) sebelum menyelesaikan pemasangan.", "error");
        return;
      }
    } else if (isPemutusan) {
      if (!hasPhoto) {
        showToast("SOP Wajib: Lampirkan foto bukti perangkat yang ditarik atau port ODP yang dicabut.", "error");
        return;
      }
    } else {
      // Perbaikan / Gangguan / Khusus
      if (!form.redaman || isNaN(parseFloat(form.redaman))) {
        showToast("SOP Wajib: Masukkan hasil ukur redaman OPM akhir (contoh: -19.5 dBm).", "error");
        return;
      }
      if (!hasPhoto) {
        showToast("SOP Wajib: Lampirkan minimal 1 foto bukti fisik pengerjaan lapangan.", "error");
        return;
      }
    }

    // Validasi Item Pekerjaan & Komisi
    const hasValidWorkItem = (workItems || []).some((it) => (Number(it.qty) || 0) > 0);
    if (!hasValidWorkItem) {
      showToast("SOP Wajib: Masukkan minimal 1 rincian item pekerjaan fisik (panjang meter kabel atau unit kerja) untuk klaim komisi.", "error");
      return;
    }

    setIsSubmitting(true);

    const itemsSummaryStr = (workItems || [])
      .filter((it) => (Number(it.qty) || 0) > 0)
      .map((it) => `${KOMISI_MAP[it.id]?.nama || it.id}: ${it.qty} ${KOMISI_MAP[it.id]?.satuan || ""}`)
      .join(", ");

    const finalPayload = {
      ...task,
      status: "SELESAI",
      redaman: form.redaman,
      sn_modem: form.serialNumber,
      odp: form.odp || task.odp,
      foto_opm: form.fotoOpm,
      foto_dropcore: form.fotoDropcore,
      foto_modem: form.fotoModem,
      evidence: {
        foto_opm: form.fotoOpm,
        foto_dropcore: form.fotoDropcore,
        foto_modem: form.fotoModem,
        redaman: form.redaman,
        sn_modem: form.serialNumber,
        odp: form.odp || task.odp,
        catatan: form.catatan,
        waktu_selesai: new Date().toISOString(),
      },
      komisi_items: workItems,
      komisi_total: totalKomisi,
      waktu_selesai: new Date().toISOString(),
      keterangan: form.catatan
        ? `${form.catatan} ${itemsSummaryStr ? `| Rincian: ${itemsSummaryStr}` : ""}`
        : itemsSummaryStr
        ? `Selesai · Rincian: ${itemsSummaryStr}`
        : "Pekerjaan selesai dilaksanakan.",
    };

    onComplete(finalPayload);
    setIsSubmitting(false);
  };

  if (!isOpen || !task) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 sm:hidden" />

        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#0D1B4A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Validasi Penyelesaian & Bukti Lapangan
              </h3>
              <p className="text-[11px] text-slate-300">
                {task.pelanggan} · {task.jenis} · {task.tim || "Tim Teknisi"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* SOP Compliance Banner */}
          <div className="p-3 bg-blue-50/90 border border-blue-200/90 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-bold text-blue-950">Validasi SOP Penyelesaian Nexus Net</p>
              <p className="text-[11px] text-blue-800">
                Sebelum tiket dipindahkan ke status <b>SELESAI</b>, mohon lengkapi <b>hasil ukur OPM</b>, <b>nomor seri modem</b>, <b>meteran tarikan kabel riil</b>, dan <b>foto bukti fisik</b>. Port ODP dan komisi tim akan tersinkronisasi otomatis.
              </p>
            </div>
          </div>

          {task.jenis === "PEMUTUSAN" ? (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-extrabold text-rose-700">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Instruksi Pemutusan (Dismantle Perangkat)</span>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                1. Cabut kabel dropcore dari port tiang ODP <b>{task.odp || ""}</b>.<br />
                2. Tarik kembali unit modem ONT & adaptor dari rumah pelanggan.<br />
                3. Foto perangkat yang ditarik & barcode nomor seri modem.<br />
                <b>1 Port ODP otomatis dibebaskan</b> saat Anda menyimpan laporan ini.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Hasil Redaman Optik (dBm) <span className="text-rose-500 font-extrabold">* (Wajib)</span>
                </label>
                {dbmQuality && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${dbmQuality.color}`}>
                    <span className={`w-2 h-2 rounded-full ${dbmQuality.dot}`} />
                    {dbmQuality.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <Gauge className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={form.redaman}
                  onChange={(e) => setForm({ ...form, redaman: e.target.value })}
                  placeholder="Contoh: -19.5"
                  className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  dBm
                </span>
              </div>
              <OpticalPowerGauge value={form.redaman} mode="full" className="mt-2" />
            </div>
          )}

          {/* Nomor Seri Modem */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
              <span>
                Nomor Seri (SN) / MAC Modem ONT{" "}
                {task.jenis === "PEMASANGAN" && (
                  <span className="text-rose-500 font-extrabold">* (Wajib)</span>
                )}
              </span>
            </label>
            <input
              type="text"
              required={task.jenis === "PEMASANGAN"}
              autoCapitalize="characters"
              value={form.serialNumber}
              onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
              placeholder="Contoh: ZTEGC1234567 atau HWTC89ABC"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm uppercase font-mono focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
            />
          </div>

          {/* ODP Dropdown */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-blue-600" />
                <span>Titik Tiang ODP Terhubung</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                (Sinkron Radius / Port Terpakai)
              </span>
            </label>
            <select
              value={form.odp}
              onChange={(e) => setForm({ ...form, odp: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none cursor-pointer"
            >
              {(odpList || []).map((o) => (
                <option key={o.id || o.nama} value={o.nama}>
                  {o.nama} ({o.odc || "ODC"}) — {o.status || "Aman"}
                </option>
              ))}
            </select>
          </div>

          {/* Rincian Item Pekerjaan Lapangan & Klaim Komisi */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Rincian Pekerjaan Fisik</h4>
                  <p className="text-[10px] text-slate-500">Tabel Komisi Resmi Team Nexus</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Total Komisi:</span>
                <span className="text-sm font-black text-amber-700">
                  {formatRupiah(totalKomisi)}
                </span>
              </div>
            </div>

            {/* List Item Pekerjaan */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {workItems.map((item, idx) => {
                const master = KOMISI_MAP[item.id] || masterKomisi.find((m) => m.id === item.id) || { nama: item.id, satuan: "Unit", tarif: 0 };
                const subtotal = (Number(item.qty) || 0) * (master.tarif || 0);

                return (
                  <div key={item.id || idx} className="p-2 bg-white rounded-xl border border-amber-200/60 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{master.nama}</p>
                      <p className="text-[10px] text-slate-400">
                        {formatRupiah(master.tarif)} / {master.satuan}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => {
                            const step = master.satuan === "Meter" ? 10 : 1;
                            const newQty = Math.max(0, (Number(item.qty) || 0) - step);
                            setWorkItems((prev) => prev.map((it, i) => (i === idx ? { ...it, qty: newQty } : it)));
                          }}
                          className="px-2 py-0.5 hover:bg-slate-200 text-slate-600 font-bold text-xs cursor-pointer select-none"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={item.qty}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            setWorkItems((prev) => prev.map((it, i) => (i === idx ? { ...it, qty: val } : it)));
                          }}
                          className="w-14 text-center text-xs font-bold py-0.5 bg-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const step = master.satuan === "Meter" ? 10 : 1;
                            const newQty = (Number(item.qty) || 0) + step;
                            setWorkItems((prev) => prev.map((it, i) => (i === idx ? { ...it, qty: newQty } : it)));
                          }}
                          className="px-2 py-0.5 hover:bg-slate-200 text-slate-600 font-bold text-xs cursor-pointer select-none"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 w-8">{master.satuan}</span>
                      <span className="text-xs font-black text-slate-900 w-16 text-right">
                        {formatRupiah(subtotal)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setWorkItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-300 hover:text-rose-500 rounded cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tambah Item Pekerjaan Lain */}
            <div className="flex items-center gap-1.5 pt-1">
              <select
                value={selectedAddItem}
                onChange={(e) => setSelectedAddItem(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
              >
                <option value="">+ Tambah item pekerjaan lain...</option>
                {masterKomisi.filter((m) => !workItems.some((it) => it.id === m.id)).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nama} — {formatRupiah(m.tarif)}/{m.satuan}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedAddItem}
                onClick={() => {
                  if (!selectedAddItem) return;
                  const master = KOMISI_MAP[selectedAddItem];
                  const defaultQty = master?.satuan === "Meter" ? 50 : 1;
                  setWorkItems((prev) => [...prev, { id: selectedAddItem, qty: defaultQty }]);
                  setSelectedAddItem("");
                }}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-[#0D1B4A] rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Tambah
              </button>
            </div>
          </div>

          {/* Upload 3 Foto Bukti Lapangan */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>Foto Bukti Lapangan (SOP QC)</span>
                <span className="text-rose-500 font-extrabold text-[11px]">* (Wajib Min. 1 Foto)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                Kamera / File
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* 1. Foto OPM */}
              <div className="border border-slate-200 rounded-2xl p-1.5 bg-slate-50/80 flex flex-col items-center justify-center text-center relative min-h-[90px]">
                {form.fotoOpm ? (
                  <div className="relative w-full h-20 rounded-xl overflow-hidden shadow-xs">
                    <img src={form.fotoOpm} alt="Foto OPM" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto("fotoOpm")}
                      className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/70 text-white text-[8px] font-bold">
                      1. OPM
                    </span>
                  </div>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-1 hover:bg-slate-100 rounded-xl transition-colors">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
                      <Camera className="w-3 h-3" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700">1. Foto OPM</span>
                    <span className="text-[8px] text-slate-400">Bukti dBm</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(e, "fotoOpm")}
                    />
                  </label>
                )}
              </div>

              {/* 2. Foto Dropcore */}
              <div className="border border-slate-200 rounded-2xl p-1.5 bg-slate-50/80 flex flex-col items-center justify-center text-center relative min-h-[90px]">
                {form.fotoDropcore ? (
                  <div className="relative w-full h-20 rounded-xl overflow-hidden shadow-xs">
                    <img src={form.fotoDropcore} alt="Foto Dropcore" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto("fotoDropcore")}
                      className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/70 text-white text-[8px] font-bold">
                      2. Tiang ODP
                    </span>
                  </div>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-1 hover:bg-slate-100 rounded-xl transition-colors">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-1">
                      <Camera className="w-3 h-3" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700">2. Dropcore</span>
                    <span className="text-[8px] text-slate-400">Jalur Tiang</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(e, "fotoDropcore")}
                    />
                  </label>
                )}
              </div>

              {/* 3. Foto Modem */}
              <div className="border border-slate-200 rounded-2xl p-1.5 bg-slate-50/80 flex flex-col items-center justify-center text-center relative min-h-[90px]">
                {form.fotoModem ? (
                  <div className="relative w-full h-20 rounded-xl overflow-hidden shadow-xs">
                    <img src={form.fotoModem} alt="Foto Modem" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto("fotoModem")}
                      className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/70 text-white text-[8px] font-bold">
                      3. Modem ONT
                    </span>
                  </div>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-1 hover:bg-slate-100 rounded-xl transition-colors">
                    <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mb-1">
                      <Camera className="w-3 h-3" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700">3. Foto ONT</span>
                    <span className="text-[8px] text-slate-400">Modem Nyala</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(e, "fotoModem")}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Catatan Lapangan */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Catatan Lapangan (Opsional)
            </label>
            <textarea
              rows={2}
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              placeholder="Contoh: Kabel ditarik rapi 110 meter, modem menyala normal."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Sahkan & Simpan Selesai</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
