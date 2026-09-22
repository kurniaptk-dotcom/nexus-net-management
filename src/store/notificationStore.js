import { useState, useCallback, useRef } from "react";

let notifId = 100;

const initialNotifications = [
  {
    id: 1,
    type: "pekerjaan",
    judul: "Pekerjaan baru ditambahkan",
    deskripsi: "PEMASANGAN untuk Ahmad Fauzi (GATRA-AIS) - status SELESAI",
    waktu: "2026-09-01 08:30",
    dibaca: true,
    icon: "wrench",
    kategori: "tambah",
  },
  {
    id: 2,
    type: "gangguan",
    judul: "Gangguan baru dilaporkan",
    deskripsi: "Kabel Putus di Jl. Sudirman No. 25 - 4 user terdampak",
    waktu: "2026-09-02 10:15",
    dibaca: true,
    icon: "alert",
    kategori: "gangguan",
  },
  {
    id: 3,
    type: "leads",
    judul: "Leads baru masuk",
    deskripsi: "Rina Marlina dari IKLAN - Jl. Baru No. 1",
    waktu: "2026-09-01 09:00",
    dibaca: true,
    icon: "target",
    kategori: "leads",
  },
  {
    id: 4,
    type: "status",
    judul: "Status pekerjaan diubah",
    deskripsi: "PEMASANGAN Budi Santoso → SELESAI oleh GATRA-AIS",
    waktu: "2026-09-02 14:20",
    dibaca: false,
    icon: "check",
    kategori: "status",
  },
  {
    id: 5,
    type: "gangguan",
    judul: "Gangguan redaman tinggi",
    deskripsi: "Redaman 28dB di Jl. Gatot Subroto RT 01 - perlu pengecekan",
    waktu: "2026-09-08 11:45",
    dibaca: false,
    icon: "alert",
    kategori: "gangguan",
  },
];

// Format waktu relative
export function formatWaktuRelatif(waktu) {
  const now = new Date();
  const date = new Date(waktu.replace(" ", "T"));
  const diffMs = now - date;
  const diffMenit = Math.floor(diffMs / 60000);
  const diffJam = Math.floor(diffMs / 3600000);
  const diffHari = Math.floor(diffMs / 86400000);

  if (diffMenit < 1) return "Baru saja";
  if (diffMenit < 60) return `${diffMenit} menit lalu`;
  if (diffJam < 24) return `${diffJam} jam lalu`;
  if (diffHari < 7) return `${diffHari} hari lalu`;
  return waktu;
}

// Generate notifikasi dari aksi pekerjaan
export function generatePekerjaanNotification(pekerjaan, aksi) {
  const now = new Date();
  const waktu = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  notifId++;

  const iconMap = {
    tambah: "wrench",
    status: "check",
    hapus: "x",
    edit: "edit",
  };

  const deskripsiMap = {
    tambah: `${pekerjaan.jenis} untuk ${pekerjaan.pelanggan} (${pekerjaan.tim}) - status ${pekerjaan.status}`,
    status: `${pekerjaan.jenis} ${pekerjaan.pelanggan} → ${pekerjaan.status} oleh ${pekerjaan.tim}`,
    hapus: `${pekerjaan.jenis} ${pekerjaan.pelanggan} dihapus dari ${pekerjaan.tim}`,
    edit: `${pekerjaan.jenis} ${pekerjaan.pelanggan} (${pekerjaan.tim}) - data diperbarui`,
  };

  return {
    id: notifId,
    type: "pekerjaan",
    judul: `Pekerjaan ${aksi}`,
    deskripsi: deskripsiMap[aksi] || deskripsiMap.tambah,
    waktu,
    dibaca: false,
    icon: iconMap[aksi] || "wrench",
    kategori: aksi,
  };
}

// Generate notifikasi gangguan
export function generateGangguanNotification(gangguan, aksi) {
  const now = new Date();
  const waktu = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  notifId++;

  return {
    id: notifId,
    type: "gangguan",
    judul: `Gangguan ${aksi}`,
    deskripsi: `${gangguan.kategori} di ${gangguan.alamat} - ${gangguan.userTerdampak} user terdampak`,
    waktu,
    dibaca: false,
    icon: "alert",
    kategori: "gangguan",
  };
}

// Generate notifikasi leads
export function generateLeadsNotification(leads, aksi) {
  const now = new Date();
  const waktu = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  notifId++;

  return {
    id: notifId,
    type: "leads",
    judul: `Leads ${aksi}`,
    deskripsi: `${leads.nama} dari ${leads.sumber} - ${leads.alamat}`,
    waktu,
    dibaca: false,
    icon: "target",
    kategori: "leads",
  };
}

// Generate notifikasi umum
export function generateNotifikasi(judul, deskripsi, type = "info") {
  const now = new Date();
  const waktu = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  notifId++;

  return {
    id: notifId,
    type,
    judul,
    deskripsi,
    waktu,
    dibaca: false,
    icon: type === "error" ? "x" : type === "success" ? "check" : "info",
    kategori: "info",
  };
}

export { initialNotifications };
