import unifiedOdpOdc from "./unifiedOdpOdc.json";

export const bulan = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });

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
export const initialLeads = leadsList;

export const gangguanList = [];

export const daftarGangguanList = [];
export const initialGangguanList = daftarGangguanList;

export const fuPelangganList = [];

export const redamanTinggiList = [];

export const pengajuanPemutusanList = [];

// ODP/ODC Master hasil sinkronisasi Google Earth KML
export const odpOdcList = unifiedOdpOdc.odpList || [];
export const odcMasterList = unifiedOdpOdc.odcList || [];

// Data Master Pelanggan Sinkronisasi Radius Billing
export const initialPelangganRadius = [
  {
    id: 1,
    id_pelanggan: "NX-2026-001",
    nama: "Budi Santoso",
    telepon: "081234567890",
    alamat: "Jl. Gajah Mada No. 45, Pontianak",
    odp: "ODP 1.2",
    paket: "Home Fiber 30 Mbps",
    status: "AKTIF",
    ip_address: "10.20.1.45",
    tgl_daftar: "2026-08-10",
  },
  {
    id: 2,
    id_pelanggan: "NX-2026-002",
    nama: "Siti Rahmawati",
    telepon: "081398765432",
    alamat: "Komplek Surya Kencana Blok C-12, Pontianak",
    odp: "ODP 2.1",
    paket: "Business Fiber 50 Mbps",
    status: "BARU",
    ip_address: "-",
    tgl_daftar: "2026-09-26",
  },
  {
    id: 3,
    id_pelanggan: "NX-2026-003",
    nama: "Hendrik Wijaya",
    telepon: "082155667788",
    alamat: "Jl. Ahmad Yani II Gg. Cendrawasih No. 8",
    odp: "ODP 1.4",
    paket: "Home Fiber 20 Mbps",
    status: "AKTIF",
    ip_address: "10.20.1.78",
    tgl_daftar: "2026-07-15",
  },
  {
    id: 4,
    id_pelanggan: "NX-2026-004",
    nama: "Toko Sinar Rejeki (Ahmad)",
    telepon: "085244332211",
    alamat: "Pasar Flamboyan Kios B-10, Pontianak",
    odp: "ODP 3.2",
    paket: "Dedicated 100 Mbps",
    status: "ISOLIR",
    ip_address: "10.20.3.10",
    tgl_daftar: "2026-06-01",
  },
  {
    id: 5,
    id_pelanggan: "NX-2026-005",
    nama: "Dewi Lestari",
    telepon: "089677889900",
    alamat: "Jl. Danau Sentarum Gg. Bersama No. 19",
    odp: "ODP 2.3",
    paket: "Home Fiber 30 Mbps",
    status: "PUTUS",
    ip_address: "-",
    tgl_daftar: "2026-05-12",
  },
  {
    id: 6,
    id_pelanggan: "NX-2026-006",
    nama: "dr. Andi Pratama",
    telepon: "081155009988",
    alamat: "Klinik Medika Sehat, Jl. Veteran No. 88",
    odp: "ODP 1.1",
    paket: "Business Fiber 50 Mbps",
    status: "AKTIF",
    ip_address: "10.20.1.12",
    tgl_daftar: "2026-08-20",
  },
  {
    id: 7,
    id_pelanggan: "NX-2026-007",
    nama: "Rian Hidayat",
    telepon: "087711223344",
    alamat: "Jl. Sungai Raya Dalam Komp. Griya Indah D-4",
    odp: "ODP 2.2",
    paket: "Home Fiber 20 Mbps",
    status: "BARU",
    ip_address: "-",
    tgl_daftar: "2026-09-27",
  },
  {
    id: 8,
    id_pelanggan: "NX-2026-008",
    nama: "Cafe Kopi Kawan",
    telepon: "081288990011",
    alamat: "Jl. Sidas No. 12, Tengah Kota",
    odp: "ODP 1.3",
    paket: "Business Fiber 100 Mbps",
    status: "AKTIF",
    ip_address: "10.20.1.99",
    tgl_daftar: "2026-04-10",
  },
];
