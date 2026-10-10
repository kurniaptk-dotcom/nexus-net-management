import unifiedOdpOdc from "./unifiedOdpOdc.json";

export const bulan = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });

export const timList = [
  { id: 1, nama: "GATRA - AIS", status: "AKTIF", telepon: "081234567890", area: "Pontianak Kota / Siantan" },
  { id: 2, nama: "PUTRA - FAISAL", status: "AKTIF", telepon: "081298765432", area: "Pontianak Barat / Sungai Jawi" },
  { id: 3, nama: "AZWAR - RIO", status: "AKTIF", telepon: "08125556677", area: "Pontianak Selatan / Tenggara" },
];

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

// Data awal master tim
export const initialTimData = timList;

// Data pekerjaan detail untuk tabel dan kanban
export const pekerjaanList = [
  {
    id: 101,
    spk_no: "SPK/PSB/202610/0041",
    pelanggan: "Rudianto Saputra",
    jenis: "PEMASANGAN",
    status: "WAITING LIST",
    prioritas: "TINGGI",
    sesi: "PAGI",
    tim: "GATRA - AIS",
    alamat: "Jl. Danau Sentarum No. 45, Pontianak",
    odp: "ODP 1.1",
    port: "Port 3",
    telepon: "081234567811",
    tanggal: "2026-10-10",
    keterangan: "Pasang baru paket Home Fiber 30 Mbps, jalur tiang aman",
    komisi_items: [
      { id: "tarik_pelanggan_baru", qty: 85 },
      { id: "pasang_modem", qty: 1 },
      { id: "setting_modem", qty: 1 },
    ],
    komisi_total: 16500,
  },
  {
    id: 102,
    spk_no: "SPK/RPR/202610/0042",
    pelanggan: "Ratna Sari",
    jenis: "PERBAIKAN",
    status: "WAITING LIST",
    prioritas: "URGENT",
    sesi: "PAGI",
    tim: "PUTRA - FAISAL",
    alamat: "Gg. Cendrawasih No. 12, Pontianak",
    odp: "ODP 1.4",
    port: "Port 2",
    telepon: "081398765422",
    tanggal: "2026-10-10",
    keterangan: "LOS lampu merah berkedip, kabel dropcore tertimpa dahan pohon",
    komisi_items: [
      { id: "sambung_kabel", qty: 1 },
      { id: "perbaikan_fastcont", qty: 1 },
    ],
    komisi_total: 8500,
  },
  {
    id: 103,
    spk_no: "SPK/PSB/202610/0038",
    pelanggan: "Hendra Gunawan",
    jenis: "PEMASANGAN",
    status: "DIJADWALKAN",
    prioritas: "NORMAL",
    sesi: "SIANG",
    tim: "GATRA - AIS",
    alamat: "Jl. Gajah Mada No. 110, Pontianak",
    odp: "ODP 1.2",
    port: "Port 4",
    telepon: "082155667733",
    tanggal: "2026-10-10",
    keterangan: "Teknisi sedang menuju lokasi pengerjaan",
    komisi_items: [
      { id: "tarik_pelanggan_baru", qty: 110 },
      { id: "pasang_modem", qty: 1 },
      { id: "setting_modem", qty: 1 },
    ],
    komisi_total: 19000,
  },
  {
    id: 104,
    spk_no: "SPK/SPL/202610/0039",
    pelanggan: "Distribusi Sinyal Gang 4",
    jenis: "PERBAIKAN KHUSUS (ODP/ODC)",
    status: "DIJADWALKAN",
    prioritas: "TINGGI",
    sesi: "SIANG",
    tim: "AZWAR - RIO",
    alamat: "Jl. H.R. A Rahman Tiang 14",
    odp: "ODP 2.1",
    telepon: "08125556677",
    tanggal: "2026-10-10",
    keterangan: "Perbaikan dan perapian konektor tiang ODP",
    komisi_items: [
      { id: "perbaikan_odp_odc", qty: 1 },
    ],
    komisi_total: 10000,
  },
  {
    id: 105,
    spk_no: "SPK/PSB/202610/0031",
    pelanggan: "Budi Santoso",
    jenis: "PEMASANGAN",
    status: "SELESAI",
    tim: "GATRA - AIS",
    prioritas: "NORMAL",
    alamat: "Jl. Gajah Mada No. 45, Pontianak",
    odp: "ODP 1.2",
    port: "Port 1",
    redaman: "-19.2",
    sn_modem: "ZTEGC8819201",
    foto_opm: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80",
    foto_modem: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&q=80",
    waktu_selesai: "2026-10-09T14:30:00Z",
    tanggal: "2026-10-09",
    komisi_items: [
      { id: "tarik_pelanggan_baru", qty: 120 },
      { id: "pasang_modem", qty: 1 },
      { id: "setting_modem", qty: 1 },
    ],
    komisi_total: 20000,
    keterangan: "Pemasangan selesai. Redaman -19.2 dBm | SN: ZTEGC8819201 | Port 1 ODP 1.2",
  },
  {
    id: 106,
    spk_no: "SPK/RPR/202610/0032",
    pelanggan: "Hendrik Wijaya",
    jenis: "PERBAIKAN",
    status: "SELESAI",
    tim: "GATRA - AIS",
    prioritas: "TINGGI",
    alamat: "Jl. Ahmad Yani II Gg. Cendrawasih No. 8",
    odp: "ODP 1.4",
    port: "Port 1",
    redaman: "-18.8",
    waktu_selesai: "2026-10-09T11:15:00Z",
    tanggal: "2026-10-09",
    komisi_items: [
      { id: "sambung_kabel", qty: 1 },
      { id: "perbaikan_fastcont", qty: 1 },
    ],
    komisi_total: 8500,
    keterangan: "Splicing core fiber putus berhasil. Redaman normal kembali -18.8 dBm",
  },
  {
    id: 107,
    spk_no: "SPK/PSB/202610/0033",
    pelanggan: "dr. Andi Pratama",
    jenis: "PEMASANGAN",
    status: "SELESAI",
    tim: "PUTRA - FAISAL",
    prioritas: "NORMAL",
    alamat: "Klinik Medika Sehat, Jl. Veteran No. 88",
    odp: "ODP 1.1",
    port: "Port 2",
    redaman: "-17.9",
    sn_modem: "HWTC10928374",
    foto_opm: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80",
    foto_modem: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&q=80",
    waktu_selesai: "2026-10-08T16:00:00Z",
    tanggal: "2026-10-08",
    komisi_items: [
      { id: "tarik_pelanggan_baru", qty: 95 },
      { id: "pasang_modem", qty: 1 },
      { id: "setting_modem", qty: 1 },
    ],
    komisi_total: 17500,
    keterangan: "Pemasangan selesai rapi. Redaman prima -17.9 dBm | SN: HWTC10928374",
  },
  {
    id: 108,
    spk_no: "SPK/PSB/202610/0034",
    pelanggan: "Cafe Kopi Kawan",
    jenis: "PEMASANGAN",
    status: "SELESAI",
    tim: "PUTRA - FAISAL",
    prioritas: "NORMAL",
    alamat: "Jl. Sidas No. 12, Tengah Kota",
    odp: "ODP 1.3",
    port: "Port 4",
    redaman: "-19.5",
    sn_modem: "ZTEGC7722119",
    waktu_selesai: "2026-10-08T10:45:00Z",
    tanggal: "2026-10-08",
    komisi_items: [
      { id: "tarik_pelanggan_baru", qty: 140 },
      { id: "pasang_modem", qty: 1 },
      { id: "setting_modem", qty: 1 },
    ],
    komisi_total: 22000,
    keterangan: "Pemasangan paket bisnis selesai rapi",
  },
  {
    id: 109,
    spk_no: "SPK/DIS/202610/0035",
    pelanggan: "Dewi Lestari",
    jenis: "PEMUTUSAN",
    status: "SELESAI",
    tim: "AZWAR - RIO",
    prioritas: "NORMAL",
    alamat: "Jl. Danau Sentarum Gg. Bersama No. 19",
    odp: "ODP 2.3",
    port: "Port 5",
    waktu_selesai: "2026-10-07T15:20:00Z",
    tanggal: "2026-10-07",
    komisi_items: [
      { id: "pemutusan_dismantle", qty: 1 },
    ],
    komisi_total: 5000,
    keterangan: "Dismantle modem ONT & adaptor lengkap, 1 port ODP 2.3 dibebaskan",
  },
  {
    id: 110,
    spk_no: "SPK/PSB/202610/0036",
    pelanggan: "Iwan Setiawan",
    jenis: "PEMASANGAN",
    status: "GAGAL",
    tim: "AZWAR - RIO",
    prioritas: "NORMAL",
    alamat: "Jl. Tanjungpura No. 89",
    odp: "ODP 3.1",
    tanggal: "2026-10-07",
    keterangan: "[KENDALA] Pelanggan tidak ada di rumah / kosong - Rumah digembok, dijadwalkan ulang besok",
    komisi_items: [],
    komisi_total: 0,
  },
];

