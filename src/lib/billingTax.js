/**
 * Billing & Tax Calculator untuk Regulasi ISP Indonesia
 * Mendukung perhitungan PPN (11% / 12%), BHP Telekomunikasi (0.5%), dan USO (1.25%)
 */

export const TAX_RATES = {
  PPN_RATE: 0.11, // PPN 11% (dapat disesuaikan ke 0.12)
  BHP_RATE: 0.005, // BHP Telekomunikasi 0.5%
  USO_RATE: 0.0125, // Universal Service Obligation 1.25%
  GATEWAY_FEE_FIXED: 0, // Biaya tetap QRIS / VA (jika dibebankan)
  GATEWAY_PERCENT: 0.007, // Biaya MDR QRIS standar 0.7% (opsional)
};

export const DEFAULT_BILLING_CYCLE = {
  billDate: 20, // Tanggal terbit invoice (tiap tanggal 20)
  dueDate: 5,   // Tanggal jatuh tempo (tiap tanggal 5 bulan berikutnya)
  isolirDate: 6, // Tanggal eksekusi pemutusan/isolir (tiap tanggal 6)
  includePajak: false, // Default: exclude (pajak ditambahkan)
  enablePpn: true,
  enableBhp: true,
  enableUso: true,
};

/**
 * Format angka ke format mata uang Rupiah
 */
export function formatRupiah(num) {
  if (num === null || num === undefined || isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Hitung rincian pajak dan total tagihan
 * @param {number} basePrice Harga paket dasar
 * @param {object} options Konfigurasi pajak { includePajak, enablePpn, ppnRate, enableBhp, enableUso }
 */
export function calculateInvoiceBreakdown(basePrice, options = {}) {
  const price = Number(basePrice) || 0;
  const isInclude = options.includePajak ?? false;
  const ppnRate = options.ppnRate ?? TAX_RATES.PPN_RATE;
  const enablePpn = options.enablePpn ?? true;
  const enableBhp = options.enableBhp ?? true;
  const enableUso = options.enableUso ?? true;

  const effectivePpnRate = enablePpn ? ppnRate : 0;
  const effectiveBhpRate = enableBhp ? TAX_RATES.BHP_RATE : 0;
  const effectiveUsoRate = enableUso ? TAX_RATES.USO_RATE : 0;

  let dpp = 0;
  let ppn = 0;
  let bhp = 0;
  let uso = 0;
  let total = 0;

  if (isInclude) {
    // Harga paket sudah termasuk PPN dan beban regulasi
    // Total = DPP * (1 + PPN_rate + BHP_rate + USO_rate)
    const divisor = 1 + effectivePpnRate + effectiveBhpRate + effectiveUsoRate;
    dpp = Math.round(price / divisor);
    ppn = Math.round(dpp * effectivePpnRate);
    bhp = Math.round(dpp * effectiveBhpRate);
    uso = Math.round(dpp * effectiveUsoRate);
    total = price;
  } else {
    // Mode Exclude: DPP adalah harga paket murni, pajak ditambahkan
    dpp = price;
    ppn = Math.round(dpp * effectivePpnRate);
    bhp = Math.round(dpp * effectiveBhpRate);
    uso = Math.round(dpp * effectiveUsoRate);
    total = dpp + ppn + bhp + uso;
  }

  return {
    basePrice: price,
    isInclude,
    dpp,
    ppn,
    bhp,
    uso,
    subtotalPajak: ppn + bhp + uso,
    total,
    ppnPercent: Math.round(effectivePpnRate * 100),
    bhpPercent: Number((effectiveBhpRate * 100).toFixed(2)),
    usoPercent: Number((effectiveUsoRate * 100).toFixed(2)),
  };
}

/**
 * Generate nomor invoice unik standar ISP
 * Format: INV/YYYYMM/XXXX (contoh: INV/202610/0128)
 */
export function generateInvoiceNumber(id, date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const seq = String(id || Math.floor(1000 + Math.random() * 9000)).padStart(4, "0");
  return `INV/${year}${month}/${seq}`;
}
