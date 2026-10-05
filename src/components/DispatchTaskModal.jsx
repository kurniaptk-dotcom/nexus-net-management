import { useState, useMemo, useEffect } from "react";
import {
  X,
  HardHat,
  Send,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Network,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  MessageCircle,
  Wifi,
  XCircle,
  Wrench,
  Navigation,
  FileText,
  User,
  Info,
} from "lucide-react";
import {
  TASK_TYPES,
  TASK_PRIORITIES,
  TIME_SESSIONS,
  DEFAULT_TEAMS,
  generateSpkNumber,
  formatSpkWaText,
  generateSpkWaUrl,
  getTeamWorkload,
  formatPhoneWa,
} from "../lib/spkGenerator";
import { checkPortCollision, getOdpPortMap } from "../lib/portCollision";
import { enrichOdpWithPortUtilization } from "../lib/odpUtilization";
import { usePersistState } from "../hooks/usePersistState";
import WorkItemsChecklist from "./WorkItemsChecklist";
import {
  KOMISI_PEKERJAAN_MASTER,
  getDefaultWorkItemsForTask,
  calculateKomisiItemsTotal,
} from "../lib/incentives";

export default function DispatchTaskModal({
  isOpen,
  onClose,
  initialData = {},
  onSave,
  odpList = [],
  pelangganList = [],
  timList = [],
  taskList = [],
}) {
  if (!isOpen) return null;

  // Tim teknisi gabungan (dari DB atau default jika kosong)
  const availableTeams = useMemo(() => {
    if (Array.isArray(timList) && timList.length > 0) return timList;
    return DEFAULT_TEAMS;
  }, [timList]);

  // Perkaya ODP dengan status utilisasi real-time
  const enrichedOdps = useMemo(() => {
    return enrichOdpWithPortUtilization(odpList, pelangganList);
  }, [odpList, pelangganList]);

  // Nomor SPK yang akan diterbitkan
  const [spkNo, setSpkNo] = useState("");

  const [masterKomisi] = usePersistState("xnet_master_komisi", KOMISI_PEKERJAAN_MASTER);

  // Form State
  const [form, setForm] = useState({
    jenis: "PEMASANGAN",
    prioritas: "NORMAL",
    tim: availableTeams[0]?.nama || "AZWAR - RIO",
    tanggal: new Date().toISOString().split("T")[0],
    sesi: "Pagi (08:30 - 12:00 WIB)",
    pelanggan: "",
    telepon: "",
    alamat: "",
    shareloc: "",
    odp: "",
    port: "",
    paket: "Home Fiber 30 Mbps",
    keterangan: "",
    sourceModule: "", // "LEADS" | "GANGGUAN" | "RADIUS" | "MANUAL"
    sourceId: null,
    komisi_items: [],
    komisi_total: 0,
  });

  const [copiedWa, setCopiedWa] = useState(false);
  const [showWaPreview, setShowWaPreview] = useState(false);

  // Inisialisasi data form saat modal dibuka dengan initialData
  useEffect(() => {
    if (isOpen) {
      const detectedJenis = initialData.jenis || (initialData.sourceModule === "GANGGUAN" ? "PERBAIKAN" : "PEMASANGAN");
      const generatedNo = generateSpkNumber(detectedJenis, initialData.sourceId || Date.now());
      setSpkNo(generatedNo);

      // Cari ODP awal (bisa dari ODP terdekat survey atau ODP pelanggan eksisting)
      let initialOdpName = initialData.odp || initialData.odp_terdekat || "";
      if (initialOdpName && initialOdpName.includes(" - ")) {
        initialOdpName = initialOdpName.split(" - ")[0].trim();
      }

      const initialWorkItems = Array.isArray(initialData.komisi_items) && initialData.komisi_items.length > 0
        ? initialData.komisi_items
        : getDefaultWorkItemsForTask(detectedJenis, 100, masterKomisi);
      const initialWorkTotal = initialData.komisi_total !== undefined && initialData.komisi_total !== null
        ? initialData.komisi_total
        : calculateKomisiItemsTotal(initialWorkItems, masterKomisi);

      setForm({
        jenis: detectedJenis,
        prioritas: initialData.prioritas || (detectedJenis === "PERBAIKAN" ? "TINGGI" : "NORMAL"),
        tim: initialData.tim || availableTeams[0]?.nama || "AZWAR - RIO",
        tanggal: initialData.tanggal || new Date().toISOString().split("T")[0],
        sesi: initialData.sesi || "Pagi (08:30 - 12:00 WIB)",
        pelanggan: initialData.pelanggan || initialData.nama || "",
        telepon: initialData.telepon || initialData.kontak || "",
        alamat: initialData.alamat || "",
        shareloc: initialData.shareloc || "",
        odp: initialOdpName || (enrichedOdps[0]?.nama || "ODP 1.1"),
        port: initialData.port || "",
        paket: initialData.paket || "Home Fiber 30 Mbps",
        keterangan: initialData.keterangan || initialData.keterangan_survey || "",
        sourceModule: initialData.sourceModule || "MANUAL",
        sourceId: initialData.sourceId || null,
        jarak_odp: initialData.jarak_odp || "",
        redaman: initialData.redaman || "",
        komisi_items: initialWorkItems,
        komisi_total: initialWorkTotal,
      });
    }
  }, [isOpen, initialData, availableTeams, enrichedOdps, masterKomisi]);

  // Cek detail ODP yang sedang dipilih
  const selectedOdpInfo = useMemo(() => {
    if (!form.odp) return null;
    return enrichedOdps.find((o) => o.nama?.toUpperCase() === form.odp.toUpperCase()) || null;
  }, [form.odp, enrichedOdps]);

  // Port mapping & collision check
  const portMap = useMemo(() => {
    if (!form.odp) return [];
    return getOdpPortMap(form.odp, enrichedOdps, pelangganList);
  }, [form.odp, enrichedOdps, pelangganList]);

  const collisionCheck = useMemo(() => {
    if (!form.odp || !form.port) return { isConflict: false };
    return checkPortCollision(form.odp, form.port, enrichedOdps, pelangganList);
  }, [form.odp, form.port, enrichedOdps, pelangganList]);

  // Dapatkan nomor telepon tim terpilih
  const selectedTeamObj = useMemo(() => {
    return availableTeams.find((t) => t.nama === form.tim) || null;
  }, [form.tim, availableTeams]);

  // Naskah teks WhatsApp live preview
  const waPreviewText = useMemo(() => {
    return formatSpkWaText({ ...form, spk_no: spkNo }, spkNo);
  }, [form, spkNo]);

  const handleCopyWa = () => {
    navigator.clipboard.writeText(waPreviewText);
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2500);
  };

  const handleSubmit = (sendWaDirectly = false) => {
    const trimmedPelanggan = (form.pelanggan || "").trim();
    if (!trimmedPelanggan) {
      alert("Silakan masukkan nama pelanggan / tujuan pekerjaan.");
      return;
    }

    const cleanPhone = formatPhoneWa(form.telepon);

    const payload = {
      ...form,
      pelanggan: trimmedPelanggan,
      telepon: cleanPhone || (form.telepon || "").trim(),
      alamat: (form.alamat || "").trim(),
      shareloc: (form.shareloc || "").trim(),
      keterangan: (form.keterangan || "").trim(),
      id: initialData.id || Date.now(),
      spk_no: spkNo,
      status: "WAITING LIST",
      created_at: new Date().toISOString(),
      komisi_items: form.komisi_items || [],
      komisi_total: form.komisi_total !== undefined
        ? Number(form.komisi_total)
        : calculateKomisiItemsTotal(form.komisi_items || [], masterKomisi),
    };

    onSave(payload, sendWaDirectly);

    if (sendWaDirectly) {
      const waUrl = generateSpkWaUrl(payload, selectedTeamObj?.telepon, spkNo);
      window.open(waUrl, "_blank");
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in overflow-hidden">
      <div className="bg-white w-full max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-100 mt-auto sm:my-auto overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Mobile Swipe Bar Indicator */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-gradient-to-r from-slate-900 via-[#0D1B4A] to-slate-900">
          <div className="w-12 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-[#0D1B4A] to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold shrink-0 border border-amber-400/30">
              <HardHat className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base text-white">
                  Surat Perintah Kerja (SPK) Lapangan
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-amber-400 text-slate-950">
                  {spkNo}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Sistem Penugasan Tim Teknisi · Distribusi Tugas & Dispatch Operasional
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {/* 1. Pilih Jenis Penugasan */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              1. Pilih Jenis Penugasan Lapangan <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.values(TASK_TYPES).map((type) => {
                const isSelected = form.jenis === type.key;
                return (
                  <button
                    key={type.key}
                    type="button"
                    onClick={() => {
                      const newItems = getDefaultWorkItemsForTask(type.key, 100, masterKomisi);
                      const newTotal = calculateKomisiItemsTotal(newItems, masterKomisi);
                      setForm((prev) => ({
                        ...prev,
                        jenis: type.key,
                        komisi_items: newItems,
                        komisi_total: newTotal,
                      }));
                      setSpkNo(generateSpkNumber(type.key, initialData.sourceId || Date.now()));
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-[#0D1B4A] bg-[#0D1B4A]/5 ring-2 ring-[#0D1B4A] shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-extrabold text-slate-900">{type.label}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-[#0D1B4A]" />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">{type.code}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                      {type.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Checklist Lingkup Pekerjaan & Komisi SPK */}
          <WorkItemsChecklist
            jenis={form.jenis}
            value={form.komisi_items || []}
            onChange={(newItems) => {
              const newTotal = calculateKomisiItemsTotal(newItems, masterKomisi);
              setForm((prev) => ({
                ...prev,
                komisi_items: newItems,
                komisi_total: newTotal,
              }));
            }}
            masterList={masterKomisi}
          />

          {/* 2. Informasi Pelanggan & Lokasi */}
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <User className="w-4 h-4 text-[#0D1B4A]" />
              <span>Data Pelanggan & Lokasi Kunjungan</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Pelanggan / Pelapor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.pelanggan}
                  onChange={(e) => setForm({ ...form, pelanggan: e.target.value })}
                  placeholder="Contoh: Bpk. Kurnia / Toko Berkah"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nomor Telepon / WhatsApp <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={form.telepon}
                    onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                    placeholder="081234567890"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Alamat Lengkap / Patokan Rumah
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={form.alamat}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  placeholder="Jl. Perintis Kemerdekaan No. 12 (Samping Masjid)"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                />
              </div>
            </div>

            {form.shareloc && (
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
                <span className="truncate pr-2">📍 Peta/Shareloc: {form.shareloc}</span>
                <a
                  href={form.shareloc.startsWith("http") ? form.shareloc : `https://maps.google.com/?q=${form.shareloc}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline shrink-0"
                >
                  <span>Buka Peta</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* 3. Jaringan: ODP & Pengecekan Kapasitas Port */}
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Network className="w-4 h-4 text-purple-600" />
                <span>Titik ODP & Alokasi Port Jaringan</span>
              </div>
              {selectedOdpInfo && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedOdpInfo.port_is_full
                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  }`}
                >
                  {selectedOdpInfo.port_is_full
                    ? "⛔ ODP PENUH"
                    : `Sisa ${selectedOdpInfo.port_sisa || 0} dari ${selectedOdpInfo.port_kapasitas || 8} Port`}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Pilih ODP Target <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.odp}
                  onChange={(e) => setForm({ ...form, odp: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                >
                  {enrichedOdps.map((o) => (
                    <option key={o.id || o.nama} value={o.nama}>
                      {o.nama} ({o.odc || "ODC"} · {o.port_is_full ? "PENUH" : `Sisa ${o.port_sisa} Port`})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nomor Port ODP {form.jenis === "PEMUTUSAN" ? "(Yang Akan Dilepas)" : "(Opsional / Bebas)"}
                </label>
                <select
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                >
                  <option value="">-- Ditentukan Teknisi di Lapangan --</option>
                  {portMap.map((p) => (
                    <option key={p.portNumber} value={p.portNumber}>
                      Port {p.portNumber} {p.isOccupied ? `(Terisi: ${p.customerName})` : "(Kosong)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Peringatan ODP Penuh Jika Jenis Pemasangan Baru */}
            {form.jenis === "PEMASANGAN" && selectedOdpInfo && selectedOdpInfo.port_is_full && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">PERINGATAN: ODP {form.odp} Sudah Penuh!</p>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Semua {selectedOdpInfo.port_kapasitas || 8} port sudah digunakan pelanggan aktif.
                    Pemasangan baru di tiang ini berisiko tabrakan port kecuali splitter diganti atau dialihkan ke ODP terdekat lainnya.
                  </p>
                </div>
              </div>
            )}

            {/* Peringatan Tabrakan Port Fisik */}
            {collisionCheck.isConflict && form.jenis === "PEMASANGAN" && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Port {form.port} Sudah Terisi!</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Port ini sedang terpakai oleh pelanggan <b>{collisionCheck.conflictingCustomer}</b>.
                    Pilih port yang masih berstatus (Kosong) untuk menghindari putusnya koneksi pelanggan lain.
                  </p>
                </div>
              </div>
            )}

            {/* Keterangan Pemutusan Port */}
            {form.jenis === "PEMUTUSAN" && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Setelah teknisi menyelesaikan tugas ini dan mencabut konektor di tiang, <b>1 port pada {form.odp} otomatis dibebaskan</b> dan status pelanggan diubah menjadi <b>PUTUS</b>.
                </p>
              </div>
            )}
          </div>

          {/* 4. Pemilihan Tim, Tanggal, Sesi & Prioritas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tim Teknisi */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Tugaskan Ke Tim Teknisi <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.tim}
                onChange={(e) => setForm({ ...form, tim: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#0D1B4A] outline-none"
              >
                {availableTeams.map((t) => {
                  const workload = getTeamWorkload(t.nama, taskList);
                  return (
                    <option key={t.id || t.nama} value={t.nama}>
                      {t.nama} {workload > 0 ? `(${workload} Tugas Aktif)` : "(Siap / Bebas)"}
                    </option>
                  );
                })}
              </select>
              {selectedTeamObj && (
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <span>📱 WA Tim: {selectedTeamObj.telepon || "Tidak dicatat"}</span>
                  {selectedTeamObj.area && <span>· Area: {selectedTeamObj.area}</span>}
                </p>
              )}
            </div>

            {/* Tingkat Prioritas */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Tingkat Prioritas (SLA)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.values(TASK_PRIORITIES).map((prio) => {
                  const isSel = form.prioritas === prio.key;
                  return (
                    <button
                      key={prio.key}
                      type="button"
                      onClick={() => setForm({ ...form, prioritas: prio.key })}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        isSel
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${prio.dot}`} />
                      <span className="truncate">{prio.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tanggal Pelaksanaan */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Target Tanggal Pengerjaan <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                  required
                />
              </div>
            </div>

            {/* Sesi Waktu */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Sesi Waktu Kunjungan
              </label>
              <select
                value={form.sesi}
                onChange={(e) => setForm({ ...form, sesi: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#0D1B4A] outline-none"
              >
                {TIME_SESSIONS.map((s) => (
                  <option key={s.key} value={s.label}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Catatan & Instruksi Khusus */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Catatan & Instruksi Khusus Lapangan
            </label>
            <textarea
              rows={2}
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              placeholder={
                form.jenis === "PEMUTUSAN"
                  ? "Contoh: Bawa formulir pengembalian modem ONT, pastikan adaptor dan kabel patchcord ditarik."
                  : form.jenis === "PERBAIKAN"
                  ? "Contoh: Laporan LOS kabel putus terkena dahan pohon di dekat tiang listrik."
                  : "Contoh: Pelanggan minta dipasang sore jam 16:00, perkiraan kabel 85 meter."
              }
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#0D1B4A] outline-none"
            />
          </div>

          {/* 6. Pratinjau Teks WhatsApp SPK (Collapsible) */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
            <button
              type="button"
              onClick={() => setShowWaPreview(!showWaPreview)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Pratinjau Format Surat Perintah Kerja (WhatsApp SPK)</span>
              </div>
              <span className="text-slate-400 font-normal">
                {showWaPreview ? "Sembunyikan ▲" : "Lihat Format Pesan ▼"}
              </span>
            </button>

            {showWaPreview && (
              <div className="p-4 border-t border-slate-200 space-y-2">
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {waPreviewText}
                </pre>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleCopyWa}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedWa ? "Tersalin!" : "Salin Teks SPK"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-5 border-t border-slate-200/80 bg-white/95 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 sticky bottom-0 z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
          <div className="text-xs text-slate-500 flex items-center gap-1.5 order-2 sm:order-1">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Tugas otomatis masuk ke antrean papan kanban teknisi.</span>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
            <button
              type="button"
              onClick={onClose}
              className="col-span-1 sm:flex-none px-4 py-2.5 min-h-[42px] rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="col-span-1 sm:flex-none px-4 py-2.5 min-h-[42px] rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Simpan Saja
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="col-span-2 sm:col-span-1 sm:flex-none px-4 py-2.5 min-h-[42px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span>Simpan & Kirim SPK WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
