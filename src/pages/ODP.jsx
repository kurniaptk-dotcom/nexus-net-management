import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Network,
  Wifi,
  WifiOff,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  Wrench,
  CheckCircle2,
  Layers,
  MapPin,
  Filter,
} from "lucide-react";
import { odpOdcList, odcMasterList } from "../data/mockData";
import { usePersistState } from "../hooks/usePersistState";
import Toast from "../components/Toast";

export default function ODP() {
  const navigate = useNavigate();
  const [data, setData] = usePersistState("xnet_odpodc", odpOdcList);
  const [odcList, setOdcList] = usePersistState("xnet_odc_list", odcMasterList);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterOdc, setFilterOdc] = useState("ALL");
  const [expandedOdc, setExpandedOdc] = useState({});

  // Modals
  const [isOdpModalOpen, setIsOdpModalOpen] = useState(false);
  const [editingOdp, setEditingOdp] = useState(null);
  const [odpForm, setOdpForm] = useState({
    odc: "",
    nama: "",
    keterangan: "",
    status: "Aman",
    kapasitas: "8 Port",
  });

  const [isOdcModalOpen, setIsOdcModalOpen] = useState(false);
  const [editingOdc, setEditingOdc] = useState(null);
  const [odcForm, setOdcForm] = useState({
    nama: "",
    lokasi: "",
    kapasitas: "8 Port / 96 Core",
    keterangan: "",
  });

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  // Merge ODC Master with any ODCs existing in ODP data
  const allOdcs = useMemo(() => {
    const map = new Map();
    (odcList || []).forEach((odc) => {
      map.set(odc.nama, { ...odc });
    });

    (data || []).forEach((odp) => {
      if (odp.odc && !map.has(odp.odc)) {
        map.set(odp.odc, {
          id: `ODC-${odp.odc.replace(/\D/g, "") || Date.now()}`,
          nama: odp.odc,
          lokasi: "Wilayah Distribusi",
          kapasitas: "8 Port / 96 Core",
          keterangan: "Didaftarkan dari ODP",
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const numA = parseInt(a.nama.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.nama.replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });
  }, [odcList, data]);

  // Group ODPs by ODC
  const groupedData = useMemo(() => {
    const groups = {};

    allOdcs.forEach((odc) => {
      groups[odc.nama] = {
        odcMeta: odc,
        odps: [],
      };
    });

    (data || []).forEach((item) => {
      const key = item.odc || "TANPA ODC";
      if (!groups[key]) {
        groups[key] = {
          odcMeta: { id: key, nama: key, lokasi: "Wilayah Distribusi", kapasitas: "-" },
          odps: [],
        };
      }

      const matchSearch =
        !search ||
        item.nama?.toLowerCase().includes(search.toLowerCase()) ||
        item.odc?.toLowerCase().includes(search.toLowerCase()) ||
        item.keterangan?.toLowerCase().includes(search.toLowerCase()) ||
        groups[key].odcMeta.lokasi?.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        filterStatus === "ALL" ||
        (filterStatus === "Aman" && item.status === "Aman") ||
        (filterStatus === "Diperbaiki" && item.status === "Diperbaiki") ||
        (filterStatus === "Belum Dicek" && (!item.status || item.status === ""));

      if (matchSearch && matchStatus) {
        groups[key].odps.push(item);
      }
    });

    if (filterOdc !== "ALL") {
      return groups[filterOdc] ? { [filterOdc]: groups[filterOdc] } : {};
    }

    return groups;
  }, [allOdcs, data, search, filterStatus, filterOdc]);

  const stats = {
    totalOdc: allOdcs.length,
    totalOdp: data.length,
    aman: data.filter((d) => d.status === "Aman").length,
    diperbaiki: data.filter((d) => d.status === "Diperbaiki").length,
    odcBermasalah: allOdcs.filter((odc) =>
      data.some((d) => d.odc === odc.nama && d.status === "Diperbaiki")
    ).length,
  };

  // Accordion controls
  const toggleOdc = (odc) => {
    setExpandedOdc((prev) => ({ ...prev, [odc]: !prev[odc] }));
  };

  const handleExpandAll = () => {
    const next = {};
    allOdcs.forEach((odc) => {
      next[odc.nama] = true;
    });
    setExpandedOdc(next);
  };

  const handleCollapseAll = () => {
    const next = {};
    allOdcs.forEach((odc) => {
      next[odc.nama] = false;
    });
    setExpandedOdc(next);
  };

  // ODC CRUD Handlers
  const handleOpenAddOdc = () => {
    setEditingOdc(null);
    setOdcForm({
      nama: `ODC ${allOdcs.length + 1}`,
      lokasi: "",
      kapasitas: "8 Port / 96 Core",
      keterangan: "",
    });
    setIsOdcModalOpen(true);
  };

  const handleOpenEditOdc = (odc) => {
    setEditingOdc(odc);
    setOdcForm({
      nama: odc.nama,
      lokasi: odc.lokasi || "",
      kapasitas: odc.kapasitas || "8 Port / 96 Core",
      keterangan: odc.keterangan || "",
    });
    setIsOdcModalOpen(true);
  };

  const handleSaveOdc = (e) => {
    e.preventDefault();
    const namaClean = odcForm.nama.trim();
    if (!namaClean) {
      showToast("error", "Nama ODC wajib diisi!");
      return;
    }

    if (editingOdc) {
      const oldName = editingOdc.nama;
      const updatedOdcList = allOdcs.map((o) =>
        o.nama === oldName ? { ...o, ...odcForm, nama: namaClean } : o
      );
      setOdcList(updatedOdcList);

      // Cascade update to child ODPs
      if (oldName !== namaClean) {
        setData((prev) =>
          prev.map((odp) => (odp.odc === oldName ? { ...odp, odc: namaClean } : odp))
        );
      }
      showToast("success", `Data ${namaClean} berhasil diperbarui.`);
    } else {
      if (allOdcs.some((o) => o.nama.toLowerCase() === namaClean.toLowerCase())) {
        showToast("error", `ODC dengan nama "${namaClean}" sudah ada!`);
        return;
      }
      const newOdc = {
        id: `ODC-${Date.now()}`,
        ...odcForm,
        nama: namaClean,
      };
      setOdcList([...allOdcs, newOdc]);
      showToast("success", `${namaClean} berhasil ditambahkan.`);
    }
    setIsOdcModalOpen(false);
  };

  const handleDeleteOdc = (odc) => {
    const childCount = data.filter((d) => d.odc === odc.nama).length;
    if (childCount > 0) {
      if (
        !confirm(
          `ODC "${odc.nama}" masih memiliki ${childCount} ODP di dalamnya.\n\nApakah Anda yakin ingin menghapus ODC ini beserta seluruh ${childCount} ODP di bawahnya?`
        )
      ) {
        return;
      }
      setData((prev) => prev.filter((d) => d.odc !== odc.nama));
    }
    setOdcList((prev) => prev.filter((o) => o.nama !== odc.nama));
    showToast("success", `ODC "${odc.nama}" berhasil dihapus.`);
  };

  // ODP CRUD Handlers
  const handleOpenAddOdp = (defaultOdc = "") => {
    setEditingOdp(null);
    const chosenOdc = defaultOdc || (allOdcs[0]?.nama || "ODC 1");
    const countInOdc = data.filter((d) => d.odc === chosenOdc).length + 1;
    const odcNumber = chosenOdc.replace(/\D/g, "") || "1";

    setOdpForm({
      odc: chosenOdc,
      nama: `ODP ${odcNumber}.${countInOdc}`,
      keterangan: "",
      status: "Aman",
      kapasitas: "8 Port",
    });
    setIsOdpModalOpen(true);
  };

  const handleOpenEditOdp = (odp) => {
    setEditingOdp(odp);
    setOdpForm({
      odc: odp.odc || allOdcs[0]?.nama || "ODC 1",
      nama: odp.nama || "",
      keterangan: odp.keterangan || "",
      status: odp.status || "Aman",
      kapasitas: odp.kapasitas || "8 Port",
    });
    setIsOdpModalOpen(true);
  };

  const handleSaveOdp = (e) => {
    e.preventDefault();
    if (!odpForm.nama.trim() || !odpForm.odc.trim()) {
      showToast("error", "Nama ODP dan ODC induk wajib diisi!");
      return;
    }

    if (editingOdp) {
      setData((prev) =>
        prev.map((item) => (item.id === editingOdp.id ? { ...item, ...odpForm } : item))
      );
      showToast("success", `ODP ${odpForm.nama} berhasil diperbarui.`);
    } else {
      const newItem = {
        id: Date.now(),
        ...odpForm,
      };
      setData((prev) => [newItem, ...prev]);
      showToast("success", `ODP ${odpForm.nama} berhasil ditambahkan ke ${odpForm.odc}.`);
    }
    setIsOdpModalOpen(false);
  };

  const handleToggleStatus = (item) => {
    const newStatus = item.status === "Aman" ? "Diperbaiki" : "Aman";
    setData((prev) =>
      prev.map((d) => (d.id === item.id ? { ...d, status: newStatus } : d))
    );
    showToast("success", `Status ${item.nama} diubah menjadi ${newStatus}.`);
  };

  const handleDeleteOdp = (item) => {
    setData((prev) => prev.filter((d) => d.id !== item.id));
    setDeleteConfirm(null);
    showToast("success", `ODP ${item.nama} telah dihapus.`);
  };

  const handleCreateJob = (item) => {
    navigate(`/pekerjaan?search=${encodeURIComponent(item.odc || item.nama)}`);
  };

  return (
    <div className="space-y-6">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <span>ODP / ODC</span>
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Monitoring hierarki ODC (Induk) dan ODP (Titik Distribusi Pelanggan)
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleOpenAddOdc}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0D1B4A] to-[#1a237e] text-white font-bold rounded-xl text-sm shadow-md hover:shadow-indigo-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Layers className="w-4 h-4 text-purple-300" />
            <span>+ Tambah ODC</span>
          </button>
          <button
            onClick={() => handleOpenAddOdp()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#F59E0B] to-amber-600 text-slate-900 font-bold rounded-xl text-sm shadow-md hover:shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4 text-slate-900" />
            <span>+ Tambah ODP</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total ODC", value: stats.totalOdc, sub: "Induk Jaringan", bg: "bg-purple-50", color: "text-purple-700" },
          { label: "Total ODP", value: stats.totalOdp, sub: "Titik Sebaran", bg: "bg-white", color: "text-gray-900" },
          { label: "ODP Aman", value: stats.aman, sub: "Kondisi Normal", bg: "bg-emerald-50", color: "text-emerald-600" },
          { label: "ODP Diperbaiki", value: stats.diperbaiki, sub: "Perlu Tindakan", bg: "bg-amber-50", color: "text-amber-600" },
          { label: "ODC Bermasalah", value: stats.odcBermasalah, sub: "Ada ODP Gangguan", bg: "bg-rose-50", color: "text-rose-600" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-gray-100 shadow-sm`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-extrabold ${s.color} mt-1`}>{s.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari ODP, ODC, atau Keterangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter ODC */}
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <select
              value={filterOdc}
              onChange={(e) => setFilterOdc(e.target.value)}
              className="bg-transparent outline-none font-semibold text-gray-700 cursor-pointer"
            >
              <option value="ALL">Semua ODC ({allOdcs.length})</option>
              {allOdcs.map((o) => (
                <option key={o.id || o.nama} value={o.nama}>
                  {o.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent outline-none font-semibold text-gray-700 cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="Aman">🟢 Aman</option>
              <option value="Diperbaiki">🟡 Diperbaiki</option>
              <option value="Belum Dicek">⚪ Belum Dicek</option>
            </select>
          </div>

          {/* Accordion Expand/Collapse buttons */}
          <div className="flex items-center gap-1 border-l pl-2 border-gray-200">
            <button
              onClick={handleExpandAll}
              title="Buka Semua ODC"
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Buka Semua
            </button>
            <button
              onClick={handleCollapseAll}
              title="Tutup Semua ODC"
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Tutup Semua
            </button>
          </div>
        </div>
      </div>

      {/* ODC Accordions & ODP Tables */}
      <div className="space-y-4">
        {Object.entries(groupedData).length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <Network className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-700">Tidak ada data ODC / ODP yang cocok</p>
            <p className="text-xs text-gray-400 mt-1">
              Coba sesuaikan kata kunci pencarian atau filter yang dipilih
            </p>
          </div>
        ) : (
          Object.entries(groupedData).map(([odcName, group]) => {
            const isExpanded = expandedOdc[odcName] !== false;
            const items = group.odps;
            const odcMeta = group.odcMeta;
            const issueCount = items.filter((i) => i.status === "Diperbaiki").length;

            return (
              <div
                key={odcName}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all"
              >
                {/* ODC Header */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-gray-50/70 via-white to-gray-50/40">
                  <div
                    onClick={() => toggleOdc(odcName)}
                    className="flex items-center gap-3 cursor-pointer flex-1"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0D1B4A] to-[#1a237e] flex items-center justify-center shadow-sm shrink-0">
                      <Network className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-gray-900">{odcName}</h3>
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-xs font-bold border border-purple-200">
                          {items.length} ODP
                        </span>
                        {issueCount > 0 ? (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-xs font-bold border border-amber-200 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            {issueCount} Perlu Perbaikan
                          </span>
                        ) : items.length > 0 ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Semua Aman
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-xs font-medium">
                            Belum Ada ODP
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                        {odcMeta.lokasi && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {odcMeta.lokasi}
                          </span>
                        )}
                        {odcMeta.kapasitas && (
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-gray-400" />
                            Kapasitas: {odcMeta.kapasitas}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions on ODC */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddOdp(odcName);
                      }}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                      title={`Tambah ODP baru di bawah ${odcName}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ ODP</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditOdc(odcMeta);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Informasi ODC"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOdc(odcMeta);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus ODC"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleOdc(odcName)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ml-1"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* ODP Table inside ODC */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    {items.length === 0 ? (
                      <div className="p-8 text-center bg-gray-50/50">
                        <Network className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-gray-500">
                          Belum ada ODP di dalam {odcName}
                        </p>
                        <button
                          onClick={() => handleOpenAddOdp(odcName)}
                          className="mt-2.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-sm transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          Tambahkan ODP Pertama
                        </button>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50/90 text-left">
                          <tr>
                            <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                              Nama & Titik ODP
                            </th>
                            <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                              Keterangan / Lokasi Tiang
                            </th>
                            <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                              Status Kelayakan
                            </th>
                            <th className="px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {items.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2.5">
                                  {item.status === "Aman" ? (
                                    <Wifi className="w-4 h-4 text-emerald-500 shrink-0" />
                                  ) : item.status === "Diperbaiki" ? (
                                    <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
                                  ) : (
                                    <Wifi className="w-4 h-4 text-gray-300 shrink-0" />
                                  )}
                                  <div>
                                    <span className="font-bold text-gray-800">{item.nama}</span>
                                    <span className="text-[10px] text-gray-400 block">
                                      Induk: {odcName}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-gray-600 text-xs">
                                {item.keterangan || "-"}
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleToggleStatus(item)}
                                    title="Klik untuk ubah status cepat"
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:scale-105 ${
                                      item.status === "Aman"
                                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                                        : item.status === "Diperbaiki"
                                        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
                                        : "bg-gray-50 text-gray-500 ring-1 ring-gray-200 hover:bg-gray-100"
                                    }`}
                                  >
                                    {item.status || "Belum Dicek"}
                                  </button>
                                  {item.status === "Diperbaiki" && (
                                    <button
                                      onClick={() => handleCreateJob(item)}
                                      className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all"
                                      title="Buka menu Pekerjaan untuk buat tiket perbaikan khusus ODP ini"
                                    >
                                      <Wrench className="w-3 h-3 text-purple-600" />
                                      Buat Tiket
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenEditOdp(item)}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit ODP"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(item)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Hapus ODP"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Tambah / Edit ODC */}
      {isOdcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-[#0D1B4A] to-[#1a237e] text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-300" />
                {editingOdc ? "Edit Data ODC" : "Tambah ODC Baru"}
              </h3>
              <button
                onClick={() => setIsOdcModalOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOdc} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Nama ODC <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ODC 05 atau ODC BANDARA"
                  value={odcForm.nama}
                  onChange={(e) => setOdcForm({ ...odcForm, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Wilayah / Lokasi Distribusi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jl. Ahmad Yani - Samping Gardu PLN"
                  value={odcForm.lokasi}
                  onChange={(e) => setOdcForm({ ...odcForm, lokasi: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Kapasitas Splitter / Core
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 8 Port / 96 Core"
                  value={odcForm.kapasitas}
                  onChange={(e) => setOdcForm({ ...odcForm, kapasitas: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Keterangan Tambahan
                </label>
                <textarea
                  placeholder="Catatan teknis ODC..."
                  value={odcForm.keterangan}
                  onChange={(e) => setOdcForm({ ...odcForm, keterangan: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none resize-none"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsOdcModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#0D1B4A] to-[#1a237e] text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                >
                  {editingOdc ? "Simpan Perubahan" : "Tambahkan ODC"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit ODP */}
      {isOdpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-[#F59E0B] to-[#F97316] text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Network className="w-4 h-4 text-white" />
                {editingOdp ? "Edit Data ODP" : "Tambah ODP Baru"}
              </h3>
              <button
                onClick={() => setIsOdpModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOdp} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>
                    1. PILIH ODC INDUK <span className="text-red-500">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOdpModalOpen(false);
                      handleOpenAddOdc();
                    }}
                    className="text-[10px] text-purple-700 hover:underline font-bold"
                  >
                    + Buat ODC Baru
                  </button>
                </label>
                <select
                  required
                  value={odpForm.odc}
                  onChange={(e) => setOdpForm({ ...odpForm, odc: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-purple-200 bg-purple-50/30 rounded-xl text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-purple-400 outline-none"
                >
                  <option value="">-- Pilih ODC Induk --</option>
                  {allOdcs.map((o) => (
                    <option key={o.id || o.nama} value={o.nama}>
                      {o.nama} {o.lokasi ? `(${o.lokasi})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  2. NAMA ODP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ODP 1.2 - M. Sarno"
                  value={odpForm.nama}
                  onChange={(e) => setOdpForm({ ...odpForm, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  3. LOKASI TIANG / KETERANGAN
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Depan Rumah No. 12 / Tiang PLN #42"
                  value={odpForm.keterangan}
                  onChange={(e) => setOdpForm({ ...odpForm, keterangan: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    KAPASITAS PORT
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 8 Port"
                    value={odpForm.kapasitas}
                    onChange={(e) => setOdpForm({ ...odpForm, kapasitas: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    STATUS KELAYAKAN
                  </label>
                  <select
                    value={odpForm.status}
                    onChange={(e) => setOdpForm({ ...odpForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] outline-none bg-white"
                  >
                    <option value="Aman">🟢 Aman</option>
                    <option value="Diperbaiki">🟡 Diperbaiki (Gangguan / LOS)</option>
                    <option value="">⚪ Belum Dicek</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsOdpModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#F59E0B] to-[#F97316] text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                >
                  {editingOdp ? "Simpan Perubahan" : "Tambahkan ODP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-gray-100 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 text-base">Hapus ODP Ini?</h3>
            <p className="text-gray-500 text-xs mt-1">
              Apakah Anda yakin ingin menghapus{" "}
              <span className="font-semibold text-gray-800">{deleteConfirm.nama}</span> (
              {deleteConfirm.odc})?
            </p>
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteOdp(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                Hapus ODP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
