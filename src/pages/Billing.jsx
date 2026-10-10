import { useState, useMemo } from "react";
import {
  CreditCard,
  Search,
  Filter,
  Plus,
  QrCode,
  Printer,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Settings2,
  DollarSign,
  FileText,
  Clock,
  Zap,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  MoreVertical,
  Sliders,
  Check,
  ChevronDown,
} from "lucide-react";
import { usePersistState } from "../hooks/usePersistState";
import { initialInvoices } from "../data/mockInvoices";
import { initialPelangganRadius } from "../data/mockData";
import {
  formatRupiah,
  calculateInvoiceBreakdown,
  DEFAULT_BILLING_CYCLE,
  generateInvoiceNumber,
} from "../lib/billingTax";
import {
  generateWaInvoiceNotice,
  generateWaDueDateNotice,
  generateWaIsolirNotice,
  generateWaPaidReceipt,
} from "../lib/whatsappBilling";
import InvoiceDetailModal from "../components/InvoiceDetailModal";
import PaymentQrisModal from "../components/PaymentQrisModal";
import { showToast } from "../lib/toast";

export default function Billing() {
  const [invoices, setInvoices] = usePersistState("xnet_invoices", initialInvoices);
  const [pelangganList, setPelangganList] = usePersistState(
    "xnet_pelanggan_radius",
    initialPelangganRadius
  );
  const [cycleConfig, setCycleConfig] = usePersistState(
    "xnet_billing_cycle_config",
    DEFAULT_BILLING_CYCLE
  );

  // Modal States
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [qrisModalOpen, setQrisModalOpen] = useState(false);
  const [cycleModalOpen, setCycleModalOpen] = useState(false);
  const [createInvoiceModalOpen, setCreateInvoiceModalOpen] = useState(false);
  const [activeWaDropdownId, setActiveWaDropdownId] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | BELUM_BAYAR | LUNAS | ISOLIR

  // Form New Invoice
  const [newInvoiceForm, setNewInvoiceForm] = useState({
    pelangganId: "",
    paket: "Home Fiber 30 Mbps",
    kecepatan: "30 Mbps",
    hargaDasar: 250000,
    jatuhTempo: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    catatan: "",
  });

  // KPI Calculations
  const stats = useMemo(() => {
    let totalOmzet = 0;
    let totalLunas = 0;
    let totalMenunggak = 0;
    let countLunas = 0;
    let countIsolir = 0;

    invoices.forEach((inv) => {
      totalOmzet += inv.total || 0;
      if (inv.status === "LUNAS") {
        totalLunas += inv.total || 0;
        countLunas++;
      } else {
        totalMenunggak += inv.total || 0;
        if (inv.status === "ISOLIR") {
          countIsolir++;
        }
      }
    });

    const lunasPercent = totalOmzet > 0 ? Math.round((totalLunas / totalOmzet) * 100) : 0;

    return {
      totalOmzet,
      totalLunas,
      totalMenunggak,
      countLunas,
      countIsolir,
      totalInvoices: invoices.length,
      lunasPercent,
    };
  }, [invoices]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.pelanggan.toLowerCase().includes(search.toLowerCase()) ||
        inv.nomor_invoice.toLowerCase().includes(search.toLowerCase()) ||
        (inv.id_pelanggan && inv.id_pelanggan.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === "ALL" || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  // Handler: Eksekusi Pembayaran Sukses (Auto-Unisolir)
  const handlePaymentSuccess = (invoice, paymentMethod = "QRIS Instant") => {
    const updatedInvoices = invoices.map((inv) => {
      if (inv.id === invoice.id) {
        return {
          ...inv,
          status: "LUNAS",
          metode_bayar: paymentMethod,
          tanggal_bayar: new Date().toLocaleString("id-ID"),
        };
      }
      return inv;
    });

    setInvoices(updatedInvoices);

    // AUTO-UNISOLIR: Cek jika pelanggan berstatus ISOLIR di tabel pelanggan
    const targetCust = pelangganList.find(
      (p) => p.id_pelanggan === invoice.id_pelanggan || p.nama === invoice.pelanggan
    );

    if (targetCust && targetCust.status === "ISOLIR") {
      setPelangganList((prev) =>
        prev.map((p) =>
          p.id === targetCust.id || p.id_pelanggan === targetCust.id_pelanggan
            ? { ...p, status: "AKTIF" }
            : p
        )
      );
      showToast(
        `Pembayaran ${paymentMethod} berhasil! Status internet ${invoice.pelanggan} OTOMATIS AKTIF KEMBALI (Auto-Unisolir 24 Jam).`,
        "success"
      );
    } else {
      showToast(`Pembayaran ${invoice.nomor_invoice} berhasil dicatat LUNAS.`, "success");
    }

    setQrisModalOpen(false);
  };

  // Handler: Manual Isolir Pelanggan
  const handleToggleIsolir = (invoice) => {
    const nextStatus = invoice.status === "ISOLIR" ? "BELUM_BAYAR" : "ISOLIR";
    setInvoices((prev) =>
      prev.map((it) => (it.id === invoice.id ? { ...it, status: nextStatus } : it))
    );

    // Sinkronkan ke Pelanggan Radius
    if (nextStatus === "ISOLIR") {
      setPelangganList((prev) =>
        prev.map((p) =>
          p.id_pelanggan === invoice.id_pelanggan || p.nama === invoice.pelanggan
            ? { ...p, status: "ISOLIR" }
            : p
        )
      );
      showToast(`Layanan ${invoice.pelanggan} dialihkan ke status ISOLIR (Koneksi dinonaktifkan).`, "warning");
    } else {
      showToast(`Status tagihan ${invoice.pelanggan} dikembalikan ke Belum Bayar.`, "info");
    }
  };

  // Handler: Buat Tagihan Baru
  const handleCreateInvoice = (e) => {
    e.preventDefault();
    const cust = pelangganList.find((p) => String(p.id) === String(newInvoiceForm.pelangganId));
    if (!cust) {
      showToast("Pilih pelanggan terlebih dahulu!", "error");
      return;
    }

    const basePrice = Number(newInvoiceForm.hargaDasar) || 200000;
    const breakdown = calculateInvoiceBreakdown(basePrice, {
      includePajak: cycleConfig.includePajak,
      enablePpn: cycleConfig.enablePpn,
      enableBhp: cycleConfig.enableBhp,
      enableUso: cycleConfig.enableUso,
    });

    const newInv = {
      id: Date.now(),
      nomor_invoice: generateInvoiceNumber(invoices.length + 1),
      id_pelanggan: cust.id_pelanggan,
      pelanggan: cust.nama,
      telepon: cust.telepon,
      alamat: cust.alamat,
      paket: newInvoiceForm.paket,
      kecepatan: newInvoiceForm.kecepatan,
      periode: new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
      tanggal_terbit: new Date().toISOString().split("T")[0],
      jatuh_tempo: newInvoiceForm.jatuhTempo,
      status: "BELUM_BAYAR",
      basePrice,
      ...breakdown,
      metode_bayar: "-",
      tanggal_bayar: null,
      catatan: newInvoiceForm.catatan || "Tagihan rutin internet bulanan",
    };

    setInvoices([newInv, ...invoices]);
    showToast(`Invoice ${newInv.nomor_invoice} untuk ${cust.nama} berhasil diterbitkan!`, "success");
    setCreateInvoiceModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Billing & Tagihan ISP</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              Support PPN, BHP, USO
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            Sistem penagihan otomatis, kepatuhan pajak resmi Kominfo, payment gateway QRIS & auto-unisolir 24 jam.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setCycleModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Siklus & Pajak</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateInvoiceModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#0D1B4A] hover:bg-[#1a2e70] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-950/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Terbitkan Invoice</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Omzet */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tagihan Bulan Ini</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2 font-mono">{formatRupiah(stats.totalOmzet)}</h3>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>{stats.totalInvoices} invoice terbit</span>
            <span>•</span>
            <span className="font-semibold text-blue-600">{stats.lunasPercent}% tertagih</span>
          </p>
        </div>

        {/* Lunas */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Terbayar (Lunas)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-emerald-700 mt-2 font-mono">{formatRupiah(stats.totalLunas)}</h3>
          <p className="text-[11px] text-emerald-600 mt-1 font-semibold">
            {stats.countLunas} pelanggan lunas
          </p>
        </div>

        {/* Menunggak */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Belum Bayar (Piutang)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-amber-700 mt-2 font-mono">{formatRupiah(stats.totalMenunggak)}</h3>
          <p className="text-[11px] text-amber-600 mt-1 font-semibold">
            {stats.totalInvoices - stats.countLunas} invoice menunggak
          </p>
        </div>

        {/* Terisolir */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pelanggan Terisolir</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-rose-700 mt-2 font-mono">{stats.countIsolir} Akun</h3>
          <p className="text-[11px] text-rose-600 mt-1 font-medium">
            Koneksi diblokir sementara sampai QRIS lunas
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Tab Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { key: "ALL", label: "Semua", count: invoices.length },
              { key: "BELUM_BAYAR", label: "Belum Bayar", count: invoices.filter((i) => i.status === "BELUM_BAYAR").length },
              { key: "ISOLIR", label: "Terisolir", count: invoices.filter((i) => i.status === "ISOLIR").length },
              { key: "LUNAS", label: "Lunas", count: invoices.filter((i) => i.status === "LUNAS").length },
            ].map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? "bg-[#0D1B4A] text-white shadow-xs"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pelanggan, nomor invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D1B4A]/20 focus:border-[#0D1B4A]"
            />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
              <tr>
                <th className="px-4 py-3.5">No. Invoice</th>
                <th className="px-4 py-3.5">Pelanggan</th>
                <th className="px-4 py-3.5">Paket & Speed</th>
                <th className="px-4 py-3.5 text-right">DPP</th>
                <th className="px-4 py-3.5 text-right">Pajak (PPN/BHP/USO)</th>
                <th className="px-4 py-3.5 text-right">Total Tagihan</th>
                <th className="px-4 py-3.5 text-center">Jatuh Tempo</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredInvoices.map((inv) => {
                const isPaid = inv.status === "LUNAS";
                const isIsolir = inv.status === "ISOLIR";

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Invoice ID */}
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{inv.nomor_invoice}</span>
                      </div>
                    </td>

                    {/* Pelanggan */}
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{inv.pelanggan}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{inv.id_pelanggan || "-"}</p>
                    </td>

                    {/* Paket */}
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-700">{inv.paket}</span>
                      <span className="text-[10px] text-blue-600 block font-bold">{inv.kecepatan}</span>
                    </td>

                    {/* DPP */}
                    <td className="px-4 py-3 text-right font-mono text-slate-700">
                      {formatRupiah(inv.dpp)}
                    </td>

                    {/* Pajak */}
                    <td className="px-4 py-3 text-right font-mono text-slate-500 text-[11px]" title={`PPN: ${formatRupiah(inv.ppn)} | BHP: ${formatRupiah(inv.bhp)} | USO: ${formatRupiah(inv.uso)}`}>
                      +{formatRupiah(inv.subtotalPajak || inv.ppn + inv.bhp + inv.uso)}
                    </td>

                    {/* Total Tagihan */}
                    <td className="px-4 py-3 text-right font-mono font-extrabold text-slate-900 text-sm">
                      {formatRupiah(inv.total)}
                    </td>

                    {/* Jatuh Tempo */}
                    <td className="px-4 py-3 text-center text-slate-500">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 font-medium">
                        {inv.jatuh_tempo}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3 text-center">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Lunas</span>
                        </span>
                      ) : isIsolir ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          <Zap className="w-3 h-3 text-rose-600" />
                          <span>Terisolir</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Belum Bayar</span>
                        </span>
                      )}
                    </td>

                    {/* Aksi Cepat */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Bayar QRIS */}
                        {!isPaid && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setQrisModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                            title="Bayar Cepat via QRIS (Auto-Unisolir)"
                          >
                            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                        )}

                        {/* Cetak Faktur / Struk */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setDetailModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer"
                          title="Lihat Faktur & Cetak Struk"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* WhatsApp Notice Dropdown */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveWaDropdownId(activeWaDropdownId === inv.id ? null : inv.id)
                            }
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                            title="Kirim Notifikasi WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          </button>

                          {activeWaDropdownId === inv.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-20 text-left text-xs font-semibold">
                              <a
                                href={generateWaInvoiceNotice(inv)}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setActiveWaDropdownId(null)}
                                className="block px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                              >
                                📩 Kirim Tagihan (H-3)
                              </a>
                              <a
                                href={generateWaDueDateNotice(inv)}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setActiveWaDropdownId(null)}
                                className="block px-3 py-1.5 hover:bg-slate-50 text-amber-700"
                              >
                                ⏳ Pengingat Jatuh Tempo
                              </a>
                              {isIsolir && (
                                <a
                                  href={generateWaIsolirNotice(inv)}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() => setActiveWaDropdownId(null)}
                                  className="block px-3 py-1.5 hover:bg-slate-50 text-rose-700"
                                >
                                  🔴 Surat Isolir Layanan
                                </a>
                              )}
                              {isPaid && (
                                <a
                                  href={generateWaPaidReceipt(inv)}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() => setActiveWaDropdownId(null)}
                                  className="block px-3 py-1.5 hover:bg-slate-50 text-emerald-700"
                                >
                                  ✅ Kirim Kwitansi Lunas
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Toggle Isolir / Unisolir Manual */}
                        {!isPaid && (
                          <button
                            type="button"
                            onClick={() => handleToggleIsolir(inv)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isIsolir
                                ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                                : "bg-slate-50 text-slate-400 border-slate-200 hover:text-rose-600"
                            }`}
                            title={isIsolir ? "Buka Isolir Layanan" : "Isolir Koneksi Pelanggan"}
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold">Tidak ada tagihan yang cocok dengan filter</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail & Print Invoice */}
      <InvoiceDetailModal
        isOpen={detailModalOpen}
        invoice={selectedInvoice}
        onClose={() => setDetailModalOpen(false)}
        onPayQris={(inv) => {
          setDetailModalOpen(false);
          setSelectedInvoice(inv);
          setQrisModalOpen(true);
        }}
      />

      {/* Modal QRIS Payment */}
      <PaymentQrisModal
        isOpen={qrisModalOpen}
        invoice={selectedInvoice}
        onClose={() => setQrisModalOpen(false)}
        onConfirmPayment={handlePaymentSuccess}
      />

      {/* Modal Siklus Penagihan & Pajak ISP */}
      {cycleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#0D1B4A]" />
                <h3 className="font-black text-slate-900 text-sm">Konfigurasi Siklus & Pajak ISP</h3>
              </div>
              <button
                type="button"
                onClick={() => setCycleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-900">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  Regulasi Perpajakan ISP Indonesia
                </p>
                <p className="text-[11px] text-blue-700 mt-1">
                  Mendukung kepatuhan PPN Kemenkeu serta kontribusi BHP & USO Ditjen PPI Kominfo.
                </p>
              </div>

              {/* Mode Include / Exclude */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Metode Pajak Paket:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCycleConfig({ ...cycleConfig, includePajak: false })}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      !cycleConfig.includePajak
                        ? "bg-[#0D1B4A] text-white border-[#0D1B4A]"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    Exclude Pajak (+Pajak)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCycleConfig({ ...cycleConfig, includePajak: true })}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      cycleConfig.includePajak
                        ? "bg-[#0D1B4A] text-white border-[#0D1B4A]"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    Include (Termasuk Pajak)
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-800">PPN (11%)</span>
                    <p className="text-[10px] text-slate-400">Pajak Pertambahan Nilai</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={cycleConfig.enablePpn}
                    onChange={(e) => setCycleConfig({ ...cycleConfig, enablePpn: e.target.checked })}
                    className="w-4 h-4 accent-[#0D1B4A]"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-800">BHP Telekomunikasi (0.5%)</span>
                    <p className="text-[10px] text-slate-400">Biaya Hak Penyelenggaraan Kominfo</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={cycleConfig.enableBhp}
                    onChange={(e) => setCycleConfig({ ...cycleConfig, enableBhp: e.target.checked })}
                    className="w-4 h-4 accent-[#0D1B4A]"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-800">USO Telekomunikasi (1.25%)</span>
                    <p className="text-[10px] text-slate-400">Pelayanan Universal KPU Kominfo</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={cycleConfig.enableUso}
                    onChange={(e) => setCycleConfig({ ...cycleConfig, enableUso: e.target.checked })}
                    className="w-4 h-4 accent-[#0D1B4A]"
                  />
                </label>
              </div>

              {/* Siklus Tanggal */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Tgl Cetak:</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={cycleConfig.billDate}
                    onChange={(e) => setCycleConfig({ ...cycleConfig, billDate: Number(e.target.value) })}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Tgl Tempo:</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={cycleConfig.dueDate}
                    onChange={(e) => setCycleConfig({ ...cycleConfig, dueDate: Number(e.target.value) })}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Tgl Isolir:</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={cycleConfig.isolirDate}
                    onChange={(e) => setCycleConfig({ ...cycleConfig, isolirDate: Number(e.target.value) })}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-center font-bold text-rose-600"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  showToast("Pengaturan siklus & pajak berhasil disimpan!", "success");
                  setCycleModalOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-[#0D1B4A] hover:bg-[#1a2e70] text-white font-bold text-xs mt-4"
              >
                Simpan Konfigurasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Terbitkan Invoice Baru */}
      {createInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0D1B4A]" />
                <h3 className="font-black text-slate-900 text-sm">Terbitkan Tagihan Pelanggan Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateInvoiceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Pelanggan:</label>
                <select
                  required
                  value={newInvoiceForm.pelangganId}
                  onChange={(e) => {
                    const c = pelangganList.find((p) => String(p.id) === e.target.value);
                    setNewInvoiceForm({
                      ...newInvoiceForm,
                      pelangganId: e.target.value,
                      paket: c?.paket || newInvoiceForm.paket,
                    });
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                >
                  <option value="">-- Pilih dari database Pelanggan Radius --</option>
                  {pelangganList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.id_pelanggan || "-"}) - {p.paket}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Paket:</label>
                  <input
                    type="text"
                    required
                    value={newInvoiceForm.paket}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, paket: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kecepatan:</label>
                  <input
                    type="text"
                    required
                    value={newInvoiceForm.kecepatan}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, kecepatan: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Harga Dasar (DPP):</label>
                  <input
                    type="number"
                    required
                    value={newInvoiceForm.hargaDasar}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, hargaDasar: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jatuh Tempo:</label>
                  <input
                    type="date"
                    required
                    value={newInvoiceForm.jatuhTempo}
                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, jatuhTempo: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Tambahan:</label>
                <input
                  type="text"
                  placeholder="Misal: Tagihan pemakaian bulan berjalan"
                  value={newInvoiceForm.catatan}
                  onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, catatan: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px]">
                <p>
                  * Tagihan akan otomatis dihitung pajaknya ({cycleConfig.includePajak ? "Include" : "Exclude"}{" "}
                  PPN 11%, BHP 0.5%, USO 1.25%).
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateInvoiceModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0D1B4A] hover:bg-[#1a2e70] text-white font-bold"
                >
                  Terbitkan Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