export const leadsList = [
  {
    id: 201,
    nama: "Fajar Nugraha",
    telepon: "081299887766",
    alamat: "Jl. Danau Sentarum No. 88, Pontianak",
    sumber: "IKLAN",
    status: "BARU",
    tanggal: "2026-10-10",
    lat: -0.0263,
    lng: 109.3425,
    odp_terdekat: "ODP 1.1",
    jarak_odp: 75,
    redaman: "-18.5",
    keterangan_survey: "Lokasi sangat dekat dengan tiang ODP 1.1, jalur aman",
  },
  {
    id: 202,
    nama: "Siti Nurhaliza",
    telepon: "085211223344",
    alamat: "Jl. Gajah Mada Gg. Gajah Mada 9 No. 4",
    sumber: "MARKETING",
    status: "BARU",
    tanggal: "2026-10-10",
    lat: -0.0315,
    lng: 109.3361,
    odp_terdekat: "ODP 1.2",
    jarak_odp: 120,
    redaman: "-19.8",
    keterangan_survey: "Siap survey lapangan",
  },
  {
    id: 203,
    nama: "Herman Susanto",
    telepon: "081377889900",
    alamat: "Jl. Ahmad Yani Komp. Perdana Indah B-3",
    sumber: "AFFILIATE",
    status: "DIJADWALKAN",
    tanggal: "2026-10-09",
    lat: -0.0452,
    lng: 109.3488,
    odp_terdekat: "ODP 1.4",
    jarak_odp: 85,
    redaman: "-18.2",
    biaya_kabel: "Gratis (di bawah 150m)",
    keterangan_survey: "Survey FEASIBLE. Calon pelanggan setuju pasang paket 50 Mbps",
  },
  {
    id: 204,
    nama: "Klinik Pratama Sehat",
    telepon: "082166778899",
    alamat: "Jl. Veteran No. 34",
    sumber: "MARKETING",
    status: "DIJADWALKAN",
    tanggal: "2026-10-08",
    lat: -0.0388,
    lng: 109.3402,
    odp_terdekat: "ODP 1.1",
    jarak_odp: 95,
    redaman: "-18.9",
    keterangan_survey: "Survey FEASIBLE. Siap terbitkan SPK",
  },
  {
    id: 205,
    nama: "Budi Santoso",
    telepon: "081234567890",
    alamat: "Jl. Gajah Mada No. 45",
    sumber: "IKLAN",
    status: "SELESAI",
    tanggal: "2026-10-05",
    lat: -0.0305,
    lng: 109.3370,
    odp_terdekat: "ODP 1.2",
    jarak_odp: 110,
    redaman: "-19.2",
    keterangan_survey: "Pemasangan selesai aktif",
  },
];
export const initialLeads = leadsList;

