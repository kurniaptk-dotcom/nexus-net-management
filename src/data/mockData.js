export const bulan = "September 2026";

export const timList = [
  { id: 1, nama: "GATRA - AIS", warna: "#3B82F6" },
  { id: 2, nama: "AZWAR - RIO", warna: "#10B981" },
  { id: 3, nama: "IQBAL - JUSMAN", warna: "#F59E0B" },
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

// Data awal dari spreadsheet
export const initialTimData = [
  {
    id: 1,
    nama: "GATRA - AIS",
    pemasangan: { waitingList: 1, dijadwalkan: 0, selesai: 8, gagal: 0 },
    perbaikan: { waitingList: 0, dijadwalkan: 0, selesai: 10 },
    pemutusan: { waitingList: 0, dijadwalkan: 0, selesai: 0 },
  },
  {
    id: 2,
    nama: "AZWAR - RIO",
    pemasangan: { waitingList: 1, dijadwalkan: 0, selesai: 8, gagal: 0 },
    perbaikan: { waitingList: 1, dijadwalkan: 0, selesai: 13 },
    pemutusan: { waitingList: 0, dijadwalkan: 0, selesai: 0 },
  },
  {
    id: 3,
    nama: "IQBAL - JUSMAN",
    pemasangan: { waitingList: 0, dijadwalkan: 0, selesai: 9, gagal: 0 },
    perbaikan: { waitingList: 0, dijadwalkan: 0, selesai: 10 },
    pemutusan: { waitingList: 1, dijadwalkan: 0, selesai: 1 },
  },
];

export const summaryData = {
  totalPekerjaan: 63,
  totalLeads: 5,
  pemasangan: { waitingList: 2, dijadwalkan: 0, selesai: 25, gagal: 0 },
  perbaikan: { waitingList: 1, dijadwalkan: 0, selesai: 33 },
  pemutusan: { waitingList: 1, dijadwalkan: 0, selesai: 1, gagal: 0 },
  sumberLeads: { iklan: 2, affiliate: 2, marketing: 1 },
  odpOdc: { total: 0, userTerdampak: 17 },
};

export const gangguanData = {
  eksternal: {
    "Tidak Muncul": 0,
    "Kabel Putus": 4,
    "No Internet": 1,
    "Modem": 12,
    "Redaman Tinggi": 3,
    "Server": 0,
    Pusat: 0,
  },
  totalCase: 20,
};

// Data pekerjaan detail untuk tabel
export const pekerjaanList = [
  { id: 1, tim: "GATRA - AIS", jenis: "PEMASANGAN", alamat: "Jl. Merdeka No. 10", pelanggan: "Ahmad Fauzi", odp: "ODC 1 - ODP 1.2 - M. Sarno", status: "SELESAI", tanggal: "2026-09-01", keterangan: "Pemasangan baru RG" },
  { id: 2, tim: "GATRA - AIS", jenis: "PEMASANGAN", alamat: "Jl. Sudirman No. 25", pelanggan: "Budi Santoso", odp: "ODC 1 - ODP 1.7 - Ani Febriyanti", status: "SELESAI", tanggal: "2026-09-02", keterangan: "Pemasangan ONT" },
  { id: 3, tim: "GATRA - AIS", jenis: "PERBAIKAN", alamat: "Jl. Gatot Subroto No. 5", pelanggan: "Dewi Lestari", odp: "ODC 2 - ODP 2.4 - Alfian Azis P", status: "SELESAI", tanggal: "2026-09-03", keterangan: "Ganti kabel fiber" },
  { id: 4, tim: "AZWAR - RIO", jenis: "PEMASANGAN", alamat: "Jl. Ahmad Yani No. 12", pelanggan: "Eko Prasetyo", odp: "ODC 3 - ODP 3.5 - Selvi Sushanti", status: "SELESAI", tanggal: "2026-09-01", keterangan: "Pemasangan baru" },
  { id: 5, tim: "AZWAR - RIO", jenis: "PEMASANGAN", alamat: "Jl. Diponegoro No. 8", pelanggan: "Fitri Handayani", odp: "ODC 4 - ODP 4.8 - Sanyabi", status: "WAITING LIST", tanggal: "2026-09-15", keterangan: "Menunggu ODP ready" },
  { id: 6, tim: "AZWAR - RIO", jenis: "PERBAIKAN", alamat: "Jl. Imam Bonjol No. 3", pelanggan: "Gunawan Wibisono", odp: "ODC 8 - ODP 8.3 - Iwan Hermawan", status: "SELESAI", tanggal: "2026-09-05", keterangan: "Perbaikan redaman" },
  { id: 7, tim: "IQBAL - JUSMAN", jenis: "PEMASANGAN", alamat: "Jl. Pemuda No. 17", pelanggan: "Hendra Kurniawan", odp: "ODC 11 - ODP 11.2 - Kusnadin", status: "SELESAI", tanggal: "2026-09-01", keterangan: "Pemasangan baru" },
  { id: 8, tim: "IQBAL - JUSMAN", jenis: "PEMUTUSAN", alamat: "Jl. Kartini No. 22", pelanggan: "Indah Permata", odp: "ODC 12 - ODP 12.7 - Adi Gunawan", status: "SELESAI", tanggal: "2026-09-10", keterangan: "Putus permintaan pelanggan" },
  { id: 9, tim: "IQBAL - JUSMAN", jenis: "PERBAIKAN", alamat: "Jl. Cut Nyak Dien No. 9", pelanggan: "Joko Susilo", odp: "ODC 23 - ODP 23.2 Hasbi Andika", status: "SELESAI", tanggal: "2026-09-18", keterangan: "Modem rusak diganti" },
  { id: 10, tim: "GATRA - AIS", jenis: "PEMASANGAN", alamat: "Jl. Diponegoro No. 14", pelanggan: "Kartika Dewi", odp: "ODC 11 - ODP 11.3 Rizka Andriana S", status: "WAITING LIST", tanggal: "2026-09-20", keterangan: "Menunggu stok ONT" },
  { id: 11, tim: "GATRA - AIS", jenis: "PEMASANGAN", alamat: "Jl. Veteran No. 7", pelanggan: "Lukman Hakim", status: "SELESAI", tanggal: "2026-09-04", keterangan: "Pemasangan ONT baru" },
  { id: 12, tim: "GATRA - AIS", jenis: "PEMASANGAN", alamat: "Jl. Panjaitan No. 19", pelanggan: "Maya Sari", status: "SELESAI", tanggal: "2026-09-06", keterangan: "Pemasangan baru RG" },
  { id: 13, tim: "GATRA - AIS", jenis: "PEMASANGAN", alamat: "Jl. Sisingamangaraja No. 31", pelanggan: "Nugroho Adi", status: "SELESAI", tanggal: "2026-09-08", keterangan: "Instalasi fiber ke rumah" },
  { id: 14, tim: "GATRA - AIS", jenis: "PEMASANGAN", alamat: "Jl. Teuku Umar No. 4", pelanggan: "Olivia Putri", status: "SELESAI", tanggal: "2026-09-10", keterangan: "Pemasangan paket internet" },
  { id: 15, tim: "GATRA - AIS", jenis: "PEMASANGAN", alamat: "Jl. Fatmawati No. 28", pelanggan: "Prabowo Suminto", status: "SELESAI", tanggal: "2026-09-12", keterangan: "Pemasangan baru rumah" },
  { id: 16, tim: "GATRA - AIS", jenis: "PEMASANGAN", alamat: "Jl. Rasuna Said No. 6", pelanggan: "Ratna Sari", status: "SELESAI", tanggal: "2026-09-14", keterangan: "Instalasi ONT di lantai 2" },
  { id: 17, tim: "GATRA - AIS", jenis: "PERBAIKAN", alamat: "Jl. Sultan Agung No. 11", pelanggan: "Surya Darma", status: "SELESAI", tanggal: "2026-09-02", keterangan: "Perbaikan kabel putus" },
  { id: 18, tim: "GATRA - AIS", jenis: "PERBAIKAN", alamat: "Jl. Hayam Wuruk No. 23", pelanggan: "Tina Larasati", status: "SELESAI", tanggal: "2026-09-04", keterangan: "Ganti patch cord" },
  { id: 19, tim: "GATRA - AIS", jenis: "PERBAIKAN", alamat: "Jl. Gajah Mada No. 15", pelanggan: "Udin Hermawan", status: "SELESAI", tanggal: "2026-09-06", keterangan: "Perbaikan redaman tinggi" },
  { id: 20, tim: "GATRA - AIS", jenis: "PERBAIKAN", alamat: "Jl. Mangkubumi No. 2", pelanggan: "Vera Anggraini", status: "SELESAI", tanggal: "2026-09-08", keterangan: "Reset modem jarak jauh" },
  { id: 21, tim: "GATRA - AIS", jenis: "PERBAIKAN", alamat: "Jl. Braga No. 18", pelanggan: "Wahyu Nugroho", status: "SELESAI", tanggal: "2026-09-10", keterangan: "Perbaikan konektor SC" },
  { id: 22, tim: "GATRA - AIS", jenis: "PERBAIKAN", alamat: "Jl. Asia Afrika No. 9", pelanggan: "Xenia Oktavia", status: "SELESAI", tanggal: "2026-09-12", keterangan: "Ganti kabel patch" },
  { id: 23, tim: "GATRA - AIS", jenis: "PERBAIKAN", alamat: "Jl. Pahlawan No. 13", pelanggan: "Yoga Pratama", status: "SELESAI", tanggal: "2026-09-14", keterangan: "Perbaikan no internet" },
  { id: 24, tim: "GATRA - AIS", jenis: "PERBAIKAN", alamat: "Jl. Kemerdekaan No. 27", pelanggan: "Zahra Amalia", status: "SELESAI", tanggal: "2026-09-17", keterangan: "Ganti ONT rusak" },
  { id: 25, tim: "GATRA - AIS", jenis: "PERBAIKAN", alamat: "Jl. Kenari No. 33", pelanggan: "Andi Saputra", status: "SELESAI", tanggal: "2026-09-20", keterangan: "Perbaikan lampu LOS" },
  { id: 26, tim: "AZWAR - RIO", jenis: "PEMASANGAN", alamat: "Jl. Imam Bonjol No. 21", pelanggan: "Bayu Firmansyah", status: "SELESAI", tanggal: "2026-09-02", keterangan: "Pemasangan baru rumah" },
  { id: 27, tim: "AZWAR - RIO", jenis: "PEMASANGAN", alamat: "Jl. Kartini No. 5", pelanggan: "Citra Lestari", status: "SELESAI", tanggal: "2026-09-04", keterangan: "Instalasi ONT" },
  { id: 28, tim: "AZWAR - RIO", jenis: "PEMASANGAN", alamat: "Jl. Cut Nyak Dien No. 16", pelanggan: "Dimas Prayoga", status: "SELESAI", tanggal: "2026-09-06", keterangan: "Pemasangan fiber optik" },
  { id: 29, tim: "AZWAR - RIO", jenis: "PEMASANGAN", alamat: "Jl. Sudirman No. 40", pelanggan: "Eka Wulandari", status: "SELESAI", tanggal: "2026-09-08", keterangan: "Pemasangan paket rumahan" },
  { id: 30, tim: "AZWAR - RIO", jenis: "PEMASANGAN", alamat: "Jl. Gatot Subroto No. 29", pelanggan: "Fajar Ramadhan", status: "SELESAI", tanggal: "2026-09-10", keterangan: "Instalasi di apartemen" },
  { id: 31, tim: "AZWAR - RIO", jenis: "PEMASANGAN", alamat: "Jl. Ahmad Yani No. 37", pelanggan: "Gita Puspita", status: "SELESAI", tanggal: "2026-09-12", keterangan: "Pemasangan baru" },
  { id: 32, tim: "AZWAR - RIO", jenis: "PEMASANGAN", alamat: "Jl. Diponegoro No. 11", pelanggan: "Hadi Susanto", status: "SELESAI", tanggal: "2026-09-14", keterangan: "Pemasangan ONT baru" },
  { id: 33, tim: "AZWAR - RIO", jenis: "PERBAIKAN", alamat: "Jl. Pemuda No. 26", pelanggan: "Ira Setyawati", status: "WAITING LIST", tanggal: "2026-09-25", keterangan: "Menunggu spare part" },
  { id: 34, tim: "AZWAR - RIO", jenis: "PERBAIKAN", alamat: "Jl. Merdeka No. 32", pelanggan: "Jefri Pratama", status: "SELESAI", tanggal: "2026-09-01", keterangan: "Ganti kabel fiber putus" },
  { id: 35, tim: "AZWAR - RIO", jenis: "PERBAIKAN", alamat: "Jl. Veteran No. 14", pelanggan: "Kurnia Sandi", status: "SELESAI", tanggal: "2026-09-03", keterangan: "Perbaikan redaman" },
  { id: 36, tim: "AZWAR - RIO", jenis: "PERBAIKAN", alamat: "Jl. Panjaitan No. 22", pelanggan: "Lestari Dewi", status: "SELESAI", tanggal: "2026-09-05", keterangan: "Reset modem remot" },
  { id: 37, tim: "AZWAR - RIO", jenis: "PERBAIKAN", alamat: "Jl. Sisingamangaraja No. 8", pelanggan: "Maman Supriatna", status: "SELESAI", tanggal: "2026-09-07", keterangan: "Ganti patch cord SC/APC" },
  { id: 38, tim: "AZWAR - RIO", jenis: "PERBAIKAN", alamat: "Jl. Teuku Umar No. 20", pelanggan: "Nina Agustina", status: "SELESAI", tanggal: "2026-09-09", keterangan: "Perbaikan kabel LAN" },
  { id: 39, tim: "AZWAR - RIO", jenis: "PERBAIKAN", alamat: "Jl. Fatmawati No. 3", pelanggan: "Omar Daniel", status: "SELESAI", tanggal: "2026-09-11", keterangan: "Ganti splitter rusak" },
  { id: 40, tim: "AZWAR - RIO", jenis: "PERBAIKAN", alamat: "Jl. Rasuna Said No. 25", pelanggan: "Putri Rahayu", status: "SELESAI", tanggal: "2026-09-13", keterangan: "Perbaikan no signal" },
  { id: 41, tim: "AZWAR - RIO", jenis: "PERBAIKAN", alamat: "Jl. Sultan Agung No. 7", pelanggan: "Rizky Aditya", status: "SELESAI", tanggal: "2026-09-15", keterangan: "Ganti ONT mati total" },
  { id: 42, tim: "AZWAR - RIO", jenis: "PERBAIKAN", alamat: "Jl. Hayam Wuruk No. 30", pelanggan: "Sinta Oktaviani", status: "SELESAI", tanggal: "2026-09-17", keterangan: "Perbaikan redaman tinggi" },
  { id: 43, tim: "AZWAR - RIO", jenis: "PERBAIKAN", alamat: "Jl. Gajah Mada No. 12", pelanggan: "Tono Widodo", status: "SELESAI", tanggal: "2026-09-19", keterangan: "Ganti kabel patch" },
  { id: 44, tim: "AZWAR - RIO", jenis: "PERBAIKAN", alamat: "Jl. Mangkubumi No. 18", pelanggan: "Ulya Maghfiroh", status: "SELESAI", tanggal: "2026-09-21", keterangan: "Perbaikan konektor" },
  { id: 45, tim: "AZWAR - RIO", jenis: "PERBAIKAN", alamat: "Jl. Braga No. 9", pelanggan: "Victor Handoko", status: "SELESAI", tanggal: "2026-09-23", keterangan: "Reset ONT dari MDF" },
  { id: 46, tim: "IQBAL - JUSMAN", jenis: "PEMASANGAN", alamat: "Jl. Salemba No. 11", pelanggan: "Angga Pratama", status: "SELESAI", tanggal: "2026-09-02", keterangan: "Pemasangan baru" },
  { id: 47, tim: "IQBAL - JUSMAN", jenis: "PEMASANGAN", alamat: "Jl. Kramat Raya No. 8", pelanggan: "Bella Anastasia", status: "SELESAI", tanggal: "2026-09-04", keterangan: "Instalasi ONT" },
  { id: 48, tim: "IQBAL - JUSMAN", jenis: "PEMASANGAN", alamat: "Jl. Matraman No. 23", pelanggan: "Cahyo Nugroho", status: "SELESAI", tanggal: "2026-09-06", keterangan: "Pemasangan fiber" },
  { id: 49, tim: "IQBAL - JUSMAN", jenis: "PEMASANGAN", alamat: "Jl. Pegangsaan Timur No. 15", pelanggan: "Dian Permata", status: "SELESAI", tanggal: "2026-09-08", keterangan: "Pemasangan baru rumah" },
  { id: 50, tim: "IQBAL - JUSMAN", jenis: "PEMASANGAN", alamat: "Jl. Cikini Raya No. 7", pelanggan: "Eko Wahyudi", status: "SELESAI", tanggal: "2026-09-10", keterangan: "Instalasi paket internet" },
  { id: 51, tim: "IQBAL - JUSMAN", jenis: "PEMASANGAN", alamat: "Jl. Setiabudi No. 19", pelanggan: "Fitriani Utami", status: "SELESAI", tanggal: "2026-09-12", keterangan: "Pemasangan di ruko" },
  { id: 52, tim: "IQBAL - JUSMAN", jenis: "PEMASANGAN", alamat: "Jl. Thamrin No. 26", pelanggan: "Gilang Ramadhan", status: "SELESAI", tanggal: "2026-09-14", keterangan: "Pemasangan ONT" },
  { id: 53, tim: "IQBAL - JUSMAN", jenis: "PEMASANGAN", alamat: "Jl. Kuningan No. 12", pelanggan: "Hana Yulianti", status: "SELESAI", tanggal: "2026-09-16", keterangan: "Instalasi baru koneksi" },
  { id: 54, tim: "IQBAL - JUSMAN", jenis: "PERBAIKAN", alamat: "Jl. Casablanca No. 34", pelanggan: "Irfan Hakimi", status: "SELESAI", tanggal: "2026-09-01", keterangan: "Ganti kabel patch" },
  { id: 55, tim: "IQBAL - JUSMAN", jenis: "PERBAIKAN", alamat: "Jl. TB Simatupang No. 9", pelanggan: "Julia Rahmawati", status: "SELESAI", tanggal: "2026-09-03", keterangan: "Perbaikan redaman" },
  { id: 56, tim: "IQBAL - JUSMAN", jenis: "PERBAIKAN", alamat: "Jl. Ampera No. 17", pelanggan: "Kevin Sanjaya", status: "SELESAI", tanggal: "2026-09-05", keterangan: "Reset modem dari OLT" },
  { id: 57, tim: "IQBAL - JUSMAN", jenis: "PERBAIKAN", alamat: "Jl. Ragunan No. 22", pelanggan: "Lia Agustina", status: "SELESAI", tanggal: "2026-09-07", keterangan: "Ganti splitter" },
  { id: 58, tim: "IQBAL - JUSMAN", jenis: "PERBAIKAN", alamat: "Jl. Darsono No. 5", pelanggan: "M Riski Pratama", status: "SELESAI", tanggal: "2026-09-09", keterangan: "Perbaikan no internet" },
  { id: 59, tim: "IQBAL - JUSMAN", jenis: "PERBAIKAN", alamat: "Jl. Bulungan No. 13", pelanggan: "Nanda Wijaya", status: "SELESAI", tanggal: "2026-09-11", keterangan: "Ganti ONT rusak" },
  { id: 60, tim: "IQBAL - JUSMAN", jenis: "PERBAIKAN", alamat: "Jl. Wijaya No. 28", pelanggan: "Olivia Chen", status: "SELESAI", tanggal: "2026-09-13", keterangan: "Perbaikan kabel putus" },
  { id: 61, tim: "IQBAL - JUSMAN", jenis: "PERBAIKAN", alamat: "Jl. Radio Dalam No. 3", pelanggan: "Prasetyo Utomo", status: "SELESAI", tanggal: "2026-09-15", keterangan: "Ganti patch cord SC" },
  { id: 62, tim: "IQBAL - JUSMAN", jenis: "PERBAIKAN", alamat: "Jl. Lebak Bulus No. 10", pelanggan: "Rina Wulandari", status: "SELESAI", tanggal: "2026-09-17", keterangan: "Perbaikan lampu LOS" },
  { id: 63, tim: "IQBAL - JUSMAN", jenis: "PEMUTUSAN", alamat: "Jl. Kemang No. 16", pelanggan: "Satria Nugraha", status: "WAITING LIST", tanggal: "2026-09-26", keterangan: "Menunggu konfirmasi pelanggan" },
  { id: 64, tim: "GATRA - AIS", jenis: "PERBAIKAN KHUSUS (ODP/ODC)", alamat: "Jl. Melati RT 02", pelanggan: "M. Sarno (ODP 1.2)", odp: "ODC 1 - ODP 1.2 - M. Sarno", status: "DIJADWALKAN", tanggal: "2026-09-24", keterangan: "Splicing ulang ODP LOS di lapangan" },
  { id: 65, tim: "AZWAR - RIO", jenis: "PERBAIKAN KHUSUS (ODP/ODC)", alamat: "Jl. Dahlia No. 15", pelanggan: "Alfian Azis (ODP 2.4)", odp: "ODC 2 - ODP 2.4 - Alfian Azis P", status: "SELESAI", tanggal: "2026-09-22", keterangan: "Pergantian splitter ODC 2 selesai" },
];

export const leadsList = [
  { id: 1, nama: "Rina Marlina", sumber: "IKLAN", status: "BARU", tanggal: "2026-09-01", telepon: "081234567890", alamat: "Jl. Baru No. 1" },
  { id: 2, nama: "Tono Sugiarto", sumber: "AFFILIATE", status: "KONTAK", tanggal: "2026-09-03", telepon: "081234567891", alamat: "Jl. Lama No. 2" },
  { id: 3, nama: "Siti Nurhaliza", sumber: "MARKETING", status: "DIJADWALKAN", tanggal: "2026-09-05", telepon: "081234567892", alamat: "Jl. Tengah No. 3" },
  { id: 4, nama: "Andi Wijaya", sumber: "IKLAN", status: "SELESAI", tanggal: "2026-09-02", telepon: "081234567893", alamat: "Jl. Utama No. 4" },
  { id: 5, nama: "Maya Anggraeni", sumber: "AFFILIATE", status: "BARU", tanggal: "2026-09-08", telepon: "081234567894", alamat: "Jl. Pahlawan No. 5" },
];

export const gangguanList = [
  { id: 1, tanggal: "2026-09-02", kategori: "Kabel Putus", pelanggan: "Budi Santoso", alamat: "Jl. Sudirman No. 25", status: "SELESAI", keterangan: "Kabel putus karena pohon tumbang", userTerdampak: 4 },
  { id: 2, tanggal: "2026-09-05", kategori: "Modem", pelanggan: "Eko Prasetyo", alamat: "Jl. Ahmad Yani No. 12", status: "SELESAI", keterangan: "Modem mati total", userTerdampak: 1 },
  { id: 3, tanggal: "2026-09-08", kategori: "Redaman Tinggi", pelanggan: "Dewi Lestari", alamat: "Jl. Gatot Subroto No. 5", status: "PROGRESS", keterangan: "Redaman > 25dB", userTerdampak: 3 },
  { id: 4, tanggal: "2026-09-10", kategori: "No Internet", pelanggan: "Fitri Handayani", alamat: "Jl. Diponegoro No. 8", status: "SELESAI", keterangan: "Gangguan upstream", userTerdampak: 1 },
  { id: 5, tanggal: "2026-09-11", kategori: "Modem", pelanggan: "Rina Wulandari", alamat: "Jl. Imam Bonjol No. 31", status: "SELESAI", keterangan: "Modem overheating", userTerdampak: 2 },
  { id: 6, tanggal: "2026-09-11", kategori: "Modem", pelanggan: "Agus Setiawan", alamat: "Jl. Hayam Wuruk No. 17", status: "PROGRESS", keterangan: "Modem restart terus menerus", userTerdampak: 3 },
  { id: 7, tanggal: "2026-09-12", kategori: "Kabel Putus", pelanggan: "Siti Nurhaliza", alamat: "Jl. Gajah Mada No. 44", status: "SELESAI", keterangan: "Kabel fiber dipotong saat renovasi", userTerdampak: 6 },
  { id: 8, tanggal: "2026-09-13", kategori: "Modem", pelanggan: "Hendra Kusuma", alamat: "Jl. Pahlawan No. 9", status: "SELESAI", keterangan: "Modem tidak sync", userTerdampak: 1 },
  { id: 9, tanggal: "2026-09-13", kategori: "Modem", pelanggan: "Yanti Susanti", alamat: "Jl. Kenanga No. 22", status: "SELESAI", keterangan: "Modem lambat", userTerdampak: 2 },
  { id: 10, tanggal: "2026-09-14", kategori: "Redaman Tinggi", pelanggan: "Andi Cahyono", alamat: "Jl. Melati No. 3", status: "SELESAI", keterangan: "Redaman 28dB, splice required", userTerdampak: 4 },
  { id: 11, tanggal: "2026-09-15", kategori: "Modem", pelanggan: "Putri Rahayu", alamat: "Jl. Cendana No. 11", status: "PROGRESS", keterangan: "Modem ada warning PON", userTerdampak: 2 },
  { id: 12, tanggal: "2026-09-16", kategori: "Modem", pelanggan: "Rudi Hartono", alamat: "Jl. Jendral Sudirman No. 56", status: "SELESAI", keterangan: "Modem perlu replace", userTerdampak: 1 },
  { id: 13, tanggal: "2026-09-17", kategori: "Modem", pelanggan: "Maya Anggraeni", alamat: "Jl. Pemuda No. 28", status: "SELESAI", keterangan: "Modem LOS merah", userTerdampak: 3 },
  { id: 14, tanggal: "2026-09-17", kategori: "Kabel Putus", pelanggan: "Dodi Firmansyah", alamat: "Jl. Bangunan No. 15", status: "SELESAI", keterangan: "Kabel putus akibat proyek jalan", userTerdampak: 5 },
  { id: 15, tanggal: "2026-09-18", kategori: "Modem", pelanggan: "Wati Sumarni", alamat: "Jl. Anggrek No. 7", status: "PROGRESS", keterangan: "Modem belum konfigurasi", userTerdampak: 1 },
  { id: 16, tanggal: "2026-09-19", kategori: "Modem", pelanggan: "Fajar Nugroho", alamat: "Jl. Merdeka No. 40", status: "SELESAI", keterangan: "Modem firmware corrupt", userTerdampak: 2 },
  { id: 17, tanggal: "2026-09-20", kategori: "Redaman Tinggi", pelanggan: "Lina Marlina", alamat: "Jl. Teuku Umar No. 19", status: "PROGRESS", keterangan: "Redaman 30dB, joint box rusak", userTerdampak: 6 },
  { id: 18, tanggal: "2026-09-20", kategori: "Modem", pelanggan: "Bambang Priyono", alamat: "Jl. Veteran No. 13", status: "SELESAI", keterangan: "Modem hang", userTerdampak: 1 },
  { id: 19, tanggal: "2026-09-21", kategori: "Modem", pelanggan: "Ratna Sari", alamat: "Jl. Flamboyan No. 26", status: "SELESAI", keterangan: "Modem power supply rusak", userTerdampak: 2 },
  { id: 20, tanggal: "2026-09-22", kategori: "Kabel Putus", pelanggan: "Tono Sugiarto", alamat: "Jl. Jambu No. 33", status: "SELESAI", keterangan: "Kabel putus karena kucing", userTerdampak: 3 },
];

// Progress pemasangan per tim (dari spreadsheet)
export const progressPemasangan = [
  { tim: "GATRA - AIS", selesai: 8, total: 9, persen: 88.89, gagal: 0 },
  { tim: "AZWAR - RIO", selesai: 8, total: 9, persen: 88.89, gagal: 0 },
  { tim: "IQBAL - JUSMAN", selesai: 9, total: 9, persen: 100, gagal: 0 },
];

// Progress pemutusan per tim (handle division by zero)
export const progressPemutusan = [
  { tim: "GATRA - AIS", selesai: 0, total: 0, persen: null },
  { tim: "AZWAR - RIO", selesai: 0, total: 0, persen: null },
  { tim: "IQBAL - JUSMAN", selesai: 1, total: 2, persen: 50 },
];

// Daftar gangguan internal
export const gangguanInternal = [
  { kategori: "Tidak Muncul", jumlah: 0 },
  { kategori: "Kabel Putus", jumlah: 4 },
  { kategori: "No Internet", jumlah: 1 },
  { kategori: "Modem", jumlah: 12 },
  { kategori: "Redaman Tinggi", jumlah: 3 },
  { kategori: "Server", jumlah: 0 },
  { kategori: "Pusat", jumlah: 0 },
];

// Data ODP/ODC LOS
export const odpOdcLos = {
  totalOdpOdc: 0,
  userTerdampak: 17,
};

// FU Pelanggan - Follow up data
export const fuPelangganList = [
  { id: 1, pelanggan: "Ahmad Fauzi", tanggal: "2026-09-01", status: "Selesai", keterangan: "Pemasangan selesai", prioritas: "Normal" },
  { id: 2, pelanggan: "Budi Santoso", tanggal: "2026-09-05", status: "Proses", keterangan: "Menunggu perbaikan kabel", prioritas: "Tinggi" },
  { id: 3, pelanggan: "Dewi Lestari", tanggal: "2026-09-08", status: "Proses", keterangan: "Redaman tinggi, perlu pengecekan", prioritas: "Tinggi" },
  { id: 4, pelanggan: "Eko Prasetyo", tanggal: "2026-09-10", status: "Selesai", keterangan: "Modem diganti", prioritas: "Normal" },
  { id: 5, pelanggan: "Fitri Handayani", tanggal: "2026-09-12", status: "Menunggu", keterangan: "Menunggu jadwal teknisi", prioritas: "Normal" },
];

// Redaman Tinggi detail
export const redamanTinggiList = [
  { id: 1, lokasi: "Jl. Gatot Subroto RT 01", nilaiRedaman: 28, status: "Proses", teknisi: "GATRA - AIS" },
  { id: 2, lokasi: "Jl. Sudirman RT 03", nilaiRedaman: 32, status: "Menunggu", teknisi: "AZWAR - RIO" },
  { id: 3, lokasi: "Jl. Pemuda RT 05", nilaiRedaman: 26, status: "Selesai", teknisi: "IQBAL - JUSMAN" },
];

// Pengajuan Pemutusan (17 data dari spreadsheet)
export const pengajuanPemutusanList = [
  { id: 1, nama: "Miftahudin", kontak: "62816215150", alasan: "", tanggal: "25-7-26" },
  { id: 2, nama: "Yudi Mariadi", kontak: "6282150921979", alasan: "mencari yang bisa diatur jam internet", tanggal: "5-8-26" },
  { id: 3, nama: "As Ari Musthafa Lubis", kontak: "6285763098816", alasan: "Pindah Kontrak", tanggal: "17-8-26" },
  { id: 4, nama: "Rizky Surya Perdana", kontak: "628211444255", alasan: "", tanggal: "19-8-26" },
  { id: 5, nama: "Chairul", kontak: "6285752025242", alasan: "Krisis Finansial", tanggal: "20-8-26" },
  { id: 6, nama: "Maya Febriandika", kontak: "6285777528927", alasan: "Pindah Provider Lain", tanggal: "20-8-26" },
  { id: 7, nama: "Andika Saputra", kontak: "6289794114509", alasan: "", tanggal: "21-8-26" },
  { id: 8, nama: "Arif Dicky Pratama", kontak: "6289693616180", alasan: "", tanggal: "23-8-26" },
  { id: 9, nama: "Hasyim H.M", kontak: "6285654854599", alasan: "Yang Memakai Meninggal", tanggal: "25-8-26" },
  { id: 10, nama: "Nurkirana", kontak: "6285828530250", alasan: "Tidak Digunakan", tanggal: "25-8-26" },
  { id: 11, nama: "Sela Selviani", kontak: "6287841393937", alasan: "Suka Ngelag", tanggal: "28-8-26" },
  { id: 12, nama: "Ikhwan Apriyanto", kontak: "628979610947", alasan: "Lelet", tanggal: "2-9-26" },
  { id: 13, nama: "Nadia Pratiwi", kontak: "6281521706045", alasan: "Pindah Rumah", tanggal: "5-9-26" },
  { id: 14, nama: "Rafiqy Hafid", kontak: "62895372694913", alasan: "Pindah ke Wifi lain", tanggal: "9-9-26" },
  { id: 15, nama: "Fakhri Andira", kontak: "6289509095121", alasan: "Ngelag", tanggal: "11-9-26" },
  { id: 16, nama: "Nafsi Rahmadianto", kontak: "6289508559540", alasan: "Pindah Rumah", tanggal: "18-9-26" },
  { id: 17, nama: "Shofi Kusumawati", kontak: "6283890994577", alasan: "Jarang Dirumah", tanggal: "19-9-26" },
];

// Daftar Gangguan (33 data dari spreadsheet)
export const daftarGangguanList = [
  { id: 1, nama: "Mohammad Yunus", keterangan: "Lelet/Restart", kontak: "6289693923263", tanggalMulai: "21-7-26", followUp: "27-7-26", hasilFU: "" },
  { id: 2, nama: "Yudiansyah (Sri Wanyuni)", keterangan: "Wifi tidak ada Koneksi & modem Hidup mati", kontak: "62895387614776 (6288708219768)", tanggalMulai: "19-7-26", followUp: "27-7-26", hasilFU: "Aman" },
  { id: 3, nama: "Selvi", keterangan: "Online/Tidak ada Konfirmasi", kontak: "6281348688488", tanggalMulai: "22-7-26", followUp: "27-7-26", hasilFU: "Aman" },
  { id: 4, nama: "Syarif Rizal Juffanny", keterangan: "Restart", kontak: "6289625346253", tanggalMulai: "22-7-26", followUp: "27-7-26", hasilFU: "Aman" },
  { id: 5, nama: "Rini Anggraini", keterangan: "Ngelag/Normal Sendiri", kontak: "6281256672629", tanggalMulai: "21-7-26", followUp: "22-7-26", hasilFU: "Aman" },
  { id: 6, nama: "Adib Samudra Putra", keterangan: "Kadang tidak ada Koneksi/Normal Sendiri", kontak: "6285828188924", tanggalMulai: "24-7-26", followUp: "27-7-26", hasilFU: "Bermasalah" },
  { id: 7, nama: "Harul Nia", keterangan: "Tidak bisa masuk/ Online", kontak: "6282353239834", tanggalMulai: "22-7-26", followUp: "24-7-26", hasilFU: "Aman" },
  { id: 8, nama: "Saifullah", keterangan: "Restart/Tidak ada sinyal setelah mati lampu", kontak: "6285813753194", tanggalMulai: "20-7-26", followUp: "20-7-26", hasilFU: "Aman" },
  { id: 9, nama: "Nengsih Ratna Sari", keterangan: "Tidak Ada Sinyal/Restart", kontak: "6285751710793", tanggalMulai: "19-7-26", followUp: "27-7-26", hasilFU: "Aman" },
  { id: 10, nama: "David", keterangan: "Tidak ada sinyal/restart", kontak: "6285348739024", tanggalMulai: "24-7-26", followUp: "27-7-26", hasilFU: "Aman" },
  { id: 11, nama: "Yuyun Rahayu", keterangan: "Lelet/Online", kontak: "62895702373136", tanggalMulai: "24-7-26", followUp: "27-7-26", hasilFU: "Aman" },
  { id: 12, nama: "Teguh Prasetyo", keterangan: "", kontak: "6282274255677", tanggalMulai: "19-7-26", followUp: "27-7-26", hasilFU: "Aman" },
  { id: 13, nama: "Yanti", keterangan: "Tidak Ada Koneksi/Azwar", kontak: "6285787349286", tanggalMulai: "20-7-26", followUp: "27-7-26", hasilFU: "Aman" },
  { id: 14, nama: "Pria Melantika", keterangan: "Tidak Ada Koneksi/Azwar", kontak: "6289510478733", tanggalMulai: "20-7-26", followUp: "27-7-26", hasilFU: "Aman" },
  { id: 15, nama: "Siti Aisyah", keterangan: "Tidak ada jaringan/Azwar", kontak: "62895388276788", tanggalMulai: "21-7-26", followUp: "27-7-26", hasilFU: "Aman" },
  { id: 16, nama: "Iskandar", keterangan: "Wifi tidak Nyambung", kontak: "62895392409708", tanggalMulai: "22-7-26", followUp: "28-7-26", hasilFU: "Aman" },
  { id: 17, nama: "Nuraini", keterangan: "1 Hp tidak ada jaringan", kontak: "", tanggalMulai: "22-7-26", followUp: "", hasilFU: "" },
  { id: 18, nama: "Yuni Wawitri", keterangan: "LOS", kontak: "62823426450005", tanggalMulai: "23-7-26", followUp: "27-7-26", hasilFU: "Aman" },
  { id: 19, nama: "Ira Cantika", keterangan: "Putus nyambung", kontak: "6281250903576", tanggalMulai: "23-7-26", followUp: "27-7-26", hasilFU: "Kadang Ngelag" },
  { id: 20, nama: "Annisa Oktavimanda", keterangan: "Wifi Hidup Mati", kontak: "", tanggalMulai: "20-7-26", followUp: "26-7-26", hasilFU: "Aman" },
  { id: 21, nama: "Yatiman (Feni)", keterangan: "", kontak: "6282253217226 (6287872269376)", tanggalMulai: "20-7-26", followUp: "29-7-26", hasilFU: "" },
  { id: 22, nama: "Angga Purnomo", keterangan: "Tidak Ada Internet", kontak: "6285845833701", tanggalMulai: "20-7-26", followUp: "27-7-26", hasilFU: "Aman" },
  { id: 23, nama: "Muhammad Iqbal Pratama", keterangan: "Lag/lelet", kontak: "6282352275082", tanggalMulai: "20-7-26", followUp: "27-7-26", hasilFU: "Aman" },
  { id: 24, nama: "Rohmatul Wahidah", keterangan: "Tidak Ada Internet/Iqbal", kontak: "6285787080079", tanggalMulai: "21-7-26", followUp: "27-7-26", hasilFU: "Aman" },
  { id: 25, nama: "Mulyadi", keterangan: "LOS/Iqbal", kontak: "6281257545738", tanggalMulai: "23-7-26", followUp: "27-7-26", hasilFU: "Aman" },
  { id: 26, nama: "Meniaty Sianturi", keterangan: "Lampu Modem Tidak Hidup", kontak: "6281345356750", tanggalMulai: "24-7-26", followUp: "29-7-26", hasilFU: "Aman" },
  { id: 27, nama: "Indah Sari", keterangan: "Tidak ada Koneksi/restart", kontak: "6289693354123", tanggalMulai: "26-7-26", followUp: "31-07-26", hasilFU: "Aman" },
  { id: 28, nama: "Andrean Putra Pratama", keterangan: "Tidak Ada Koneksi/dijadwalkan Gatra", kontak: "6281253524425", tanggalMulai: "26-7-26", followUp: "", hasilFU: "" },
  { id: 29, nama: "Aisyah Said", keterangan: "Ngelag/Dijadwalkan Iqbal", kontak: "6281253524425", tanggalMulai: "27-7-26", followUp: "30-7-26", hasilFU: "" },
  { id: 30, nama: "Adib Samudra Putra", keterangan: "Internet Putus Nyambung", kontak: "6285828188924", tanggalMulai: "27-7-26", followUp: "30-7-26", hasilFU: "Aman" },
  { id: 31, nama: "Ibrahim", keterangan: "wifi tidak bisa dipakai setelah bayar", kontak: "62895393227072", tanggalMulai: "27-7-26", followUp: "31-7-26", hasilFU: "Aman" },
  { id: 32, nama: "Gugus Aldy Satryawan", keterangan: "gangguan tidak ada lampu merah", kontak: "628125660193", tanggalMulai: "29-7-26", followUp: "3-8-26", hasilFU: "Aman" },
  { id: 33, nama: "Yulianti", keterangan: "LOS/Iqbal", kontak: "6281345199946", tanggalMulai: "29-7-26", followUp: "3-8-26", hasilFU: "Aman" },
];

// ODP/ODC LOS (dari spreadsheet)
export const odpOdcList = [
  // ODC 1
  { id: 1, odc: "ODC 1", nama: "ODP 1.2 - M. Sarno", keterangan: "Sudah Diperbaiki/Azwar", status: "Diperbaiki" },
  { id: 2, odc: "ODC 1", nama: "ODP 1.6 - Mildayanti", keterangan: "", status: "" },
  { id: 3, odc: "ODC 1", nama: "ODP 1.7 - Ani Febriyanti", keterangan: "Aman", status: "Aman" },
  // ODC 2
  { id: 4, odc: "ODC 2", nama: "ODP 2.4 - Alfian Azis P", keterangan: "Aman", status: "Aman" },
  // ODC 3
  { id: 5, odc: "ODC 3", nama: "ODP 3.5 - Selvi Sushanti", keterangan: "Aman", status: "Aman" },
  { id: 6, odc: "ODC 3", nama: "ODP 3.7 - Muhammad Arifin 2", keterangan: "", status: "" },
  // ODC 4
  { id: 7, odc: "ODC 4", nama: "ODP 4.8 - Sanyabi", keterangan: "Aman", status: "Aman" },
  // ODC 6
  { id: 8, odc: "ODC 6", nama: "ODP 6.2 - Nuryani", keterangan: "", status: "" },
  // ODC 7
  { id: 9, odc: "ODC 7", nama: "ODP 7.1 - Tiko Arnesto Junio", keterangan: "", status: "" },
  // ODC 8
  { id: 10, odc: "ODC 8", nama: "ODP 8.3 - Iwan Hermawan", keterangan: "Aman", status: "Aman" },
  // ODC 11
  { id: 11, odc: "ODC 11", nama: "ODP 11.8 Hafizha Nurazizah AZ", keterangan: "", status: "" },
  { id: 12, odc: "ODC 11", nama: "ODP 11.3 Didik Eko Cahyono", keterangan: "", status: "" },
  { id: 13, odc: "ODC 11", nama: "ODP 11.3 Rizka Andriana S", keterangan: "Aman", status: "Aman" },
  { id: 14, odc: "ODC 11", nama: "ODP 11.2 - Kusnadin", keterangan: "Aman", status: "Aman" },
  // ODC 12
  { id: 15, odc: "ODC 12", nama: "ODP 12.7 - Adi Gunawan", keterangan: "Aman", status: "Aman" },
  { id: 16, odc: "ODC 12", nama: "ODP 12.4 - Eko Supriadi", keterangan: "", status: "" },
  // ODC 23
  { id: 17, odc: "ODC 23", nama: "ODP 23.2 Hasbi Andika", keterangan: "Aman", status: "Aman" },
];

export const odcMasterList = [
  { id: "ODC-1", nama: "ODC 1", lokasi: "Jl. Merdeka - Area Gardu 1", kapasitas: "8 Port / 144 Core", keterangan: "Induk Distribusi Utama" },
  { id: "ODC-2", nama: "ODC 2", lokasi: "Jl. Dahlia - Tiang Induk 04", kapasitas: "8 Port / 96 Core", keterangan: "Area Perumahan Dahlia" },
  { id: "ODC-3", nama: "ODC 3", lokasi: "Jl. Sudirman No. 12", kapasitas: "8 Port / 96 Core", keterangan: "Area Komersil Sudirman" },
  { id: "ODC-4", nama: "ODC 4", lokasi: "Jl. Gatot Subroto RT 03", kapasitas: "8 Port / 72 Core", keterangan: "Distribusi Timur" },
  { id: "ODC-6", nama: "ODC 6", lokasi: "Jl. Diponegoro No. 45", kapasitas: "8 Port / 72 Core", keterangan: "Area Pasar Sentral" },
  { id: "ODC-7", nama: "ODC 7", lokasi: "Jl. Pahlawan Blok B", kapasitas: "8 Port / 96 Core", keterangan: "Perumahan Pahlawan" },
  { id: "ODC-8", nama: "ODC 8", lokasi: "Jl. Kenanga Gang 2", kapasitas: "8 Port / 96 Core", keterangan: "Distribusi Barat" },
  { id: "ODC-11", nama: "ODC 11", lokasi: "Jl. Ahmad Yani No. 88", kapasitas: "16 Port / 144 Core", keterangan: "Hub Cluster Ahmad Yani" },
  { id: "ODC-12", nama: "ODC 12", lokasi: "Jl. Melati RT 01/RW 04", kapasitas: "8 Port / 72 Core", keterangan: "Area Permukiman Melati" },
  { id: "ODC-23", nama: "ODC 23", lokasi: "Jl. Imam Bonjol No. 15", kapasitas: "8 Port / 96 Core", keterangan: "Jalur Selatan" },
];
