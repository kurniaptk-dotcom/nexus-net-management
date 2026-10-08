import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit2, Trash2, Target, Phone, MapPin, Calendar, Globe, Radio, ExternalLink, Zap, MessageCircle, Loader2, Share2, Check, HardHat } from "lucide-react";
import { leadsList, sumberLeads, odpOdcList, initialPelangganRadius, initialTimData } from "../data/mockData";
import { generateLeadsNotification } from "../store/notificationStore";
import { usePersistState } from "../hooks/usePersistState";
import { parseShareLocation, findNearestOdpFromList, generateSurveyWhatsAppMessage } from "../lib/surveySimulation";
import DispatchTaskModal from "../components/DispatchTaskModal";
import ConfirmModal from "../components/ConfirmModal";
import { formatPhoneWa } from "../lib/spkGenerator";
import { showToast } from "../lib/toast";
import { createWhatsAppUrl, getLeadSurveyWaTemplate } from "../lib/whatsapp";

function notify(notif) {
  if (window.__addNotification) window.__addNotification(notif);
}

function StatusBadge({ status }) {
  const styles = {
    BARU: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    KONTAK: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    DIJADWALKAN: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
    SELESAI: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    BATAL: "bg-red-50 text-red-700 ring-1 ring-red-200",
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${styles[status] || "bg-gray-50 text-gray-700 ring-1 ring-gray-200"}`}>
      {status}
    </span>
  );
}

function SumberBadge({ sumber }) {
  const styles = {
    IKLAN: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    AFFILIATE: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
    MARKETING: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${styles[sumber] || "bg-gray-50 text-gray-700 ring-1 ring-gray-200"}`}>
      {sumber}
    </span>
  );
}

const statusOptions = ["BARU", "KONTAK", "DIJADWALKAN", "SELESAI"];