export const gangguanList = [
  {
    id: 301,
    tanggal: "2026-10-10",
    kategori: "Kabel Putus",
    pelanggan: "Ratna Sari",
    alamat: "Gg. Cendrawasih No. 12",
    status: "PROSES",
    keterangan: "LOS merah berkedip, tertimpa dahan pohon",
    user_terdampak: 1,
  },
  {
    id: 302,
    tanggal: "2026-10-10",
    kategori: "Redaman Tinggi",
    pelanggan: "Toko Sinar Rejeki",
    alamat: "Pasar Flamboyan Kios B-10",
    status: "WAITING",
    keterangan: "Redaman -26.5 dBm, koneksi sering putus",
    user_terdampak: 1,
  },
  {
    id: 303,
    tanggal: "2026-10-09",
    kategori: "Kabel Putus",
    pelanggan: "Hendrik Wijaya",
    alamat: "Jl. Ahmad Yani II No. 8",
    status: "SELESAI",
    keterangan: "Splicing kabel dropcore berhasil, redaman kembali -18.8 dBm",
    user_terdampak: 1,
  },
  {
    id: 304,
    tanggal: "2026-10-08",
    kategori: "Modem",
    pelanggan: "Siti Rahmawati",
    alamat: "Komp. Surya Kencana C-12",
    status: "SELESAI",
    keterangan: "Ganti adaptor modem 12V 1.5A baru, internet normal",
    user_terdampak: 1,
  },
];

