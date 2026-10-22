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
  Clock,
  MapPin,
  Maximize2,
  FileText,
  UserCheck,
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
import { compressAndWatermarkImage, getCurrentLocation } from "../lib/imageCompressor";

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
    meterDropcore: 100,
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

      // Temukan kuantitas meter kabel eksisting jika ada
      const meterItem = (defaultItems || []).find((it) => {
        const m = KOMISI_MAP[it.id] || (masterKomisi || []).find((x) => x.id === it.id);
        return m?.satuan === "Meter";
      });
      const initialMeter = meterItem ? Number(meterItem.qty) || 100 : (task.meter_kabel || 100);

      setWorkItems(defaultItems);
      setForm({
        redaman: task.redaman || (task.jenis === "PEMUTUSAN" ? "N/A" : "-19.5"),
        serialNumber: task.sn_modem || "",
        odp: task.odp || (odpList[0]?.nama || "ODP 1.1"),
        meterDropcore: initialMeter,
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

  // Handler sinkronisasi panjang kabel dropcore riil ke item komisi (Component 3)
  const handleMeterDropcoreChange = (value) => {
    const qty = Math.max(0, parseInt(value, 10) || 0);
    setForm((prev) => ({ ...prev, meterDropcore: qty }));

    setWorkItems((prev) => {
      let foundMeter = false;
      const updated = prev.map((it) => {
        const m = KOMISI_MAP[it.id] || (masterKomisi || []).find((x) => x.id === it.id);
        if (m?.satuan === "Meter") {
          foundMeter = true;
          return { ...it, qty };
        }
        return it;
      });

      if (!foundMeter) {
        const targetMeterId = task?.jenis === "PEMASANGAN" ? "tarik_pelanggan_baru" : "penarikan_ulang";
        return [...updated, { id: targetMeterId, qty }];
      }
      return updated;
    });
  };

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

  // Handle Upload 1 Foto Bukti Utama dengan Kompresi Otomatis & Watermark GPS
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast("Mengambil titik GPS & membubuhkan watermark QC...", "info");
      const location = await getCurrentLocation();

      const watermarkOptions = {
        label: task?.jenis === "PEMUTUSAN" ? "DISMANTLE PERANGKAT" : "DOKUMENTASI LAPANGAN",
        odp: form.odp || task?.odp || "ODP",
        customer: task?.pelanggan || "Pelanggan",
        technician: task?.tim || "Tim Teknisi",
        location: location,
      };

      const base64 = await compressAndWatermarkImage(file, watermarkOptions, 800, 800, 0.65);
      setForm((prev) => ({
        ...prev,
        fotoBuktiUtama: base64,
        fotoOpm: base64,
        fotoModem: base64,
      }));
      showToast("1 Foto Bukti Utama berhasil distempel GPS & dilampirkan!", "success");
    } catch (err) {
      console.warn("Watermark fallback direct base64:", err);
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
      reader.readAsDataURL(file);
    }
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
      timeline: [
        ...(Array.isArray(task.timeline) ? task.timeline : []),
        {
          timestamp: new Date().toISOString(),
          formattedTime: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          action: "Laporan Dikembalikan untuk Revisi",
          actor: "Supervisor (SPV)",
          color: "rose",
          notes: `Alasan: ${rejectReason.trim()}`,
        },
      ],
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
    const hasPhoto = Boolean(
      form.fotoBuktiUtama ||
      form.fotoOpm ||
      form.fotoModem ||
      task.foto_bukti_utama ||
      task.evidence?.foto_bukti_utama
    );

    // === VALIDASI SOP WAJIB (Hanya diperiksa jika bukan mode review validasi SPV) ===
    if (!isValidationMode) {
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
    }

    setIsSubmitting(true);

    const nowIso = new Date().toISOString();
    const cutoffEval = evaluateReportSubmissionTime(nowIso);

    const itemsSummaryStr = (workItems || [])
      .filter((it) => (Number(it.qty) || 0) > 0)
      .map((it) => `${KOMISI_MAP[it.id]?.nama || it.id}: ${it.qty} ${KOMISI_MAP[it.id]?.satuan || ""}`)
      .join(", ");

    const finalPhoto = form.fotoBuktiUtama || form.fotoOpm || form.fotoModem || task.foto_bukti_utama || task.evidence?.foto_bukti_utama;
    const finalPayload = {
      ...task,
      status: targetStatus,
      redaman: form.redaman || task.redaman,
      sn_modem: form.serialNumber || task.sn_modem,
      odp: form.odp || task.odp,
      foto_bukti_utama: finalPhoto,
      foto_opm: finalPhoto,
      foto_modem: finalPhoto,
      waktu_lapor: task.waktu_lapor || nowIso,
      cutoff_status: task.cutoff_status || cutoffEval.status,
      cutoff_label: task.cutoff_label || cutoffEval.label,
      revisi_catatan: null, // Bersihkan catatan revisi saat laporan disetujui / dikirim ulang
      evidence: {
        ...(task.evidence || {}),
        foto_bukti_utama: finalPhoto,
        foto_opm: finalPhoto,
        foto_modem: finalPhoto,
        redaman: form.redaman || task.redaman,
        sn_modem: form.serialNumber || task.sn_modem,
        odp: form.odp || task.odp,
        catatan: form.catatan || task.keterangan,
        waktu_lapor: task.waktu_lapor || nowIso,
        cutoff_status: task.cutoff_status || cutoffEval.status,
        cutoff_label: task.cutoff_label || cutoffEval.label,
      },
      komisi_items: workItems,
      komisi_total: totalKomisi,
      waktu_selesai: targetStatus === "SELESAI" ? nowIso : task.waktu_selesai,
      timeline: [
        ...(Array.isArray(task.timeline) ? task.timeline : []),
        {
          timestamp: nowIso,
          formattedTime: new Date(nowIso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          action: targetStatus === "SELESAI" ? "Pekerjaan Divalidasi & Disahkan" : "Laporan 1 Foto Terkirim",
          actor: isValidationMode ? "Supervisor (SPV)" : "Teknisi Lapangan",
          color: targetStatus === "SELESAI" ? "emerald" : "purple",
          notes: targetStatus === "SELESAI"
            ? `Tiket disetujui. Redaman OPM: ${form.redaman || task.redaman || "-"} dBm. Komisi disahkan: ${formatRupiah(totalKomisi)}.`
            : `Laporan 1 foto fisik diunggah (${cutoffEval.label}). Menunggu validasi SPV.`,
        },
      ],
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

  const displayedPhoto = form.fotoBuktiUtama || form.fotoOpm || form.fotoModem || task.foto_bukti_utama || task.evidence?.foto_bukti_utama;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-xl w-full border border-gray-100 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Mobile Drag Indicator Handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-2.5 sm:hidden" />

        {/* Modal Header */}
        <div className={`p-5 text-white flex items-center justify-between rounded-t-3xl sm:rounded-t-3xl ${
          isValidationMode ? "bg-gradient-to-r from-purple-900 to-[#0D1B4A]" : "bg-gradient-to-r from-[#0D1B4A] to-slate-900"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              isValidationMode ? "bg-purple-500/20 text-purple-300 border-purple-400/30" : "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
            }`}>
              {isValidationMode ? <UserCheck className="w-5 h-5 text-purple-300" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight">
                {isValidationMode ? "Verifikasi & Pengesahan Laporan" : "Laporan Selesai Pengerjaan"}
              </h3>
              <p className="text-white/70 text-xs font-medium">
                {task.pelanggan || "Pelanggan"} &bull; {task.jenis || "Pekerjaan"} &bull; {task.tim || "-"}
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
          {/* ============================================================== */}
          {/* MODE 1: REVIEW & INSPEKSI EKSKLUSIF BAGI SUPERVISOR / ADMIN     */}
          {/* ============================================================== */}
          {isValidationMode ? (
            <div className="space-y-4">
              {/* Banner Status Laporan Menunggu Validasi */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between text-xs text-purple-950">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="font-bold">Laporan Dikirim Teknisi Lapangan</span>
                </div>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-purple-200/80 text-purple-800">
                  {task.cutoff_label || "Laporan Harian"}
                </span>
              </div>

              {/* FOTO BUKTI UTAMA LAPANGAN (TERBESAR & JELAS DI ATAS) */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 shadow-xs relative">
                {displayedPhoto ? (
                  <div className="relative w-full min-h-[220px] max-h-[320px] flex items-center justify-center bg-black/90">
                    <img
                      src={displayedPhoto}
                      alt="Bukti Fisik Lapangan"
                      className="w-full h-full max-h-[320px] object-contain"
                    />
                    <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold flex items-center gap-1.5 border border-white/20">
                      <Camera className="w-3 h-3 text-emerald-400" />
                      <span>1 Foto Bukti Utama Berstempel GPS</span>
                    </div>
                    {task.waktu_lapor && (
                      <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold border border-white/20">
                        {new Date(task.waktu_lapor).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-semibold">Tidak ada foto fisik yang terlampir.</p>
                  </div>
                )}
              </div>

              {/* KARTU RINGKASAN HASIL UJI LAPANGAN (READ-ONLY) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {/* Redaman OPM */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Hasil Redaman OPM
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-black text-slate-900 font-mono">
                      {form.redaman || task.redaman || "-"} dBm
                    </span>
                  </div>
                  {dbmQuality && (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold border ${dbmQuality.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dbmQuality.dot}`} />
                      {dbmQuality.status}
                    </span>
                  )}
                </div>

                {/* SN Modem ONT */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    SN Modem ONT
                  </span>
                  <p className="text-xs font-black text-slate-900 font-mono truncate" title={form.serialNumber || task.sn_modem}>
                    {form.serialNumber || task.sn_modem || "-"}
                  </p>
                  <span className="text-[10px] text-slate-400 block">Barcode Terverifikasi</span>
                </div>

                {/* Titik Tiang ODP */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Titik ODP
                  </span>
                  <p className="text-xs font-black text-blue-700 truncate" title={form.odp || task.odp}>
                    {form.odp || task.odp || "-"}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-semibold block">1 Port Siap Aktif</span>
                </div>
              </div>

              {/* Catatan Lapangan dari Teknisi */}
              {(form.catatan || task.keterangan) && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                  <span className="font-bold text-slate-900 block mb-0.5">Catatan Teknisi:</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed italic">
                    "{form.catatan || task.keterangan}"
                  </p>
                </div>
              )}

              {/* RINCIAN KOMISI TIM (DAPAT DISESUAIKAN SPV) */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Coins className="w-4 h-4 text-amber-600" />
                    <span>Rincian Klaim Komisi Tim ({task.tim || "Teknisi"})</span>
                  </div>
                  <span className="text-sm font-black text-amber-800">
                    {formatRupiah(totalKomisi)} / org
                  </span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {workItems.map((item, idx) => {
                    const master = KOMISI_MAP[item.id] || masterKomisi.find((m) => m.id === item.id) || { nama: item.id, satuan: "Unit", tarif: 0 };
                    const subtotal = (Number(item.qty) || 0) * (master.tarif || 0);

                    return (
                      <div key={item.id || idx} className="p-2 bg-white rounded-xl border border-amber-200/60 flex items-center justify-between gap-2 text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 truncate">{master.nama}</p>
                          <p className="text-[10px] text-slate-400">{formatRupiah(master.tarif)} / {master.satuan}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold text-slate-700">
                            {item.qty} {master.satuan}
                          </span>
                          <span className="font-black text-slate-900 w-16 text-right">
                            {formatRupiah(subtotal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* MODE 2: INPUT FORM LAPORAN LAPANGAN BAGI TEKNISI                */
            /* ============================================================== */
            <div className="space-y-4">
              {/* SOP Compliance Banner */}
              <div className="p-3 bg-emerald-50/90 border border-emerald-200/90 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>Validasi SOP Selesai — Cukup 1 Foto Bukti Utama</span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-emerald-600 text-white rounded font-semibold">1 Foto Cukup</span>
                  </p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Cukup lampirkan <b>1 foto fisik berstempel GPS/kamera</b> (layar OPM, modem menyala, atau fisik penanganan). Lengkapi data angka/teks, maka tiket <b>SELESAI</b>, status Port ODP, dan komisi tim langsung tersinkronisasi otomatis.
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

              {/* Nomor Seri Modem ONT */}
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

              {/* Input Panjang Tarikan Dropcore Riil (Otomatis Sinkron ke Komisi) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Panjang Tarikan Kabel Dropcore (Meter)</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ⚡ Auto-Sync ke Komisi
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.meterDropcore}
                  onChange={(e) => handleMeterDropcoreChange(e.target.value)}
                  placeholder="Contoh: 125"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                />
              </div>

              {/* Titik ODP */}
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
                                if (master.satuan === "Meter") setForm((prev) => ({ ...prev, meterDropcore: newQty }));
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
                                if (master.satuan === "Meter") setForm((prev) => ({ ...prev, meterDropcore: val }));
                              }}
                              className="w-12 text-center text-xs font-bold py-0.5 bg-white outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const step = master.satuan === "Meter" ? 10 : 1;
                                const newQty = (Number(item.qty) || 0) + step;
                                setWorkItems((prev) => prev.map((it, i) => (i === idx ? { ...it, qty: newQty } : it)));
                                if (master.satuan === "Meter") setForm((prev) => ({ ...prev, meterDropcore: newQty }));
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

              {/* Laporan 1 Foto Bukti Utama Lapangan (dengan Kompresi & Watermark GPS) */}
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
            </div>
          )}

          {/* Area Input Alasan Penolakan / Permintaan Revisi SPV */}
          {showRejectInput && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Alasan Penolakan / Permintaan Revisi Lapangan:</span>
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

          {/* Action Buttons: Mode Review vs Mode Input Teknisi */}
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
                  className="py-2.5 px-4 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Kembalikan / Minta Revisi</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, "SELESAI")}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>✓ Setujui & Sahkan Tiket Selesai</span>
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
