import { useState } from "react";
import {
  X,
  Printer,
  FileText,
  Receipt,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  Building,
  ShieldCheck,
  QrCode,
} from "lucide-react";
import { formatRupiah } from "../lib/billingTax";

export default function InvoiceDetailModal({ isOpen, invoice, onClose, onPayQris }) {
  const [printMode, setPrintMode] = useState("a4"); // "a4" | "thermal"

  if (!isOpen || !invoice) return null;

  const isPaid = invoice.status === "LUNAS";
  const isIsolir = invoice.status === "ISOLIR";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto print:shadow-none print:border-none print:max-w-none print:w-full">
        {/* Header Modal (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0D1B4A]/10 text-[#0D1B4A] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5 text-[#0D1B4A]" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Faktur & Kwitansi Tagihan</h3>
              <p className="text-xs text-slate-500 font-mono">{invoice.nomor_invoice}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="inline-flex rounded-xl bg-slate-200/60 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPrintMode("a4")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  printMode === "a4"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Format A4</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintMode("thermal")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  printMode === "thermal"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Struk Thermal (58mm)</span>
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-[#0D1B4A] text-white hover:bg-[#1a2e70] transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Invoice Content */}
        <div className="p-6 sm:p-8 max-h-[82vh] overflow-y-auto print:max-h-none print:p-0">
          {printMode === "a4" ? (
            /* ================= FORMAT A4 RESMI ================= */
            <div className="border border-slate-200 rounded-2xl p-6 sm:p-8 bg-white text-slate-800 relative overflow-hidden print:border-none print:p-0">
              {/* Cap Stempel Status LUNAS / BELUM BAYAR */}
              <div className="absolute right-8 top-28 sm:top-24 pointer-events-none select-none opacity-85 rotate-[-12deg]">
                {isPaid ? (
                  <div className="border-4 border-emerald-600 rounded-2xl px-5 py-2 text-emerald-600 font-black tracking-widest text-2xl uppercase shadow-sm">
                    ✓ LUNAS
                  </div>
                ) : isIsolir ? (
                  <div className="border-4 border-rose-600 rounded-2xl px-4 py-2 text-rose-600 font-black tracking-widest text-xl uppercase shadow-sm">
                    ✕ TERISOLIR
                  </div>
                ) : (
                  <div className="border-4 border-amber-600 rounded-2xl px-4 py-2 text-amber-600 font-black tracking-widest text-xl uppercase shadow-sm">
                    ! BELUM BAYAR
                  </div>
                )}
              </div>

              {/* Kop Surat Perusahaan */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0D1B4A] text-white flex items-center justify-center font-black text-xl shadow-md">
                    NX
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-[#0D1B4A] tracking-tight">NEXUS NET MANAGEMENT</h2>
                    <p className="text-xs text-slate-500 font-medium">PT. Kurnia Telekomunikasi Indonesia</p>
                    <p className="text-[11px] text-slate-400">Izin Kominfo No: 088/DIRJEN-PPI/ISP/2024 • NPWP: 72.881.992.4-701.000</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                    Faktur Pajak & Tagihan ISP
                  </span>
                  <p className="text-sm font-mono font-bold text-slate-900 mt-1">{invoice.nomor_invoice}</p>
                  <p className="text-xs text-slate-500">Tgl Terbit: {invoice.tanggal_terbit}</p>
                </div>
              </div>

              {/* Detail Pelanggan & Jatuh Tempo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Ditagihkan Kepada:</span>
                  <h4 className="text-base font-extrabold text-slate-900 mt-1">{invoice.pelanggan}</h4>
                  <p className="text-xs text-slate-600 font-mono font-semibold">ID: {invoice.id_pelanggan}</p>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-sm">{invoice.alamat}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">Telp: {invoice.telepon}</p>
                </div>
                <div className="sm:text-right space-y-1 text-xs">
                  <div>
                    <span className="text-slate-400">Periode Tagihan:</span>
                    <span className="font-bold text-slate-800 ml-2">{invoice.periode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Jatuh Tempo:</span>
                    <span className="font-bold text-rose-600 ml-2">{invoice.jatuh_tempo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Status Layanan:</span>
                    <span className={`font-bold ml-2 ${isPaid ? "text-emerald-600" : isIsolir ? "text-rose-600" : "text-amber-600"}`}>
                      {invoice.status}
                    </span>
                  </div>
                  {invoice.tanggal_bayar && (
                    <div>
                      <span className="text-slate-400">Waktu Bayar:</span>
                      <span className="font-bold text-emerald-700 ml-2">{invoice.tanggal_bayar}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rincian Layanan & Komponen Biaya */}
              <div className="py-6">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                      <th className="text-left pb-2 font-bold">Deskripsi Layanan</th>
                      <th className="text-center pb-2 font-bold">Bandwidth</th>
                      <th className="text-right pb-2 font-bold">Harga DPP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3">
                        <p className="font-bold text-slate-900">{invoice.paket}</p>
                        <p className="text-[11px] text-slate-500">Akses Internet Dedicated Fiber Optik Unlimited</p>
                      </td>
                      <td className="py-3 text-center font-bold text-blue-700">{invoice.kecepatan}</td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900">{formatRupiah(invoice.dpp)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Breakdown Pajak Resmi (PPN, BHP, USO) */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Dasar Pengenaan Pajak (DPP):</span>
                  <span className="font-mono font-bold text-slate-800">{formatRupiah(invoice.dpp)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>PPN ({invoice.ppnPercent || 11}%):</span>
                  <span className="font-mono font-bold text-slate-800">+{formatRupiah(invoice.ppn)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>BHP Telekomunikasi ({invoice.bhpPercent || 0.5}% Kominfo):</span>
                  <span className="font-mono font-medium">+{formatRupiah(invoice.bhp)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>USO / KPU Telekomunikasi ({invoice.usoPercent || 1.25}% Kominfo):</span>
                  <span className="font-mono font-medium">+{formatRupiah(invoice.uso)}</span>
                </div>
                <div className="pt-2 border-t-2 border-slate-300 flex justify-between items-center text-sm font-extrabold text-[#0D1B4A]">
                  <span className="text-base font-black">TOTAL TAGIHAN:</span>
                  <span className="text-lg font-mono font-black text-emerald-700">{formatRupiah(invoice.total)}</span>
                </div>
              </div>

              {/* Payment Section / QRIS Footer */}
              {!isPaid && (
                <div className="mt-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-950">Bayar Praktis via QRIS Realtime</p>
                      <p className="text-[11px] text-amber-800">Buka isolir otomatis 24 jam begitu QRIS terbayar</p>
                    </div>
                  </div>
                  {onPayQris && (
                    <button
                      type="button"
                      onClick={() => onPayQris(invoice)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
                    >
                      Buka Pembayaran QRIS
                    </button>
                  )}
                </div>
              )}

              {/* Footer Tanda Tangan */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-end text-[11px] text-slate-400">
                <div>
                  <p>Terima kasih atas kepercayaan Anda menggunakan layanan Nexus Net.</p>
                  <p>Layanan Bantuan Pelanggan: 0812-5555-8888 • helpdesk@nexusnet.id</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-700">PT. Kurnia Telekomunikasi Indonesia</p>
                  <div className="h-10" />
                  <p className="underline font-bold text-slate-800">Bagian Keuangan & Billing</p>
                </div>
              </div>
            </div>
          ) : (
            /* ================= FORMAT THERMAL RECEIPT (58mm) ================= */
            <div className="max-w-[340px] mx-auto bg-white p-5 border border-dashed border-slate-300 rounded-xl font-mono text-xs text-slate-800 space-y-2 shadow-xs">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h4 className="font-black text-sm text-slate-900">NEXUS NET WIFI</h4>
                <p className="text-[10px] text-slate-500">PT. Kurnia Telekomunikasi</p>
                <p className="text-[10px] text-slate-500">Pontianak, Kalimantan Barat</p>
              </div>

              <div className="space-y-1 text-[11px] py-1 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span>No. Inv:</span>
                  <span className="font-bold">{invoice.nomor_invoice}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tgl:</span>
                  <span>{invoice.tanggal_terbit}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span className="font-bold truncate max-w-[150px]">{invoice.pelanggan}</span>
                </div>
                <div className="flex justify-between">
                  <span>ID:</span>
                  <span>{invoice.id_pelanggan}</span>
                </div>
                <div className="flex justify-between">
                  <span>Periode:</span>
                  <span>{invoice.periode}</span>
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-slate-300 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>{invoice.paket}</span>
                  <span>{formatRupiah(invoice.dpp)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>PPN (11%):</span>
                  <span>+{formatRupiah(invoice.ppn)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>BHP & USO:</span>
                  <span>+{formatRupiah(invoice.bhp + invoice.uso)}</span>
                </div>
              </div>

              <div className="py-1 flex justify-between font-black text-sm">
                <span>TOTAL:</span>
                <span>{formatRupiah(invoice.total)}</span>
              </div>

              <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-600">
                <p className="font-bold uppercase tracking-wider">{isPaid ? "--- LUNAS ---" : "--- BELUM BAYAR ---"}</p>
                {invoice.tanggal_bayar && <p>Bayar: {invoice.tanggal_bayar}</p>}
                <p className="mt-2 text-[9px] text-slate-400">Simpan struk ini sebagai bukti sah.</p>
                <p className="text-[9px] text-slate-400">CS: 0812-5555-8888</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
