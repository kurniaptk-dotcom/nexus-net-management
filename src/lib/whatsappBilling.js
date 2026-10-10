/**
 * Generator Pesan WhatsApp untuk Billing & Penagihan ISP
 * Menghasilkan URL wa.me dengan teks template resmi Nexus Net
 */

import { formatRupiah } from "./billingTax.js";

function sanitizePhone(phone) {
  if (!phone) return "";
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.slice(1);
  }
  return clean;
}

/**
 * 1. Template Tagihan Terbit (H-3 / H-5)
 */
export function generateWaInvoiceNotice(invoice) {
  const phone = sanitizePhone(invoice.telepon || invoice.pelanggan_telepon);
  const text = `*Yth. Pelanggan Nexus Net WiFi*
Halo Sdr/i *${invoice.pelanggan}* (${invoice.nomor_layanan || invoice.id_pelanggan || "PLG"}),

Tagihan internet Anda untuk periode *${invoice.periode || "Bulan Ini"}* telah terbit:

📋 *No. Invoice:* ${invoice.nomor_invoice}
📦 *Paket:* ${invoice.paket} (${invoice.kecepatan || ""})
💰 *Total Tagihan:* *${formatRupiah(invoice.total)}*
⏳ *Jatuh Tempo:* *${invoice.jatuh_tempo}*

Silakan melakukan pembayaran tepat waktu sebelum jatuh tempo untuk menghindari penghentian/isolir layanan internet otomatis.

Pembayaran dapat dilakukan via *QRIS* (BCA, GoPay, OVO, Dana, ShopeePay) atau Transfer Bank.

_Pesan otomatis dari Sistem Billing Nexus Net Management_`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * 2. Template Peringatan Jatuh Tempo (H-0)
 */
export function generateWaDueDateNotice(invoice) {
  const phone = sanitizePhone(invoice.telepon || invoice.pelanggan_telepon);
  const text = `*⚠️ PERINGATAN JATUH TEMPO HARI INI*

Kepada: *${invoice.pelanggan}*
ID: *${invoice.nomor_layanan || invoice.id_pelanggan}*

Hari ini, *${invoice.jatuh_tempo}*, adalah batas akhir pembayaran tagihan internet Nexus Net:

📋 *No. Invoice:* ${invoice.nomor_invoice}
💰 *Total:* *${formatRupiah(invoice.total)}*

Mohon segera selesaikan pembayaran hari ini. Layanan internet akan terisolir otomatis oleh sistem pada besok pagi jika tagihan belum terbayar.

Balas pesan ini jika sudah melakukan pembayaran untuk konfirmasi kasir. Terima kasih!`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * 3. Template Pemberitahuan Isolir (Layanan Dinonaktifkan)
 */
export function generateWaIsolirNotice(invoice) {
  const phone = sanitizePhone(invoice.telepon || invoice.pelanggan_telepon);
  const text = `*🔴 PEMBERITAHUAN ISOLASI LAYANAN INTERNET*

Halo Sdr/i *${invoice.pelanggan}*,
Kami informasikan bahwa koneksi internet Anda saat ini dinonaktifkan sementara (ISOLIR) dikarenakan tagihan melewati tanggal jatuh tempo:

📋 *No. Invoice:* ${invoice.nomor_invoice}
💰 *Total Tunggakan:* *${formatRupiah(invoice.total)}*

Layanan internet akan *AKTIF KEMBALI SECARA OTOMATIS (24 Jam)* begitu pembayaran kami terima melalui QRIS / Virtual Account.

Silakan lakukan pembayaran agar akses internet keluarga Anda segera normal kembali.`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * 4. Template Kwitansi & Bukti Lunas
 */
export function generateWaPaidReceipt(invoice) {
  const phone = sanitizePhone(invoice.telepon || invoice.pelanggan_telepon);
  const text = `*✅ BUKTI PEMBAYARAN LUNAS (KWITANSI RESMI)*
*NEXUS NET WIFI MANAGEMENT*

Terima kasih *${invoice.pelanggan}*, pembayaran internet Anda telah kami terima dan diverifikasi LUNAS.

📋 *No. Invoice:* ${invoice.nomor_invoice}
📦 *Paket:* ${invoice.paket}
💰 *Jumlah Dibayar:* *${formatRupiah(invoice.total)}*
📅 *Waktu Pembayaran:* ${invoice.tanggal_bayar || new Date().toLocaleString("id-ID")}
💳 *Metode:* ${invoice.metode_bayar || "QRIS / Transfer Bank"}
🟢 *Status Akun:* AKTIF

Selamat menikmati kembali koneksi internet super cepat Nexus Net! Simpan pesan ini sebagai bukti pembayaran yang sah.`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
