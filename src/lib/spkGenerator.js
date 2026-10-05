/**
 * Utilitas Sistem Penugasan Teknisi & Generator SPK (Surat Perintah Kerja)
 * XNET / Nexus Net Management
 */

export const TASK_TYPES = {
  PEMASANGAN: {
    key: "PEMASANGAN",
    label: "Pemasangan Baru (PSB)",
    code: "PSB",
    color: "blue",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    iconName: "Wifi",
    desc: "Instalasi jalur dropcore, konfigurasi ONT modem, dan sambung port ODP",
    defaultSlaHours: 24,
  },
  PEMUTUSAN: {
    key: "PEMUTUSAN",
    label: "Pemutusan (Dismantle)",
    code: "DIS",
    color: "rose",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    iconName: "XCircle",
    desc: "Pencabutan kabel dropcore dari ODP, penarikan perangkat ONT modem, dan bebaskan port ODP",
    defaultSlaHours: 48,
  },
  PERBAIKAN: {
    key: "PERBAIKAN",
    label: "Perbaikan Gangguan (Troubleshoot)",
    code: "RPR",
    color: "amber",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    iconName: "Wrench",
    desc: "Pengecekan redaman, perbaikan kabel putus (LOS), penggantian adaptor/modem",
    defaultSlaHours: 6,
  },
  "PERBAIKAN KHUSUS (ODP/ODC)": {
    key: "PERBAIKAN KHUSUS (ODP/ODC)",
    label: "Perbaikan Khusus Distribusi (ODP/ODC)",
    code: "SPL",
    color: "purple",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    iconName: "Network",
    desc: "Perbaikan kabel backbone/feeder, penggantian splitter ODP/ODC, perapian tiang",
    defaultSlaHours: 4,
  },
  RELOKASI: {
    key: "RELOKASI",
    label: "Relokasi / Pindah Alamat",
    code: "REL",
    color: "cyan",
    badge: "bg-cyan-100 text-cyan-800 border-cyan-200",
    iconName: "Navigation",
    desc: "Pemindahan titik dropcore dan modem ke alamat baru / tiang ODP baru",
    defaultSlaHours: 24,
  },
};

export const TASK_PRIORITIES = {
  NORMAL: {
    key: "NORMAL",
    label: "Normal",
    badge: "bg-slate-100 text-slate-700 border-slate-300",
    dot: "bg-slate-400",
  },
  TINGGI: {
    key: "TINGGI",
    label: "Prioritas Tinggi",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    dot: "bg-amber-500",
  },
  URGENT: {
    key: "URGENT",
    label: "🚨 Darurat / Urgent (LOS)",
    badge: "bg-rose-100 text-rose-800 border-rose-300 animate-pulse",
    dot: "bg-rose-500",
  },
};

export const TIME_SESSIONS = [
  { key: "PAGI", label: "Pagi (08:30 - 12:00 WIB)" },
  { key: "SIANG", label: "Siang (13:00 - 15:30 WIB)" },
  { key: "SORE", label: "Sore (15:30 - 18:00 WIB)" },
  { key: "FLEKSIBEL", label: "Fleksibel / Sesuai Jadwal Lapangan" },
];

export const DEFAULT_TEAMS = [
  { id: 1, nama: "AZWAR - RIO", telepon: "08125556677", area: "Pontianak Kota / Siantan" },
  { id: 2, nama: "BAMBANG - EKO", telepon: "08134445566", area: "Pontianak Barat / Sungai Jawi" },
  { id: 3, nama: "DONI - FEBRI", telepon: "08528889900", area: "Pontianak Selatan / Tenggara" },
];

/**
 * Format nomor WhatsApp standar internasional 62
 */
export function formatPhoneWa(phone) {
  if (!phone) return "";
  let clean = String(phone).replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.substring(1);
  } else if (!clean.startsWith("62")) {
    clean = "62" + clean;
  }
  return clean;
}

/**
 * Buat nomor SPK otomatis terstandarisasi
 * Contoh: SPK/PSB/20261001/8412
 */
export function generateSpkNumber(jenis = "PEMASANGAN", id = null) {
  const typeConfig = TASK_TYPES[jenis] || TASK_TYPES.PEMASANGAN;
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;
  const suffix = id ? String(id).slice(-4) : String(Math.floor(1000 + Math.random() * 9000));
  return `SPK/${typeConfig.code}/${dateStr}/${suffix}`;
}

