import { formatPhoneWa } from "./spkGenerator.js";

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
 * Template WhatsApp untuk Pelanggan / Layanan Lapangan
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

/**
 * Template WhatsApp Rekapitulasi Kepatuhan Laporan Cut-Off Jam 21:00 WIB
 */
export function createCutoffRecapWaMessage(personilList = [], tasksList = [], dateStr = "") {
  const tgl = dateStr || new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  const onTimeList = [];
  const lateList = [];
  const unreportedList = [];

  (personilList || []).forEach((p) => {
    const pName = p.panggilan || p.nama;
    const assignedTasks = (tasksList || []).filter((t) => {
      if (Array.isArray(t.teknisi_list) && t.teknisi_list.includes(pName)) return true;
      if (t.tim && t.tim.includes(pName)) return true;
      return false;
    });

    if (assignedTasks.length === 0) return;

    assignedTasks.forEach((t) => {
      const spkDesc = `${t.spk_no || t.jenis} (${t.pelanggan || "Pelanggan"})`;
      if (t.cutoff_status === "TEPAT_WAKTU") {
        onTimeList.push(`• *${pName}*: ${spkDesc} - Pk ${t.waktu_lapor ? new Date(t.waktu_lapor).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB (Tepat Waktu)`);
      } else if (t.cutoff_status === "TERLAMBAT") {
        onTimeList.push(`• *${pName}*: ${spkDesc} - Pk ${t.waktu_lapor ? new Date(t.waktu_lapor).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB (Terlambat)`);
      } else if (t.status !== "SELESAI") {
        unreportedList.push(`• *${pName}*: ${spkDesc} [Status: ${t.status}]`);
      }
    });
  });

  return (
    `📋 *REKAPITULASI LAPORAN OPERASIONAL (CUT-OFF 21:00 WIB)*\n` +
    `🗓 Tanggal: *${tgl}*\n\n` +
    `🟢 *Tepat Waktu (<= 21:00 WIB):* ${onTimeList.length} tugas\n` +
    (onTimeList.length > 0 ? onTimeList.join("\n") + "\n\n" : "- Belum ada -\n\n") +
    `🟡 *Terlambat (> 21:00 WIB):* ${lateList.length} tugas\n` +
    (lateList.length > 0 ? lateList.join("\n") + "\n\n" : "") +
    `🔴 *Belum Melaporkan 1 Foto:* ${unreportedList.length} tugas\n` +
    (unreportedList.length > 0 ? unreportedList.join("\n") + "\n\n" : "Semua tugas telah dilaporkan! ✅\n\n") +
    `_Sistem Otomatisasi Lapangan Nexus Net Management_`
  );
}

/**
 * Template WhatsApp CS untuk Follow-up Kendala Lapangan & Penjadwalan Ulang
 */
export function getRescheduleCustomerWaTemplate(task) {
  if (!task) return "";
  const nama = task.pelanggan || "Bpk/Ibu";
  const kendala = task.alasan_kendala || task.keterangan || "kondisi di lokasi";
  return (
    `Halo Bpk/Ibu *${nama}*, kami dari Layanan Pelanggan Nexus Net.\n\n` +
    `Tim teknisi kami sebelumnya telah menjadwalkan kunjungan untuk *${task.jenis || "Pekerjaan Layanan"}* (SPK: ${task.spk_no || "-"}), namun terdapat kendala di lapangan: _"${kendala}"_.\n\n` +
    `Kapan waktu luang yang tepat bagi kami untuk melakukan *kunjungan ulang (reschedule)*? Mohon konfirmasi hari dan jam yang nyaman bagi Anda. Terima kasih! 🙏`
  );
}

/**
 * Template WhatsApp CS untuk Update Status Pekerjaan ke Pelanggan
 */
export function getCustomerStatusUpdateWaTemplate(task, updateType = "SCHEDULED") {
  if (!task) return "";
  const nama = task.pelanggan || "Bpk/Ibu";
  const spk = task.spk_no ? ` [SPK: ${task.spk_no}]` : "";

  if (updateType === "SCHEDULED" || (!task.is_started && task.status === "DIJADWALKAN")) {
    return (
      `Halo Bpk/Ibu *${nama}*, pemasangan/perbaikan internet Nexus Net Anda${spk} telah dijadwalkan:\n\n` +
      `📅 *Hari/Tanggal:* ${task.tanggal || "Hari Ini"}\n` +
      `⏰ *Sesi:* ${task.sesi || "Sesi Kerja"}\n` +
      `👷 *Tim Teknisi:* ${task.tim || "Tim Lapangan Nexus Net"}\n\n` +
      `Mohon pastikan ada anggota keluarga di rumah saat teknisi kami tiba. Terima kasih!`
    );
  }

  if (updateType === "ON_THE_WAY" || task.is_started) {
    return (
      `Halo Bpk/Ibu *${nama}*, tim teknisi Nexus Net (*${task.tim || "Teknisi Lapangan"}*) saat ini sedang dalam perjalanan menuju lokasi Anda${spk}.\n\n` +
      `Estimasi kedatangan dalam waktu dekat. Mohon pastikan nomor telepon ini dapat dihubungi jika teknisi memerlukan panduan arah. Terima kasih! 🛵💨`
    );
  }

  if (updateType === "SELESAI" || task.status === "SELESAI") {
    return (
      `Halo Bpk/Ibu *${nama}*, pekerjaan *${task.jenis || "Layanan WiFi"}* Nexus Net Anda telah selesai dilakukan oleh tim teknisi kami.\n\n` +
      `Selamat menikmati koneksi internet Nexus Net! Jika ada pertanyaan atau kendala di kemudian hari, silakan hubungi nomor layanan ini. Terima kasih telah mempercayai kami 🙏✨`
    );
  }

  return `Halo Bpk/Ibu *${nama}*, update status pekerjaan ${task.jenis} Anda: ${task.status}. Terima kasih.`;
}

