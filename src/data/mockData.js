import unifiedOdpOdc from "./unifiedOdpOdc.json";

export const bulan = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });

// Master Personil Teknisi Perorangan (Individu) - Master Struktur Dipertahankan, Akumulator 0
export const initialPersonilList = [
  {
    id: 1,
    nama: "Ais Maulana",
    panggilan: "AIS",
    telepon: "081234567890",
    peran: "Installer / Field Tech",
    timId: 1,
    timNama: "Tim A",
    status: "AKTIF",
    total_selesai: 0,
    total_komisi: 0,
  },
  {
    id: 2,
    nama: "Gatra Wicaksono",
    panggilan: "Gatra",
    telepon: "081234567891",
    peran: "Splicer / Fiber Specialist",
    timId: 1,
    timNama: "Tim A",
    status: "AKTIF",
    total_selesai: 0,
    total_komisi: 0,
  },
  {
    id: 3,
    nama: "Jusman",
    panggilan: "Jusman",
    telepon: "081298765432",
    peran: "Team Leader / Field Tech",
    timId: 2,
    timNama: "Tim B",
    status: "AKTIF",
    total_selesai: 0,
    total_komisi: 0,
  },
  {
    id: 4,
    nama: "Iqbal Ramadhan",
    panggilan: "Iqbal",
    telepon: "081298765433",
    peran: "Installer / Field Tech",
    timId: 2,
    timNama: "Tim B",
    status: "AKTIF",
    total_selesai: 0,
    total_komisi: 0,
  },
  {
    id: 5,
    nama: "Azwar",
    panggilan: "Azwar",
    telepon: "08125556677",
    peran: "Specialist ODP/ODC",
    timId: 3,
    timNama: "Tim C",
    status: "AKTIF",
    total_selesai: 0,
    total_komisi: 0,
  },
  {
    id: 6,
    nama: "Rio Saputra",
    panggilan: "Rio",
    telepon: "08125556678",
    peran: "Field Technician",
    timId: 3,
    timNama: "Tim C",
    status: "AKTIF",
    total_selesai: 0,
    total_komisi: 0,
  },
];

// Master Regu Tim (Pengelompokan Teknisi) - Master Tim Dipertahankan
export const timList = [
  {
    id: 1,
    nama: "Tim A",
    anggota: ["AIS", "Gatra"],
    alias: "GATRA - AIS",
    status: "AKTIF",
    telepon: "081234567890",
    area: "Pontianak Kota / Siantan",
  },
  {
    id: 2,
    nama: "Tim B",
    anggota: ["Jusman", "Iqbal"],
    alias: "PUTRA - FAISAL",
    status: "AKTIF",
    telepon: "081298765432",
    area: "Pontianak Barat / Sungai Jawi",
  },
  {
    id: 3,
    nama: "Tim C",
    anggota: ["Azwar", "Rio"],
    alias: "AZWAR - RIO",
    status: "AKTIF",
    telepon: "08125556677",
    area: "Pontianak Selatan / Tenggara",
  },
];

export const statusPekerjaan = [
  "WAITING LIST",
  "DIJADWALKAN",
  "MENUNGGU VALIDASI",
  "SELESAI",
  "GAGAL",
];

export const jenisPekerjaan = [
  "PEMASANGAN",
  "PERBAIKAN",
  "PEMUTUSAN",
  "PERBAIKAN KHUSUS (ODP/ODC)",
  "RELOKASI",
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

export const initialTimData = timList;

// Data operasional detail (KOSONG: Bersih 100% untuk menerima data baru)
export const pekerjaanList = [];

export const leadsList = [];
export const initialLeads = leadsList;

export const gangguanList = [];
export const daftarGangguanList = gangguanList;
export const initialGangguanList = daftarGangguanList;

export const fuPelangganList = [];
export const redamanTinggiList = [];

export const pengajuanPemutusanList = [];

export const summaryData = {
  totalPekerjaan: 0,
  totalLeads: 0,
  pemasangan: { waitingList: 0, dijadwalkan: 0, selesai: 0, gagal: 0 },
  perbaikan: { waitingList: 0, dijadwalkan: 0, selesai: 0 },
  pemutusan: { waitingList: 0, dijadwalkan: 0, selesai: 0, gagal: 0 },
  sumberLeads: { IKLAN: 0, MARKETING: 0, AFFILIATE: 0 },
  odpOdc: { total: 0, userTerdampak: 0 },
};

export const gangguanData = {
  eksternal: {},
  totalCase: 0,
};

export function clearAllOperationalData() {
  if (typeof localStorage === "undefined") return;
  try {
    const operationalKeys = [
      "xnet_pekerjaan",
      "xnet_leads",
      "xnet_gangguan",
      "xnet_daftar_gangguan_v2",
      "xnet_pengajuan_pemutusan",
      "xnet_pelanggan_radius",
      "xnet_fu_pelanggan",
      "xnet_redaman_tinggi",
      "xnet_komisi_adjustments",
      "xnet_offline_queue_v1",
    ];
    operationalKeys.forEach((key) => {
      localStorage.setItem(key, "[]");
      window.dispatchEvent(
        new CustomEvent("xnet_storage_update", {
          detail: { key, value: [] },
        })
      );
    });
    console.log("🧹 [CLEANUP] Seluruh data operasional dummy telah dikosongkan.");
  } catch (err) {
    console.warn("Gagal membersihkan data operasional:", err);
  }
}

export function seedAllDemoData() {}

// ODP/ODC Master hasil sinkronisasi Google Earth KML (TETAP DIPERTAHANKAN)
export const odpOdcList = unifiedOdpOdc.odpList || [];
export const odcMasterList = unifiedOdpOdc.odcList || [];

// Data Master Pelanggan Sinkronisasi Radius Billing (KOSONG: Bersih 100%)
export const initialPelangganRadius = [];
