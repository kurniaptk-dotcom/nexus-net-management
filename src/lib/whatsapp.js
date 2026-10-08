import { formatPhoneWa } from "./spkGenerator";

export { formatPhoneWa };

/**
 * Buat link Direct WhatsApp dengan nomor standar internasional 62
 */
export function createWhatsAppUrl(phone, text = "") {
  const clean = formatPhoneWa(phone);
  if (!clean || clean.length < 8) return null;
  const encoded = text ? encodeURIComponent(text) : "";
  return `https://wa.me/${clean}${encoded ? `?text=${encoded}` : ""}`;
}

/**
 * Template WhatsApp untuk Pelanggan Radius / Billing
 */
export function getCustomerWaTemplate(customer) {
  if (!customer) return "";
  const nama = customer.nama || "Pelanggan";
  const paket = customer.paket ? ` (Paket: ${customer.paket})` : "";
  const idStr = customer.id_pelanggan || customer.username ? ` [ID: ${customer.id_pelanggan || customer.username}]` : "";
  return `Halo Kak ${nama}${idStr}${paket}, kami dari Layanan Pelanggan Nexus Net. Ada yang bisa kami bantu terkait layanan internet WiFi Anda? Terima kasih 🙏`;
}

/**
 * Template WhatsApp untuk Survei Leads / Calon Pelanggan Baru
 */
export function getLeadSurveyWaTemplate(lead) {
  if (!lead) return "";
  const nama = lead.nama || "Kak";
  if (lead.odp_terdekat) {
    return `Halo Kak *${nama}*, terima kasih telah menghubungi Nexus Net!\n\nKami telah melakukan simulasi survey lokasi via Google Earth GIS:\n📍 *Alamat:* ${lead.alamat || "-"}\n📡 *ODP Terdekat:* ${lead.odp_terdekat}\n📏 *Est. Tarikan Dropcore:* ~${lead.jarak_odp || 0} meter\n📶 *Status Jaringan:* Siap Pasang Langsung ✅\n\nKapan waktu luang yang tepat untuk tim teknisi kami melakukan instalasi modem ke rumah Anda?`;
  }
  return `Halo Kak *${nama}*, terima kasih telah menghubungi Nexus Net!\n\nApakah kami boleh meminta sharelokasi WhatsApp rumah Anda untuk simulasi survey ODP terdekat? Terima kasih.`;
}

/**
 * Template WhatsApp untuk Tindak Lanjut Gangguan / Troubleshooting
 */
export function getTroubleWaTemplate(trouble) {
  if (!trouble) return "";
  const nama = trouble.pelanggan || trouble.nama || "Pelanggan";
  const keluhan = trouble.keterangan || trouble.keluhan || "layanan internet";
  return `Halo Kak ${nama}, kami dari Tim Support Operasional Nexus Net ingin menindaklanjuti kendala WiFi (${keluhan}). Apakah koneksi saat ini sudah berjalan aman dan normal kembali? Terima kasih 🙏`;
}
