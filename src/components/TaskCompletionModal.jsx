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
  AlertTriangle,
} from "lucide-react";
import OpticalPowerGauge, { evaluateDbm } from "./OpticalPowerGauge";
import {
  formatRupiah,
  KOMISI_PEKERJAAN_MASTER,
  KOMISI_MAP,
  getDefaultWorkItemsForTask,
} from "../lib/incentives";
import { showToast } from "../lib/toast";
import { evaluateReportSubmissionTime, getWibTimeParts } from "../lib/reportCutoff";

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
    fotoBuktiUtama: null,
    fotoOpm: null,
    fotoDropcore: null,
    fotoModem: null,
  });

  const [workItems, setWorkItems] = useState([]);
  const [selectedAddItem, setSelectedAddItem] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const isValidationMode = task?.status === "MENUNGGU VALIDASI";

  // Inisialisasi data form ketika modal dibuka
  useEffect(() => {
    if (isOpen && task) {
      const defaultItems = Array.isArray(task.komisi_items) && task.komisi_items.length > 0
        ? task.komisi_items
        : getDefaultWorkItemsForTask(task.jenis, 100, masterKomisi);

      const existingPhoto = task.foto_bukti_utama || task.foto_opm || task.evidence?.foto_bukti_utama || task.evidence?.foto_opm || null;

      setWorkItems(defaultItems);
      setForm({
        redaman: task.redaman || (task.jenis === "PEMUTUSAN" ? "N/A" : "-19.5"),
        serialNumber: task.sn_modem || "",
        odp: task.odp || (odpList[0]?.nama || "ODP 1.1"),
        catatan: task.keterangan || "",
        fotoBuktiUtama: existingPhoto,
        fotoOpm: task.foto_opm || task.evidence?.foto_opm || existingPhoto,
        fotoDropcore: task.evidence?.foto_dropcore || null,
        fotoModem: task.foto_modem || task.evidence?.foto_modem || existingPhoto,
      });
      setSelectedAddItem("");
      setIsSubmitting(false);
      setShowRejectInput(false);
      setRejectReason("");
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

  // Handle Upload 1 Foto Bukti Utama (Base64)
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        fotoBuktiUtama: reader.result,
        fotoOpm: reader.result,
        fotoModem: reader.result,
      }));
      showToast("1 Foto Bukti Utama berhasil dilampirkan!", "success");
    };
    reader.onerror = () => {
      showToast("Gagal membaca file foto", "error");
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setForm((prev) => ({
      ...prev,
      fotoBuktiUtama: null,
      fotoOpm: null,
      fotoModem: null,
      fotoDropcore: null,
    }));
  };

  // Handler SPV Tolak / Minta Revisi ke Teknisi
  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) {
      showToast("Mohon isi alasan penolakan/revisi agar teknisi tahu apa yang perlu diperbaiki.", "error");
      return;
    }

    const finalPayload = {
      ...task,
      status: "DIJADWALKAN",
      revisi_catatan: rejectReason.trim(),
      revisi_at: new Date().toISOString(),
      revisi_by: "Supervisor",
      revisi_count: (task.revisi_count || 0) + 1,
    };

    onComplete(finalPayload);
    showToast(`Pekerjaan "${task.pelanggan}" dikembalikan ke teknisi untuk revisi!`, "warning");
    setShowRejectInput(false);
    onClose();
  };

  // Submit Handler dengan Validasi Laporan 1 Foto & Alur Status
  const handleSubmit = (e, targetStatus = "MENUNGGU VALIDASI") => {
    if (e && e.preventDefault) e.preventDefault();
    if (!task || isSubmitting) return;

    const isPemutusan = task.jenis === "PEMUTUSAN";
    const isPemasangan = task.jenis === "PEMASANGAN";
    const hasPhoto = Boolean(form.fotoBuktiUtama || form.fotoOpm || form.fotoModem);

    // === VALIDASI SOP WAJIB ===
    if (isPemasangan) {
      if (!form.redaman || isNaN(parseFloat(form.redaman))) {
        showToast("SOP Wajib: Masukkan hasil ukur redaman OPM yang valid (contoh: -19.5 dBm).", "error");
        return;
      }
      if (!form.serialNumber || !form.serialNumber.trim()) {
        showToast("SOP Wajib: Nomor Seri (SN) modem ONT wajib diisi untuk pemasangan baru.", "error");
        return;
      }
      if (!hasPhoto) {
        showToast("SOP Wajib: Lampirkan 1 Foto Bukti Utama (Foto OPM atau Foto ONT) sebelum menyelesaikan laporan.", "error");
        return;
      }
    } else if (isPemutusan) {
      if (!hasPhoto) {
        showToast("SOP Wajib: Lampirkan 1 foto bukti perangkat yang ditarik atau port ODP yang dicabut.", "error");
        return;
      }
    } else {
      // Perbaikan / Gangguan / Khusus
      if (!hasPhoto) {
        showToast("SOP Wajib: Lampirkan 1 foto bukti fisik pengerjaan lapangan.", "error");
        return;
      }
    }

    // Validasi Item Pekerjaan & Komisi
    const hasValidWorkItem = (workItems || []).some((it) => (Number(it.qty) || 0) > 0);
    if (!hasValidWorkItem) {
      showToast("SOP Wajib: Masukkan minimal 1 rincian item pekerjaan fisik untuk perhitungan komisi.", "error");
      return;
    }

    setIsSubmitting(true);

    const nowIso = new Date().toISOString();
    const cutoffEval = evaluateReportSubmissionTime(nowIso);

    const itemsSummaryStr = (workItems || [])
      .filter((it) => (Number(it.qty) || 0) > 0)
      .map((it) => `${KOMISI_MAP[it.id]?.nama || it.id}: ${it.qty} ${KOMISI_MAP[it.id]?.satuan || ""}`)
      .join(", ");

    const finalPhoto = form.fotoBuktiUtama || form.fotoOpm || form.fotoModem;
    const finalPayload = {
      ...task,
      status: targetStatus,
      redaman: form.redaman,
      sn_modem: form.serialNumber,
      odp: form.odp || task.odp,
      foto_bukti_utama: finalPhoto,
      foto_opm: finalPhoto,
      foto_modem: finalPhoto,
      waktu_lapor: nowIso,
      cutoff_status: cutoffEval.status,
      cutoff_label: cutoffEval.label,
      evidence: {
        foto_bukti_utama: finalPhoto,
        foto_opm: finalPhoto,
        foto_modem: finalPhoto,
        redaman: form.redaman,
        sn_modem: form.serialNumber,
        odp: form.odp || task.odp,
        catatan: form.catatan,
        waktu_lapor: nowIso,
        cutoff_status: cutoffEval.status,
        cutoff_label: cutoffEval.label,
      },
      komisi_items: workItems,
      komisi_total: totalKomisi,
      waktu_selesai: targetStatus === "SELESAI" ? nowIso : task.waktu_selesai,
      keterangan: form.catatan
        ? `${form.catatan} ${itemsSummaryStr ? `| Rincian: ${itemsSummaryStr}` : ""}`
        : itemsSummaryStr
        ? `Laporan 1 Foto · Rincian: ${itemsSummaryStr}`
        : "Laporan 1 foto pengerjaan lapangan.",
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

          {/* Batas Cut-Off Laporan Harian Jam 9 Malam (21:00 WIB) */}
          <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between text-slate-700">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Batas Laporan Harian: <b>Maksimal Jam 21:00 WIB</b> (Jam 9 Malam)</span>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
              WIB: {getWibTimeParts(new Date()).formattedTime}
            </span>
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

          {/* Laporan 1 Foto Bukti Utama Lapangan */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Laporan 1 Foto Bukti Utama</span>
                <span className="text-rose-500 font-extrabold text-[11px]">* (Wajib 1 Foto)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                Kamera / Galeri
              </span>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-3 bg-slate-50/80 flex flex-col items-center justify-center text-center relative min-h-[140px]">
              {form.fotoBuktiUtama ? (
                <div className="relative w-full h-36 rounded-xl overflow-hidden shadow-xs">
                  <img
                    src={form.fotoBuktiUtama}
                    alt="1 Foto Bukti Utama"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer shadow-md"
                    title="Hapus foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-bold">
                    ✓ 1 Foto Bukti Utama Terlampir
                  </span>
                </div>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 hover:bg-slate-100/90 rounded-xl transition-colors">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 shadow-xs">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Ambil / Unggah 1 Foto Bukti Utama</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Foto OPM / Modem ONT menyala / Penanganan Fisik</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
              )}
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
              placeholder="Contoh: Kabel ditarik rapi 90 meter, modem menyala prima, sinyal stabil."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
            />
          </div>

          {/* Area Input Alasan Revisi SPV */}
          {showRejectInput && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Alasan Penolakan / Permintaan Revisi:</span>
              </div>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Foto OPM buram/tidak terbaca, atau redaman drop -28 dBm melebihi batas standar -23 dBm."
                className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs text-rose-900 placeholder:text-rose-300 focus:ring-2 focus:ring-rose-500 outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectInput(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleRejectSubmit}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition-all shadow-xs"
                >
                  Konfirmasi Kembalikan ke Teknisi
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons: Teknisi kirim laporan atau Admin/SPV langsung validasi / tolak */}
          <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>

            {isValidationMode ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowRejectInput(!showRejectInput)}
                  className="py-2.5 px-3.5 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Tolak / Minta Revisi</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, "SELESAI")}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Validasi Selesai & Sahkan Komisi</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, "MENUNGGU VALIDASI")}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-3 text-xs font-bold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-900 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>Kirim Laporan 1 Foto (Menunggu Validasi)</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, "SELESAI")}
                  disabled={isSubmitting}
                  className="py-2.5 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Selesai Langsung</span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
