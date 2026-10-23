import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Target,
  Phone,
  MapPin,
  Calendar,
  Globe,
  Radio,
  ExternalLink,
  Zap,
  MessageCircle,
  Loader2,
  Share2,
  Check,
  HardHat,
  Send,
  AlertTriangle,
  LayoutGrid,
  List,
  Wifi,
  Navigation,
} from "lucide-react";
import {
  leadsList,
  pekerjaanList,
  sumberLeads,
  odpOdcList,
  initialPelangganRadius,
  initialTimData,
} from "../data/mockData";
import { generateLeadsNotification } from "../store/notificationStore";
import { usePersistState } from "../hooks/usePersistState";
import {
  parseShareLocation,
  findNearestOdpFromList,
  generateSurveyWhatsAppMessage,
} from "../lib/surveySimulation";
import DispatchTaskModal from "../components/DispatchTaskModal";
import ConfirmModal from "../components/ConfirmModal";
import { formatPhoneWa } from "../lib/spkGenerator";
import { showToast } from "../lib/toast";
import { createWhatsAppUrl, getLeadSurveyWaTemplate } from "../lib/whatsapp";

export const PAKET_OPTIONS = [
  "Home Fiber 20 Mbps",
  "Home Fiber 30 Mbps",
  "Home Fiber 50 Mbps",
  "Home Fiber 100 Mbps",
  "Bisnis Dedicated 50 Mbps",
  "Bisnis Dedicated 100 Mbps",
];

function getFeasibilityInfo(dist) {
  if (dist === null || dist === undefined || dist === "") return null;
  const num = Number(dist);
  if (isNaN(num)) return null;
  if (num <= 150) {
    return {
      status: "FEASIBLE",
      label: "Feasible",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
      dotClass: "bg-emerald-500",
      desc: "Jarak aman (Standar dropcore gratis)",
    };
  }
  if (num <= 250) {
    return {
      status: "WARNING",
      label: "Kabel Ekstra",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
      dotClass: "bg-amber-500",
      desc: `Melebihi 150m (+~${num - 150}m dropcore)`,
    };
  }
  return {
    status: "UNFEASIBLE",
    label: "Jarak Jauh",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-300",
    dotClass: "bg-rose-500",
    desc: "Di atas 250m, rawan redaman tinggi / butuh tiang",
  };
}

function notify(notif) {
  if (window.__addNotification) window.__addNotification(notif);
}