export const daftarGangguanList = gangguanList;
export const initialGangguanList = daftarGangguanList;

export const fuPelangganList = [
  { id: 1, nama: "Budi Santoso", status: "Puas", rating: 5, tanggal: "2026-10-10", catatan: "Pemasangan cepat dan rapi" },
  { id: 2, nama: "Hendrik Wijaya", status: "Puas", rating: 5, tanggal: "2026-10-09", catatan: "Perbaikan tepat waktu" },
];

export const redamanTinggiList = [
  { id: 1, pelanggan: "Toko Sinar Rejeki", redaman: -26.5, odp: "ODP 3.2", status: "Penanganan" },
];

export const pengajuanPemutusanList = [
  {
    id: 401,
    nama: "Dewi Lestari",
    kontak: "089677889900",
    alasan: "Pindah rumah keluar kota",
    tanggal: "2026-10-07",
    status: "SELESAI",
  },
  {
    id: 402,
    nama: "Fandi Ahmad",
    kontak: "087755443322",
    alasan: "Kontrak ruko berakhir",
    tanggal: "2026-10-10",
    status: "MENUNGGU_DISPOSISI",
  },
];

export const summaryData = {
  totalPekerjaan: 10,
  totalLeads: 5,
  pemasangan: { waitingList: 1, dijadwalkan: 1, selesai: 3, gagal: 1 },
  perbaikan: { waitingList: 1, dijadwalkan: 1, selesai: 1 },
  pemutusan: { waitingList: 0, dijadwalkan: 0, selesai: 1, gagal: 0 },
  sumberLeads: { IKLAN: 2, MARKETING: 2, AFFILIATE: 1 },
  odpOdc: { total: 12, userTerdampak: 2 },
};

export const gangguanData = {
  eksternal: { "Kabel Putus": 2, "Redaman Tinggi": 1, Modem: 1 },
  totalCase: 4,
};

// Fungsi Seeder Demo Data Seketika untuk Presentasi
export function seedAllDemoData() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem("xnet_tim", JSON.stringify(timList));
    localStorage.setItem("xnet_pekerjaan", JSON.stringify(pekerjaanList));
    localStorage.setItem("xnet_leads", JSON.stringify(leadsList));
    localStorage.setItem("xnet_gangguan", JSON.stringify(gangguanList));
    localStorage.setItem("xnet_daftar_gangguan_v2", JSON.stringify(daftarGangguanList));
    localStorage.setItem("xnet_pengajuan_pemutusan", JSON.stringify(pengajuanPemutusanList));
    localStorage.setItem("xnet_pelanggan_radius", JSON.stringify(initialPelangganRadius));

    // Kirim notifikasi storage update agar seluruh hook di komponen langsung me-render ulang
    const keys = [
      "xnet_tim",
      "xnet_pekerjaan",
      "xnet_leads",
      "xnet_gangguan",
      "xnet_daftar_gangguan_v2",
      "xnet_pengajuan_pemutusan",
      "xnet_pelanggan_radius",
    ];
    keys.forEach((k) => {
      window.dispatchEvent(
        new CustomEvent("xnet_storage_update", {
          detail: { key: k, value: JSON.parse(localStorage.getItem(k) || "[]") },
        })
      );
    });
    console.log("✅ [DEMO SEEDER] Seluruh data demo berhasil diisi ke sistem.");
  } catch (err) {
    console.warn("Gagal seed demo data:", err);
  }
}

// Inisialisasi otomatis: Jika saat aplikasi dimuat data pekerjaan kosong, isi data demo
if (typeof localStorage !== "undefined") {
  try {
    const existingPekerjaan = localStorage.getItem("xnet_pekerjaan");
    if (!existingPekerjaan || existingPekerjaan === "[]" || existingPekerjaan === "null") {
      seedAllDemoData();
    }
  } catch {}
}

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
