import { useRef } from "react";
import { X, Printer, Send, CheckCircle2, ShieldCheck, Wallet, Receipt, DollarSign, Calendar, Building2, UserCheck } from "lucide-react";
import { formatRupiah } from "../lib/incentives";
import { terbilangRupiah, generateWhatsAppSlipMessage } from "../lib/payroll";
import { showToast } from "../lib/toast";

export default function SlipGajiModal({ payrollData, onClose }) {
  const slipRef = useRef(null);

  if (!payrollData) return null;
  const p = payrollData;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const rawNumber = p.nomorWa || "";
    let cleanNumber = rawNumber.replace(/[^0-9]/g, "");
    if (cleanNumber.startsWith("0")) {
      cleanNumber = "62" + cleanNumber.slice(1);
    }
    const message = generateWhatsAppSlipMessage(p);
    const encoded = encodeURIComponent(message);
    const url = cleanNumber ? `https://wa.me/${cleanNumber}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
    showToast("Membuka WhatsApp untuk mengirim slip gaji...", "info");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container Slip Gaji */}
      <div
        ref={slipRef}
        className="bg-white w-full max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none"
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 sm:hidden print:hidden" />

        {/* Modal Action Bar (Hidden on Print) */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Preview Slip Gaji Resmi</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendWhatsApp}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim WA</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-[#0D1B4A] hover:bg-[#152763] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Cetak / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Slip Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 print:p-8 print:overflow-visible">
          {/* Header Surat Slip */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 border-b-2 border-slate-900 gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#0D1B4A] text-[#F59E0B] flex items-center justify-center font-black text-xl shadow-md shrink-0">
                N
              </div>
              <div>
                <h1 className="text-xl font-black text-[#0D1B4A] tracking-tight">NEXUS NET MANAGEMENT</h1>
                <p className="text-xs text-slate-500">PT Kurnia Digital Telekomunikasi &bull; ISP FTTH Infrastructure</p>
                <p className="text-[11px] text-slate-400">Jl. Jenderal Sudirman No. 88, Pontianak &bull; support@nexus.net</p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] font-black tracking-widest uppercase">
                SLIP PENGGAJIAN TEKNISI
              </div>
              <p className="text-xs font-mono font-bold text-slate-800 mt-1.5">{p.slipNumber}</p>
              <p className="text-[11px] text-slate-500">Periode: <strong className="text-slate-700">{p.periodLabel}</strong></p>
            </div>
          </div>

          {/* Profil Penerima */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Nama Penerima</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{p.atasNama}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Regu / Tim</span>
              <span className="font-bold text-[#0D1B4A] text-sm mt-0.5 block">{p.timNama}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Skema Gaji</span>
              <span className="font-semibold text-slate-700 mt-0.5 block">
                {p.skema === "TETAP_KOMISI" ? "Gaji Pokok + Komisi" : p.skema === "HARIAN_KOMISI" ? "Harian + Komisi" : "Murni Komisi"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Rekening Pembayaran</span>
              <span className="font-semibold text-slate-700 mt-0.5 block">{p.rekeningBank}</span>
            </div>
          </div>

          {/* Rincian Komponen Gaji: Penerimaan vs Potongan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kolom Kiri: Penerimaan (Penghasilan Bruto) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  A. Penerimaan (Penghasilan)
                </span>
                <span className="text-xs font-bold text-slate-500">Jumlah</span>
              </div>

              <div className="space-y-2 text-xs">
                {p.gajiPokok > 0 && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-700">
                      Gaji Pokok {p.skema === "HARIAN_KOMISI" ? `(${p.hariKerja} hari x ${formatRupiah(p.uangHarian)})` : ""}
                    </span>
                    <span className="font-bold text-slate-900">{formatRupiah(p.gajiPokok)}</span>
                  </div>
                )}

                {p.tunjanganMakan > 0 && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-700">Tunjangan Uang Makan</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(p.tunjanganMakan)}</span>
                  </div>
                )}

                {p.tunjanganTransport > 0 && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-700">Tunjangan Transport / BBM</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(p.tunjanganTransport)}</span>
                  </div>
                )}

                {p.tunjanganKomunikasi > 0 && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-700">Tunjangan Komunikasi / Pulsa</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(p.tunjanganKomunikasi)}</span>
                  </div>
                )}

                {/* Komisi SPK Lapangan */}
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1.5 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-blue-950">Komisi Tugas SPK ({p.totalTugasSelesai} selesai)</span>
                    <span className="font-black text-blue-900">{formatRupiah(p.totalKomisiTugas)}</span>
                  </div>

                  {/* Rincian Item Pekerjaan */}
                  {Array.isArray(p.itemKomisiRincian) && p.itemKomisiRincian.length > 0 && (
                    <div className="pt-2 border-t border-blue-200/50 space-y-1 text-[11px] text-blue-800">
                      {p.itemKomisiRincian.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="text-slate-600 truncate max-w-[200px]">
                            • {item.nama} ({item.totalQty} {item.satuan})
                          </span>
                          <span className="font-medium text-slate-800">{formatRupiah(item.totalAmount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {p.bonusTarget > 0 && (
                  <div className="flex justify-between items-center py-1.5 px-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-amber-900 font-bold">Bonus Target ({p.targetTierLabel})</span>
                    <span className="font-black text-amber-900">+{formatRupiah(p.bonusTarget)}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-between items-center text-xs font-bold text-slate-900 border-t border-slate-300">
                <span>Total Penghasilan Kotor</span>
                <span className="text-emerald-700">{formatRupiah(p.totalPenghasilanKotor)}</span>
              </div>
            </div>

            {/* Kolom Kanan: Potongan */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  B. Potongan (Deductions)
                </span>
                <span className="text-xs font-bold text-slate-500">Jumlah</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-700">Potongan Kasbon / Pinjaman</span>
                  <span className="font-semibold text-slate-900">
                    {p.potonganKasbon > 0 ? `-${formatRupiah(p.potonganKasbon)}` : "Rp 0"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-700">Iuran BPJS Ketenagakerjaan</span>
                  <span className="font-semibold text-slate-900">
                    {p.potonganBpjs > 0 ? `-${formatRupiah(p.potonganBpjs)}` : "Rp 0"}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-700">Potongan Lainnya / Denda SLA</span>
                  <span className="font-semibold text-slate-900">
                    {p.potonganLain > 0 ? `-${formatRupiah(p.potonganLain)}` : "Rp 0"}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-xs font-bold text-slate-900 border-t border-slate-300">
                <span>Total Potongan</span>
                <span className="text-rose-600">-{formatRupiah(p.totalPotongan)}</span>
              </div>

              {/* Box Info Kepatuhan SOP */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 mt-6 text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Kepatuhan SOP Mutu & K3
                </p>
                <p>Seluruh pekerjaan telah divalidasi dengan checklist helm/rompi K3, foto ber-watermark GPS presisi, dan uji redaman OPM standar industri.</p>
              </div>
            </div>
          </div>

          {/* Kotak Take Home Pay (Gaji Bersih) */}
          <div className="p-5 sm:p-6 bg-[#0D1B4A] rounded-2xl text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-amber-400 font-bold block">
                Total Gaji Bersih (Take Home Pay)
              </span>
              <p className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
                {formatRupiah(p.takeHomePay)}
              </p>
              <p className="text-xs text-white/70 italic mt-0.5">
                Terbilang: {terbilangRupiah(p.takeHomePay)}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white/10 px-4 py-2.5 rounded-xl border border-white/15 text-xs text-emerald-400 font-bold shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>TERVERIFIKASI &bull; SIAP DIBAYAR</span>
            </div>
          </div>

          {/* Tanda Tangan / Otorisasi */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
            <div>
              <p className="text-slate-400 mb-14">Disetujui oleh (Finance / Operations):</p>
              <p className="font-bold text-slate-900 text-sm">Nexus Finance Dept.</p>
              <p className="text-[10px] text-slate-400">Head of Operations</p>
            </div>
            <div>
              <p className="text-slate-400 mb-14">Diterima oleh Teknisi:</p>
              <p className="font-bold text-slate-900 text-sm">{p.atasNama}</p>
              <p className="text-[10px] text-slate-400">Field Technician ({p.timNama})</p>
            </div>
          </div>
        </div>

        {/* Footer info cetak */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 text-center text-[11px] text-slate-500 print:block">
          Dicetak pada: {new Date().toLocaleString("id-ID")} &bull; Sistem Penggajian Otomatis Nexus Net
        </div>
      </div>
    </div>
  );
}