export default function Leads() {
  const navigate = useNavigate();
  const [data, setData] = usePersistState("xnet_leads", leadsList);
  const [pekerjaan, setPekerjaan] = usePersistState("xnet_pekerjaan", []);
  const [odpList] = usePersistState("xnet_odpodc", odpOdcList);
  const [pelangganList] = usePersistState("xnet_pelanggan_radius", initialPelangganRadius);
  const [timList] = usePersistState("xnet_tim", initialTimData);

  const [search, setSearch] = useState("");
  const [filterSumber, setFilterSumber] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTargetLead, setDeleteTargetLead] = useState(null);
  const [dispatchLead, setDispatchLead] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState("");
  const [simSuccess, setSimSuccess] = useState(null);

  const handleOpenDispatch = (item) => {
    setDispatchLead({
      sourceModule: "LEADS",
      sourceId: item.id,
      jenis: "PEMASANGAN",
      prioritas: "NORMAL",
      pelanggan: item.nama,
      telepon: item.telepon,
      alamat: item.alamat,
      shareloc: item.shareloc || (item.lat && item.lng ? `${item.lat}, ${item.lng}` : ""),
      odp: item.odp_terdekat || "",
      jarak_odp: item.jarak_odp || "",
      redaman: item.redaman || "",
      keterangan: item.keterangan_survey || `Pemasangan Baru (PSB) via Leads ${item.sumber}`,
    });
  };

  const handleSaveDispatch = (newTask, shouldSendWa) => {
    setPekerjaan((prev) => [newTask, ...prev]);
    setData((prev) =>
      prev.map((item) =>
        item.id === dispatchLead?.sourceId
          ? {
              ...item,
              status: "DIJADWALKAN",
              tim: newTask.tim,
              spk_no: newTask.spk_no,
              keterangan_survey: item.keterangan_survey
                ? `${item.keterangan_survey} · Ditugaskan ke ${newTask.tim} (${newTask.spk_no})`
                : `Ditugaskan ke Tim ${newTask.tim} (${newTask.spk_no})`,
            }
          : item
      )
    );

    notify({
      id: Date.now(),
      type: "SUCCESS",
      title: "Penugasan Teknisi Berhasil",
      message: `Surat Perintah Kerja ${newTask.spk_no} untuk "${newTask.pelanggan}" berhasil diterbitkan ke Tim ${newTask.tim}.`,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      read: false,
    });

    setDispatchLead(null);
  };

  const [formData, setFormData] = useState({
    nama: "",
    sumber: "IKLAN",
    status: "BARU",
    tanggal: "",
    telepon: "",
    alamat: "",
    shareloc: "",
    lat: null,
    lng: null,
    odp_terdekat: "",
    jarak_odp: "",
    redaman: "",
    biaya_kabel: "",
    keterangan_survey: "",
  });

  const filtered = data.filter((item) => {
    const q = (search || "").toLowerCase().trim();
    const matchSearch =
      !q ||
      (item.nama && item.nama.toLowerCase().includes(q)) ||
      (item.telepon && String(item.telepon).toLowerCase().includes(q)) ||
      (item.alamat && item.alamat.toLowerCase().includes(q));
    const matchSumber = filterSumber === "ALL" || item.sumber === filterSumber;
    return matchSearch && matchSumber;
  });

  const stats = {
    total: data.length,
    baru: data.filter((d) => d.status === "BARU").length,
    proses: data.filter((d) => ["KONTAK", "DIJADWALKAN"].includes(d.status)).length,
    selesai: data.filter((d) => d.status === "SELESAI").length,
  };

  const handleAdd = () => {
    setEditingItem(null);
    setSimSuccess(null);
    setSimError("");
    setFormData({
      nama: "",
      sumber: "IKLAN",
      status: "BARU",
      tanggal: new Date().toISOString().split("T")[0],
      telepon: "",
      alamat: "",
      shareloc: "",
      lat: null,
      lng: null,
      odp_terdekat: "",
      jarak_odp: "",
      redaman: "",
      biaya_kabel: "",
      keterangan_survey: "",
    });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setSimSuccess(null);
    setSimError("");
    setFormData({
      nama: item.nama || "",
      sumber: item.sumber || "IKLAN",
      status: item.status || "BARU",
      tanggal: item.tanggal || "",
      telepon: item.telepon || "",
      alamat: item.alamat || "",
      shareloc: item.shareloc || (item.lat && item.lng ? `${item.lat}, ${item.lng}` : ""),
      lat: item.lat || null,
      lng: item.lng || null,
      odp_terdekat: item.odp_terdekat || "",
      jarak_odp: item.jarak_odp || "",
      redaman: item.redaman || "",
      biaya_kabel: item.biaya_kabel || "",
      keterangan_survey: item.keterangan_survey || item.keterangan_coverage || "",
    });
    setShowModal(true);
  };

  const handleSimulateSurvey = async () => {
    const queryStr = (formData.shareloc || formData.alamat || "").trim();
    if (!queryStr) {
      setSimError("Silakan paste link sharelokasi WhatsApp atau koordinat GPS.");
      return;
    }
    setIsSimulating(true);
    setSimError("");
    setSimSuccess(null);

    try {
      const parsed = await parseShareLocation(queryStr);
      if (!parsed || !parsed.lat || !parsed.lng) {
        setSimError(
          "Tidak dapat mendeteksi koordinat dari tautan. Pastikan format link atau koordinat benar (contoh: maps.app.goo.gl/... atau -0.131807, 109.391669)."
        );
        setIsSimulating(false);
        return;
      }

      const res = findNearestOdpFromList(parsed.lat, parsed.lng);
      if (!res || !res.best) {
        setSimError("Titik ODP di sekitar lokasi tersebut tidak ditemukan.");
        setIsSimulating(false);
        return;
      }

      const { best, alternatives } = res;
      const odpNameFormatted = `${best.name}${best.odc ? ` - ${best.odc}` : ""}`;

      setFormData((prev) => ({
        ...prev,
        lat: parsed.lat,
        lng: parsed.lng,
        shareloc: queryStr,
        odp_terdekat: odpNameFormatted,
        jarak_odp: best.estCable,
        redaman: `${best.loss?.rxPowerDbm || "-"} dBm`,
        biaya_kabel: best.cost?.formattedCost || "Gratis",
        keterangan_survey: `${best.statusText} (${best.straightDist}m garis lurus, ~${best.estCable}m dropcore). Redaman: ${best.loss?.rxPowerDbm} dBm`,
      }));

      setSimSuccess({
        best,
        alternatives,
        lat: parsed.lat,
        lng: parsed.lng,
      });
    } catch (err) {
      setSimError("Gagal menjalankan simulasi: " + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDelete = (lead) => {
    setDeleteTargetLead(lead);
  };

  const executeDeleteLead = () => {
    if (!deleteTargetLead) return;
    const id = deleteTargetLead.id;
    const item = data.find((d) => d.id === id);
    setData((prev) => prev.filter((d) => d.id !== id));
    if (item) notify(generateLeadsNotification(item, "dihapus"));
    setDeleteTargetLead(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanNama = (formData.nama || "").trim();
    if (!cleanNama) {
      showToast("Nama lead wajib diisi!", "warning");
      return;
    }
    const cleanTelepon = formatPhoneWa(formData.telepon || "");
    const cleanData = {
      ...formData,
      nama: cleanNama,
      telepon: cleanTelepon,
      alamat: (formData.alamat || "").trim(),
      shareloc: (formData.shareloc || "").trim(),
      keterangan_survey: (formData.keterangan_survey || "").trim(),
    };

    if (editingItem) {
      setData(data.map((d) => (d.id === editingItem.id ? { ...d, ...cleanData } : d)));
      notify(generateLeadsNotification({ ...editingItem, ...cleanData }, "diperbarui"));
    } else {
      const newItem = { id: Date.now(), ...cleanData };
      setData([...data, newItem]);
      notify(generateLeadsNotification(newItem, "baru masuk"));
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Leads</h1>
          <p className="text-gray-500 text-sm mt-0.5">Tracking leads pemasangan WiFi & Feasibility Survey Coverage ODP</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => navigate("/odp?coverage=1")}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <Globe className="w-4 h-4 text-emerald-200" />
            <span>Peta Coverage</span>
          </button>
          <button
            onClick={handleAdd}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#F59E0B] hover:bg-[#d97706] active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> <span>Tambah Lead</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {[
          { label: "Total Leads", value: stats.total, bg: "bg-white" },
          { label: "Baru", value: stats.baru, bg: "bg-blue-50" },
          { label: "Proses", value: stats.proses, bg: "bg-amber-50" },
          { label: "Selesai", value: stats.selesai, bg: "bg-emerald-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-3.5 sm:p-4 border border-gray-100`}>
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
            <p className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-0.5 sm:mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Cari nama / telepon / alamat / ODP..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B] outline-none" />
        </div>
        <select value={filterSumber} onChange={(e) => setFilterSumber(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#F59E0B] outline-none">
          <option value="ALL">Semua Sumber</option>
          {sumberLeads.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {filtered.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:shadow-lg hover:shadow-gray-200/50 transition-all group flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-800 text-sm sm:text-base truncate">{item.nama}</h3>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <SumberBadge sumber={item.sumber} />
                    <StatusBadge status={item.status} />
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(item)} className="p-1.5 rounded-xl hover:bg-blue-50 text-gray-400 hover:text-blue-600 bg-gray-50 sm:bg-transparent" title="Edit Lead">
                    <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button onClick={() => handleDelete(item)} className="p-1.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 bg-gray-50 sm:bg-transparent cursor-pointer" title="Hapus Lead">
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-2.5"><Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" /><span>{item.telepon || "-"}</span></div>
                <div className="flex items-center gap-2.5"><MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" /><span className="truncate">{item.alamat || "-"}</span></div>
                <div className="flex items-center gap-2.5"><Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" /><span>{item.tanggal || "-"}</span></div>

                {/* Status ODP Terdekat jika ada */}
                {item.odp_terdekat && (
                  <div className="mt-2.5 p-2.5 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 space-y-1.5 text-xs shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                        <span className="font-bold text-emerald-950 truncate max-w-[150px]">{item.odp_terdekat}</span>
                      </div>
                      <span className="font-mono text-emerald-800 font-extrabold bg-white px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                        ~{item.jarak_odp || 0}m dropcore
                      </span>
                    </div>
                    {item.redaman && (
                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-emerald-200/60">
                        <span>Prediksi Redaman:</span>
                        <span className="font-bold text-amber-700">{item.redaman}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions: Simulasi Google Earth, WhatsApp, & Dispatch SPK */}
            <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const query = new URLSearchParams({
                    coverage: "1",
                    leadId: item.id,
                    alamat: item.alamat || "",
                    nama: item.nama || "",
                  });
                  if (item.lat && item.lng) {
                    query.append("lat", item.lat);
                    query.append("lng", item.lng);
                  }
                  navigate(`/odp?${query.toString()}`);
                }}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                  item.odp_terdekat
                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-gradient-to-r from-amber-500/10 to-amber-500/20 hover:from-amber-500/20 hover:to-amber-500/30 text-amber-900 border border-amber-300"
                }`}
                title="Buka peta Google Earth untuk menganalisis jarak ke ODP terdekat"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{item.odp_terdekat ? "Peta Earth" : "Cek ODP"}</span>
              </button>

              {/* Tombol One-Click Dispatch SPK Teknisi */}
              <button
                type="button"
                onClick={() => handleOpenDispatch(item)}
                className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gradient-to-r from-[#0D1B4A] to-slate-800 hover:from-slate-900 hover:to-black text-amber-400 font-extrabold rounded-xl text-xs shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
                title="Tugaskan Tim Teknisi Lapangan (Pasang Baru / PSB)"
              >
                <HardHat className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Tugaskan SPK</span>
              </button>

              {item.telepon && (
                <button
                  type="button"
                  onClick={() => {
                    const url = createWhatsAppUrl(item.telepon, getLeadSurveyWaTemplate(item));
                    if (url) window.open(url, "_blank");
                  }}
                  className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                  title="Kirim Pesan Survey WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-sm">Tidak ada data leads</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">{editingItem ? "Edit Lead" : "Tambah Lead Baru"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Nama</label>
                <input type="text" value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Sumber</label>
                  <select value={formData.sumber} onChange={(e) => setFormData({ ...formData, sumber: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none">
                    {sumberLeads.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none">
                    {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Telepon</label>
                <input type="text" value={formData.telepon} onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Alamat</label>
                <input type="text" value={formData.alamat} onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none" />
              </div>

              {/* Data ODP & Feasibility Survey (Simulasi Sharelokasi) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-emerald-500/10 border border-amber-300/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                      <Target className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-amber-950 block">Simulasi Survey ODP</span>
                      <p className="text-[10px] text-gray-500">Hitung jarak & redaman dari sharelokasi</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const query = new URLSearchParams({
                        coverage: "1",
                        nama: formData.nama || "",
                        alamat: formData.alamat || "",
                      });
                      if (formData.lat && formData.lng) {
                        query.append("lat", formData.lat);
                        query.append("lng", formData.lng);
                      }
                      navigate(`/odp?${query.toString()}`);
                    }}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-xl border border-emerald-300 shadow-2xs active:scale-95 transition-all"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                    <span>Peta Satelit 3D</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Link Sharelokasi WA / Koordinat GPS
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste link WA (maps.app.goo.gl/...) atau -0.1318, 109.3916"
                      value={formData.shareloc || ""}
                      onChange={(e) => setFormData({ ...formData, shareloc: e.target.value })}
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#F59E0B] outline-none"
                    />
                    <button
                      type="button"
                      disabled={isSimulating}
                      onClick={handleSimulateSurvey}
                      className="px-3.5 py-2 bg-[#0D1B4A] hover:bg-[#1a237e] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isSimulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
                      <span>Hitung Jarak</span>
                    </button>
                  </div>
                  {simError && <p className="text-[10px] text-red-600 mt-1 font-medium">{simError}</p>}
                </div>

                {/* Hasil Simulasi Otomatis */}
                {simSuccess && (
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-1.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${simSuccess.best.tierBadge}`}>
                        {simSuccess.best.statusText}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        GPS: {simSuccess.lat.toFixed(5)}, {simSuccess.lng.toFixed(5)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-center pt-1 border-t border-gray-100">
                      <div className="bg-gray-50 p-1.5 rounded-lg">
                        <span className="text-[9px] text-gray-400 block font-bold">ODP Terdekat</span>
                        <span className="text-[11px] font-black text-gray-800 truncate block">{simSuccess.best.name}</span>
                      </div>
                      <div className="bg-gray-50 p-1.5 rounded-lg">
                        <span className="text-[9px] text-gray-400 block font-bold">Est. Dropcore</span>
                        <span className="text-[11px] font-black text-emerald-600 block">~{simSuccess.best.estCable} m</span>
                      </div>
                      <div className="bg-gray-50 p-1.5 rounded-lg">
                        <span className="text-[9px] text-gray-400 block font-bold">Prediksi Redaman</span>
                        <span className="text-[11px] font-black text-amber-600 block">{simSuccess.best.loss?.rxPowerDbm} dBm</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">ODP Terpilih</label>
                    <input
                      type="text"
                      placeholder="Cth: ODP 05 - ODC 02"
                      value={formData.odp_terdekat || ""}
                      onChange={(e) => setFormData({ ...formData, odp_terdekat: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#F59E0B] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">Est. Dropcore (m)</label>
                    <input
                      type="number"
                      placeholder="Cth: 85"
                      value={formData.jarak_odp || ""}
                      onChange={(e) => setFormData({ ...formData, jarak_odp: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#F59E0B] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Tanggal</label>
                <input type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none" />
              </div>
              <div className="flex items-center justify-between gap-2.5 pt-2 flex-wrap">
                {formData.nama && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      handleOpenDispatch({
                        id: editingItem?.id || Date.now(),
                        ...formData,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#0D1B4A] to-slate-900 text-amber-400 font-extrabold rounded-xl text-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <HardHat className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tugaskan SPK Pasang Baru</span>
                  </button>
                )}
                <div className="flex gap-2.5 ml-auto">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Batal</button>
                  <button type="submit" className="px-5 py-2.5 text-xs sm:text-sm font-semibold bg-[#F59E0B] hover:bg-[#d97706] text-white rounded-xl shadow-sm hover:shadow-md transition-all">Simpan</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Terpadu Penugasan Teknisi (SPK) */}
      <DispatchTaskModal
        isOpen={Boolean(dispatchLead)}
        onClose={() => setDispatchLead(null)}
        initialData={dispatchLead || {}}
        onSave={handleSaveDispatch}
        odpList={odpList}
        pelangganList={pelangganList}
        timList={timList}
        taskList={pekerjaan}
      />

      {/* Modern Confirm Modal untuk Hapus Lead */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetLead)}
        onClose={() => setDeleteTargetLead(null)}
        onConfirm={executeDeleteLead}
        title="Hapus Data Calon Pelanggan?"
        message={`Apakah Anda yakin ingin menghapus lead "${deleteTargetLead?.nama || ""}"? Data yang dihapus tidak dapat dipulihkan.`}
        confirmText="Hapus Lead"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
}
