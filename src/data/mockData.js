export const bulan = "September 2026";

export const timList = [];

export const statusPekerjaan = ["WAITING LIST", "DIJADWALKAN", "SELESAI", "GAGAL"];

export const jenisPekerjaan = [
  "PEMASANGAN",
  "PERBAIKAN",
  "PEMUTUSAN",
  "PERBAIKAN KHUSUS (ODP/ODC)",
];

export const sumberLeads = ["IKLAN", "AFFILIATE", "MARKETING"];

export const kategoriGangguan = [
  "Tidak Muncul",
  "Kabel Putus",
  "No Internet",
  "Modem",
  "Redaman Tinggi",
  "Server",
  "Pusat",
];

// Data awal master tim (kosong untuk data real)
export const initialTimData = [];

export const summaryData = {
  totalPekerjaan: 0,
  totalLeads: 0,
  pemasangan: { waitingList: 0, dijadwalkan: 0, selesai: 0, gagal: 0 },
  perbaikan: { waitingList: 0, dijadwalkan: 0, selesai: 0 },
  pemutusan: { waitingList: 0, dijadwalkan: 0, selesai: 0, gagal: 0 },
  sumberLeads: {},
  odpOdc: { total: 0, userTerdampak: 0 },
};

export const gangguanData = {
  eksternal: {},
  totalCase: 0,
};

// Data pekerjaan detail untuk tabel (kosong untuk data real)
export const pekerjaanList = [];

export const leadsList = [];

export const gangguanList = [];

export const daftarGangguanList = [];

export const fuPelangganList = [];

export const redamanTinggiList = [];

export const pengajuanPemutusanList = [];

// ODP/ODC LOS (kosong untuk data real)
export const odpOdcList = [];

export const odcMasterList = [];