function StatusBadge({ status }) {
  const styles = {
    BARU: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    KONTAK: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    "SIAP SPK (OP)": "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300 font-extrabold",
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

const statusOptions = ["BARU", "KONTAK", "DIJADWALKAN", "SELESAI", "BATAL"];

export default function Leads() {
  const navigate = useNavigate();
  const [data, setData] = usePersistState("xnet_leads", leadsList);
  const [pekerjaan, setPekerjaan] = usePersistState("xnet_pekerjaan", pekerjaanList);
  const [odpList] = usePersistState("xnet_odpodc", odpOdcList);
  const [pelangganList] = usePersistState("xnet_pelanggan_radius", initialPelangganRadius);
  const [timList] = usePersistState("xnet_tim", initialTimData);

  const [search, setSearch] = useState("");
  const [filterSumber, setFilterSumber] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [viewMode, setViewMode] = useState("grid");
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
      paket: item.paket || "Home Fiber 30 Mbps",
      shareloc: item.shareloc || (item.lat && item.lng ? `${item.lat}, ${item.lng}` : ""),
      odp: item.odp_terdekat || "",
      jarak_odp: item.jarak_odp || "",
      redaman: item.redaman || "",
      keterangan: item.keterangan_survey || `Pemasangan Baru (PSB) via Leads ${item.sumber} · Paket: ${item.paket || "Home Fiber 30 Mbps"}`,
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
    paket: "Home Fiber 30 Mbps",
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

  const filtered = useMemo(() => {
    return data.filter((item) => {
      const q = (search || "").toLowerCase().trim();
      const matchSearch =
        !q ||
        (item.nama && item.nama.toLowerCase().includes(q)) ||
        (item.telepon && String(item.telepon).toLowerCase().includes(q)) ||
        (item.alamat && item.alamat.toLowerCase().includes(q)) ||
        (item.odp_terdekat && item.odp_terdekat.toLowerCase().includes(q)) ||
        (item.paket && item.paket.toLowerCase().includes(q));

      const matchSumber = filterSumber === "ALL" || item.sumber === filterSumber;

      let matchStatus = true;
      if (filterStatus === "BARU") {
        matchStatus = item.status === "BARU";
      } else if (filterStatus === "PROSES") {
        matchStatus = ["KONTAK", "SIAP SPK (OP)", "DIJADWALKAN"].includes(item.status);
      } else if (filterStatus === "SELESAI") {
        matchStatus = item.status === "SELESAI";
      } else if (filterStatus !== "ALL") {
        matchStatus = item.status === filterStatus;
      }

      return matchSearch && matchSumber && matchStatus;
    });
  }, [data, search, filterSumber, filterStatus]);

  const stats = useMemo(() => {
    return {
      total: data.length,
      baru: data.filter((d) => d.status === "BARU").length,
      proses: data.filter((d) => ["KONTAK", "SIAP SPK (OP)", "DIJADWALKAN"].includes(d.status)).length,
      selesai: data.filter((d) => d.status === "SELESAI").length,
    };
  }, [data]);

  const handleAdd = () => {
    setEditingItem(null);
    setSimSuccess(null);
    setSimError("");
    setFormData({
      nama: "",
      sumber: "IKLAN",
      status: "BARU",
      paket: "Home Fiber 30 Mbps",
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
      paket: item.paket || "Home Fiber 30 Mbps",
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

  const leadPhoneDuplicate = useMemo(() => {
    if (!formData.telepon || editingItem) return null;
    const clean = formatPhoneWa(formData.telepon);
    if (!clean || clean.length < 8) return null;
    const matchLead = (data || []).find((d) => formatPhoneWa(d.telepon) === clean);
    if (matchLead) return { type: "LEAD", name: matchLead.nama, status: matchLead.status };
    const matchTask = (pekerjaan || []).find(
      (p) => formatPhoneWa(p.telepon) === clean && p.status !== "SELESAI" && p.status !== "GAGAL"
    );
    if (matchTask) return { type: "SPK", name: matchTask.pelanggan, spk: matchTask.spk_no, status: matchTask.status };
    return null;
  }, [formData.telepon, editingItem, data, pekerjaan]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanNama = (formData.nama || "").trim();
    if (!cleanNama) {
      showToast("Nama lead wajib diisi!", "warning");
      return;
    }
    const cleanTelepon = formatPhoneWa(formData.telepon || "");

    // Cek Duplikasi Lead & Tiket SPK Aktif
    if (!editingItem && cleanTelepon) {
      const dupLead = (data || []).find((d) => formatPhoneWa(d.telepon) === cleanTelepon);
      if (dupLead) {
        showToast(
          `Nomor ${cleanTelepon} sudah ada dalam database Lead atas nama "${dupLead.nama}" (${dupLead.status})!`,
          "error"
        );
        return;
      }

      const dupTask = (pekerjaan || []).find(
        (p) => formatPhoneWa(p.telepon) === cleanTelepon && p.status !== "SELESAI" && p.status !== "GAGAL"
      );
      if (dupTask) {
        showToast(
          `Nomor ${cleanTelepon} sudah memiliki SPK aktif #${dupTask.spk_no || dupTask.id} (${dupTask.jenis})!`,
          "error"
        );
        return;
      }
    }

    const cleanData = {
      ...formData,
      nama: cleanNama,
      telepon: cleanTelepon,
      paket: formData.paket || "Home Fiber 30 Mbps",
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
      {/* Header Utama */}
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
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#F59E0B] hover:bg-[#d97706] active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> <span>Tambah Lead</span>
          </button>
        </div>
      </div>

      {/* 4 Clickable Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {[
          { id: "ALL", label: "Total Leads", value: stats.total, bg: "bg-white", activeRing: "ring-2 ring-[#0D1B4A] shadow-md border-[#0D1B4A]" },
          { id: "BARU", label: "Baru", value: stats.baru, bg: "bg-blue-50/70", activeRing: "ring-2 ring-blue-500 shadow-md border-blue-400" },
          { id: "PROSES", label: "Proses (Dijadwalkan)", value: stats.proses, bg: "bg-amber-50/70", activeRing: "ring-2 ring-amber-500 shadow-md border-amber-400" },
          { id: "SELESAI", label: "Selesai (Terpasang)", value: stats.selesai, bg: "bg-emerald-50/70", activeRing: "ring-2 ring-emerald-500 shadow-md border-emerald-400" },
        ].map((s) => {
          const isSelected = filterStatus === s.id;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => setFilterStatus(filterStatus === s.id && s.id !== "ALL" ? "ALL" : s.id)}
              className={`${s.bg} text-left rounded-2xl p-3.5 sm:p-4 border border-gray-100 transition-all cursor-pointer active:scale-95 ${
                isSelected ? s.activeRing : "hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-[#0D1B4A] animate-pulse" />
                )}
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-0.5 sm:mt-1">{s.value}</p>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama / telepon / alamat / ODP / paket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B] outline-none"
          />
        </div>

        {/* Filter Status Dropdown */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#F59E0B] outline-none cursor-pointer"
        >
          <option value="ALL">Semua Status</option>
          <option value="BARU">Status: Baru</option>
          <option value="PROSES">Status: Proses (Kontak / SPK)</option>
          <option value="DIJADWALKAN">Status: Dijadwalkan</option>
          <option value="SELESAI">Status: Selesai Pasang</option>
          <option value="BATAL">Status: Batal / Not Feasible</option>
        </select>

        {/* Filter Sumber Dropdown */}
        <select
          value={filterSumber}
          onChange={(e) => setFilterSumber(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#F59E0B] outline-none cursor-pointer"
        >
          <option value="ALL">Semua Sumber</option>
          {sumberLeads.map((s) => (
            <option key={s} value={s}>
              Sumber: {s}
            </option>
          ))}
        </select>

        {/* View Mode Switcher (Grid vs Table) */}
        <div className="flex items-center gap-1 border border-gray-200 bg-gray-50 p-1 rounded-xl self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "grid" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-400 hover:text-gray-700"
            }`}
            title="Tampilan Grid Kartu"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "table" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-400 hover:text-gray-700"
            }`}
            title="Tampilan Tabel Ringkas"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content: Table View vs Grid View */}
      {viewMode === "table" ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-bold border-b border-gray-100 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Calon Pelanggan</th>
                  <th className="py-3 px-4">Kontak & Alamat</th>
                  <th className="py-3 px-4">Paket Diminati</th>
                  <th className="py-3 px-4">Feasibility ODP</th>
                  <th className="py-3 px-4">Status & Sumber</th>
                  <th className="py-3 px-4 text-center">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => {
                  const feas = getFeasibilityInfo(item.jarak_odp);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>
                          <span>{item.nama}</span>
                          <p className="text-[10px] font-mono text-slate-400 font-normal">{item.tanggal || "-"}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{item.telepon || "-"}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate max-w-[200px] mt-0.5">{item.alamat || "-"}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                          <Wifi className="w-3 h-3" />
                          <span>{item.paket || "Home Fiber 30 Mbps"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {item.odp_terdekat ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <Radio className="w-3 h-3 text-blue-500" />
                              <span>{item.odp_terdekat}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-mono font-bold text-slate-600">~{item.jarak_odp || 0}m</span>
                              {feas && (
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${feas.badgeClass}`}>
                                  {feas.label}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Belum Cek ODP
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <StatusBadge status={item.status} />
                          <SumberBadge sumber={item.sumber} />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {item.telepon && (
                            <button
                              type="button"
                              onClick={() => {
                                const url = createWhatsAppUrl(item.telepon, getLeadSurveyWaTemplate(item));
                                if (url) window.open(url, "_blank");
                              }}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                              title="Chat WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
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
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer"
                            title="Peta Satelit Earth"
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </button>
                          {item.status === "SELESAI" ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/pelanggan?search=${encodeURIComponent(item.nama)}`)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs hover:bg-emerald-100 cursor-pointer"
                              title="Lihat Data Pelanggan Aktif"
                            >
                              Pelanggan ↗
                            </button>
                          ) : item.status === "DIJADWALKAN" ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/pekerjaan?search=${encodeURIComponent(item.spk_no || item.nama)}`)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-300 font-bold text-xs hover:bg-blue-100 cursor-pointer"
                              title="Lihat Tiket SPK di Modul Pekerjaan"
                            >
                              SPK ↗
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDispatch(item)}
                              className="px-2.5 py-1 rounded-lg bg-[#0D1B4A] hover:bg-slate-900 text-amber-400 font-extrabold text-xs shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                              title="Terbitkan SPK Pasang Baru"
                            >
                              <Zap className="w-3 h-3 text-amber-400" />
                              <span>Tugaskan</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                            title="Edit Lead"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Hapus Lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:shadow-lg hover:shadow-gray-200/50 transition-all group flex flex-col justify-between"
            >
              <div>
                {/* Header Kartu */}
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-800 text-sm sm:text-base truncate">{item.nama}</h3>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <SumberBadge sumber={item.sumber} />
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleEdit(item)}
                      className="min-w-[34px] min-h-[34px] p-2 rounded-xl hover:bg-blue-50 text-gray-400 hover:text-blue-600 bg-gray-50 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                      title="Edit Lead"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="min-w-[34px] min-h-[34px] p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 bg-gray-50 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                      title="Hapus Lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Detail Kontak & Alamat */}
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="font-mono">{item.telepon || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{item.alamat || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{item.tanggal || "-"}</span>
                  </div>

                  {/* Paket Internet Diminati */}
                  <div className="flex items-center gap-2.5">
                    <Wifi className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="font-semibold text-slate-800">{item.paket || "Home Fiber 30 Mbps"}</span>
                  </div>

                  {/* Boks Feasibility ODP Terdekat */}
                  {item.odp_terdekat && (() => {
                    const feas = getFeasibilityInfo(item.jarak_odp);
                    return (
                      <div className="mt-2.5 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs shadow-2xs">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                            <span className="font-bold text-slate-900 truncate max-w-[140px]">{item.odp_terdekat}</span>
                          </div>
                          {feas && (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${feas.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${feas.dotClass}`} />
                              {feas.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1.5 border-t border-slate-200/60">
                          <span>Dropcore: <strong className="text-slate-800">~{item.jarak_odp || 0}m</strong></span>
                          {item.redaman && (
                            <span>Prediksi: <strong className="text-amber-700">{item.redaman}</strong></span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Quick Actions Footer (2-Row Structured Layout: Rapi, Seragam & Bebas Jitter) */}
              <div className="mt-3.5 pt-3 border-t border-gray-100 space-y-2">
                {/* Baris 1: Tool Penunjang & Chat (50:50) */}
                <div className="grid grid-cols-2 gap-2">
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
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                      item.odp_terdekat
                        ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300"
                    }`}
                    title="Buka peta Google Earth untuk menganalisis jarak ke ODP terdekat"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{item.odp_terdekat ? "Peta Earth" : "Cek ODP"}</span>
                  </button>

                  {item.telepon ? (
                    <button
                      type="button"
                      onClick={() => {
                        const url = createWhatsAppUrl(item.telepon, getLeadSurveyWaTemplate(item));
                        if (url) window.open(url, "_blank");
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                      title="Kirim Pesan Follow-Up / Survey WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">WhatsApp</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-medium cursor-not-allowed"
                    >
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">No Telepon</span>
                    </button>
                  )}
                </div>

                {/* Baris 2: Aksi Siklus Hidup Utama (Full Width Adaptif Sesuai Status) */}
                {item.status === "SELESAI" ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/pelanggan?search=${encodeURIComponent(item.nama)}`)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
                    title="Pelanggan sudah aktif. Klik untuk lihat data pelanggan di Radius"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">✓ Pelanggan Aktif di Radius ↗</span>
                  </button>
                ) : item.status === "DIJADWALKAN" ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/pekerjaan?search=${encodeURIComponent(item.spk_no || item.nama)}`)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 font-extrabold rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
                    title="SPK sudah terbit. Klik untuk memantau pengerjaan teknisi di modul Pekerjaan"
                  >
                    <HardHat className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">
                      📅 {item.spk_no ? `#${item.spk_no.split("/").pop()} · ${item.tim || "Teknisi"}` : "Terjadwal di Pekerjaan"} ↗
                    </span>
                  </button>
                ) : item.status === "BATAL" ? (
                  <div className="w-full py-2 px-3 text-center bg-gray-100 text-gray-500 rounded-xl text-xs font-semibold border border-gray-200">
                    Dibatalkan / Not Feasible
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenDispatch(item)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-[#0D1B4A] to-slate-800 hover:from-slate-900 hover:to-black text-amber-400 font-black rounded-xl text-xs shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
                    title="Terbitkan Surat Perintah Kerja (SPK) Pemasangan Baru ke Teknisi Lapangan"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">⚡ Terbitkan SPK Pasang Baru</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-12 px-4 text-center bg-white rounded-3xl border border-dashed border-slate-200 shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Tidak ada lead yang cocok</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {search ? `Tidak ditemukan calon pelanggan untuk kata kunci "${search}".` : "Tidak ada lead untuk filter status/sumber yang dipilih."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilterSumber("ALL");
                  setFilterStatus("ALL");
                }}
                className="px-4 py-2 bg-[#0D1B4A] hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Reset Semua Filter
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal Tambah / Edit Lead */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editingItem ? "Edit Lead" : "Tambah Lead"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Anton Wijaya"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Sumber</label>
                  <select
                    value={formData.sumber}
                    onChange={(e) => setFormData({ ...formData, sumber: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none cursor-pointer"
                  >
                    {sumberLeads.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none cursor-pointer"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pilihan Paket Berlangganan */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Paket Internet yang Diminati
                </label>
                <select
                  value={formData.paket || "Home Fiber 30 Mbps"}
                  onChange={(e) => setFormData({ ...formData, paket: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#F59E0B] outline-none bg-white cursor-pointer"
                >
                  {PAKET_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">Telepon (WhatsApp)</label>
                  {leadPhoneDuplicate && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                      ⚠️ Nomor Terdaftar
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="08xxxxxxxxxx"
                  value={formData.telepon}
                  onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition-all ${
                    leadPhoneDuplicate
                      ? "border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-400"
                      : "border-gray-200 focus:ring-2 focus:ring-[#F59E0B]"
                  }`}
                />
                {leadPhoneDuplicate && (
                  <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-1.5 font-medium animate-in fade-in">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span className="leading-tight">
                      {leadPhoneDuplicate.type === "LEAD"
                        ? `Nomor sudah ada di Lead: "${leadPhoneDuplicate.name}" (${leadPhoneDuplicate.status}). Hubungi calon pelanggan lewat data lead yang sudah ada.`
                        : `Nomor ini sudah memiliki SPK Aktif: ${leadPhoneDuplicate.spk || ""} (${leadPhoneDuplicate.status}).`}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Alamat Pemasangan</label>
                <input
                  type="text"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none"
                />
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
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Tanggal Pendaftaran</label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none"
                />
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
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs sm:text-sm font-bold bg-[#F59E0B] hover:bg-[#d97706] text-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                  >
                    Simpan
                  </button>
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