/**
 * Hitung jumlah beban tugas aktif per tim teknisi
 * @param {string} teamName 
 * @param {Array} taskList 
 * @returns {number} Jumlah tugas yang belum selesai
 */
export function getTeamWorkload(teamName, taskList = []) {
  if (!teamName || !Array.isArray(taskList)) return 0;
  return taskList.filter((t) => {
    if (!t || t.tim !== teamName) return false;
    const st = (t.status || "").toUpperCase();
    return st === "WAITING LIST" || st === "DIJADWALKAN" || st === "PROSES" || st === "MENUNGGU";
  }).length;
}

/**
 * Susun naskah teks resmi Surat Perintah Kerja (SPK) untuk dikirim via WhatsApp
 */
export function formatSpkWaText(task, spkNo = "") {
  if (!task) return "";
  const typeConfig = TASK_TYPES[task.jenis] || TASK_TYPES.PEMASANGAN;
  const noSpk = spkNo || task.spk_no || generateSpkNumber(task.jenis, task.id);
  const prioritasLabel = task.prioritas === "URGENT" ? "🚨 DARURAT / URGENT (LOS)" : task.prioritas === "TINGGI" ? "⚡ TINGGI" : "NORMAL";

  const lines = [
    `📋 *SURAT PERINTAH KERJA (SPK) LAPANGAN*`,
    `*NEXUS FIBER NETWORK OPERATION*`,
    `================================`,
    `🆔 *No. SPK:* \`${noSpk}\``,
    `📌 *Jenis Tugas:* *${typeConfig.label.toUpperCase()}*`,
    `⚡ *Prioritas:* ${prioritasLabel}`,
    `👷 *Tim Ditugaskan:* *${task.tim || "-"}*`,
    `📅 *Target Tanggal:* ${task.tanggal || "-"}`,
    task.sesi ? `⏰ *Sesi Waktu:* ${task.sesi}` : null,
    `--------------------------------`,
    `👤 *Nama Pelanggan:* ${task.pelanggan || "-"}`,
    `📱 *Kontak Pelanggan:* ${task.telepon || "-"}`,
    `📍 *Alamat:* ${task.alamat || "-"}`,
    task.shareloc ? `🗺️ *Lokasi GPS/Peta:* ${task.shareloc}` : null,
    `--------------------------------`,
    `📶 *ODP Target:* *${task.odp || "-"}* ${task.port ? `(Port: ${task.port})` : ""}`,
    task.jarak_odp ? `📏 *Est. Dropcore:* ~${task.jarak_odp} Meter` : null,
    task.paket ? `📦 *Paket Layanan:* ${task.paket}` : null,
    task.keterangan ? `📝 *Instruksi Khusus:* ${task.keterangan}` : null,
    Array.isArray(task.komisi_items) && task.komisi_items.length > 0 ? [
      `--------------------------------`,
      `💰 *LINGKUP PEKERJAAN & KOMISI:*`,
      ...task.komisi_items.map((it) => `• ${it.nama}: ${it.qty} ${it.satuan}`),
      `*Est. Komisi: Rp ${(task.komisi_total || 0).toLocaleString("id-ID")}*`,
    ].join("\n") : null,
    `================================`,
    `⚠️ *SOP TEKNISI NEXUS:*`,
    task.jenis === "PEMUTUSAN"
      ? `1. Tarik modem ONT dan adaptor secara lengkap.\n2. Lepaskan konektor patchcord dari port ODP.\n3. Foto nomor seri modem & port ODP yang dibebaskan.`
      : `1. Pastikan redaman OPM berada di range prima (-15 s/d -22 dBm).\n2. Upload 3 foto bukti lapangan: OPM, Tiang ODP, & Barcode Modem.\n3. Pasang konektor SC/UPC dengan rapi dan terlindung.`,
    ``,
    `_Pesan otomatis dari Sistem Manajemen Operasional XNET._`,
  ];

  return lines.filter(Boolean).join("\n");
}

/**
 * Buat link URL direct WhatsApp ke tim teknisi atau grup
 */
export function generateSpkWaUrl(task, targetPhone = "", spkNo = "") {
  const text = formatSpkWaText(task, spkNo);
  const cleanPhone = formatPhoneWa(targetPhone || task.telepon_tim || "");
  const encodedText = encodeURIComponent(text);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}
