-- Nexus Net Management - Supabase Schema
-- Jalankan ini di Supabase Dashboard > SQL Editor

-- 1. Tabel Tim
CREATE TABLE IF NOT EXISTS tim (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 2. Tabel Pekerjaan
CREATE TABLE IF NOT EXISTS pekerjaan (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tim text NOT NULL,
  jenis text NOT NULL CHECK (jenis IN ('PEMASANGAN', 'PERBAIKAN', 'PEMUTUSAN', 'PERBAIKAN KHUSUS (ODP/ODC)')),
  alamat text,
  pelanggan text NOT NULL,
  odp text,
  status text NOT NULL DEFAULT 'WAITING LIST' CHECK (status IN ('WAITING LIST', 'DIJADWALKAN', 'SELESAI', 'GAGAL')),
  tanggal date,
  keterangan text,
  created_at timestamptz DEFAULT now()
);

-- 3. Tabel Leads
CREATE TABLE IF NOT EXISTS leads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama text NOT NULL,
  sumber text NOT NULL CHECK (sumber IN ('IKLAN', 'AFFILIATE', 'MARKETING')),
  status text NOT NULL DEFAULT 'BARU' CHECK (status IN ('BARU', 'KONTAK', 'DIJADWALKAN', 'SELESAI')),
  tanggal date,
  telepon text,
  alamat text,
  created_at timestamptz DEFAULT now()
);

-- 4. Tabel Gangguan
CREATE TABLE IF NOT EXISTS gangguan (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tanggal date,
  kategori text NOT NULL,
  pelanggan text,
  alamat text,
  status text DEFAULT 'PROGRESS' CHECK (status IN ('PROGRESS', 'SELESAI')),
  keterangan text,
  user_terdampak int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- 5. Tabel ODP/ODC
CREATE TABLE IF NOT EXISTS odp_odc (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  odc text NOT NULL,
  nama text NOT NULL,
  keterangan text,
  status text DEFAULT '' CHECK (status IN ('', 'Aman', 'Diperbaiki')),
  created_at timestamptz DEFAULT now()
);

-- 6. Tabel Pengajuan Pemutusan
CREATE TABLE IF NOT EXISTS pengajuan_pemutusan (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama text NOT NULL,
  kontak text,
  alasan text,
  tanggal text,
  created_at timestamptz DEFAULT now()
);

-- 7. Tabel Daftar Gangguan (Detail)
CREATE TABLE IF NOT EXISTS daftar_gangguan (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama text NOT NULL,
  keterangan text,
  kontak text,
  tanggal_mulai text,
  follow_up text,
  hasil_fu text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE tim ENABLE ROW LEVEL SECURITY;
ALTER TABLE pekerjaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE gangguan ENABLE ROW LEVEL SECURITY;
ALTER TABLE odp_odc ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengajuan_pemutusan ENABLE ROW LEVEL SECURITY;
ALTER TABLE daftar_gangguan ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all operations for anon (public app)
CREATE POLICY "Allow all on tim" ON tim FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on pekerjaan" ON pekerjaan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on leads" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on gangguan" ON gangguan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on odp_odc" ON odp_odc FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on pengajuan_pemutusan" ON pengajuan_pemutusan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on daftar_gangguan" ON daftar_gangguan FOR ALL USING (true) WITH CHECK (true);

-- Seed data: Tim
INSERT INTO tim (nama) VALUES
  ('GATRA - AIS'),
  ('AZWAR - RIO'),
  ('IQBAL - JUSMAN')
ON CONFLICT (nama) DO NOTHING;

-- Seed data: Pekerjaan (63 records)
INSERT INTO pekerjaan (tim, jenis, alamat, pelanggan, status, tanggal, keterangan) VALUES
  ('GATRA - AIS', 'PEMASANGAN', 'Jl. Merdeka No. 10', 'Ahmad Fauzi', 'SELESAI', '2026-09-01', 'Pemasangan baru RG'),
  ('GATRA - AIS', 'PEMASANGAN', 'Jl. Sudirman No. 25', 'Budi Santoso', 'SELESAI', '2026-09-02', 'Pemasangan ONT'),
  ('GATRA - AIS', 'PERBAIKAN', 'Jl. Gatot Subroto No. 5', 'Dewi Lestari', 'SELESAI', '2026-09-03', 'Ganti kabel fiber'),
  ('AZWAR - RIO', 'PEMASANGAN', 'Jl. Ahmad Yani No. 12', 'Eko Prasetyo', 'SELESAI', '2026-09-01', 'Pemasangan baru'),
  ('AZWAR - RIO', 'PEMASANGAN', 'Jl. Diponegoro No. 8', 'Fitri Handayani', 'WAITING LIST', '2026-09-15', 'Menunggu ODP ready'),
  ('AZWAR - RIO', 'PERBAIKAN', 'Jl. Imam Bonjol No. 3', 'Gunawan Wibisono', 'SELESAI', '2026-09-05', 'Perbaikan redaman'),
  ('IQBAL - JUSMAN', 'PEMASANGAN', 'Jl. Pemuda No. 17', 'Hendra Kurniawan', 'SELESAI', '2026-09-01', 'Pemasangan baru'),
  ('IQBAL - JUSMAN', 'PEMUTUSAN', 'Jl. Kartini No. 22', 'Indah Permata', 'SELESAI', '2026-09-10', 'Putus permintaan pelanggan'),
  ('IQBAL - JUSMAN', 'PERBAIKAN', 'Jl. Cut Nyak Dien No. 9', 'Joko Susilo', 'SELESAI', '2026-09-18', 'Modem rusak diganti'),
  ('GATRA - AIS', 'PEMASANGAN', 'Jl. Diponegoro No. 14', 'Kartika Dewi', 'WAITING LIST', '2026-09-20', 'Menunggu stok ONT'),
  ('GATRA - AIS', 'PEMASANGAN', 'Jl. Veteran No. 7', 'Lukman Hakim', 'SELESAI', '2026-09-04', 'Pemasangan ONT baru'),
  ('GATRA - AIS', 'PEMASANGAN', 'Jl. Panjaitan No. 19', 'Maya Sari', 'SELESAI', '2026-09-06', 'Pemasangan baru RG'),
  ('GATRA - AIS', 'PEMASANGAN', 'Jl. Sisingamangaraja No. 31', 'Nugroho Adi', 'SELESAI', '2026-09-08', 'Instalasi fiber ke rumah'),
  ('GATRA - AIS', 'PEMASANGAN', 'Jl. Teuku Umar No. 4', 'Olivia Putri', 'SELESAI', '2026-09-10', 'Pemasangan paket internet'),
  ('GATRA - AIS', 'PEMASANGAN', 'Jl. Fatmawati No. 28', 'Prabowo Suminto', 'SELESAI', '2026-09-12', 'Pemasangan baru rumah'),
  ('GATRA - AIS', 'PEMASANGAN', 'Jl. Rasuna Said No. 6', 'Ratna Sari', 'SELESAI', '2026-09-14', 'Instalasi ONT di lantai 2'),
  ('GATRA - AIS', 'PERBAIKAN', 'Jl. Sultan Agung No. 11', 'Surya Darma', 'SELESAI', '2026-09-02', 'Perbaikan kabel putus'),
  ('GATRA - AIS', 'PERBAIKAN', 'Jl. Hayam Wuruk No. 23', 'Tina Larasati', 'SELESAI', '2026-09-04', 'Ganti patch cord'),
  ('GATRA - AIS', 'PERBAIKAN', 'Jl. Gajah Mada No. 15', 'Udin Hermawan', 'SELESAI', '2026-09-06', 'Perbaikan redaman tinggi'),
  ('GATRA - AIS', 'PERBAIKAN', 'Jl. Mangkubumi No. 2', 'Vera Anggraini', 'SELESAI', '2026-09-08', 'Reset modem jarak jauh'),
  ('GATRA - AIS', 'PERBAIKAN', 'Jl. Braga No. 18', 'Wahyu Nugroho', 'SELESAI', '2026-09-10', 'Perbaikan konektor SC'),
  ('GATRA - AIS', 'PERBAIKAN', 'Jl. Asia Afrika No. 9', 'Xenia Oktavia', 'SELESAI', '2026-09-12', 'Ganti kabel patch'),
  ('GATRA - AIS', 'PERBAIKAN', 'Jl. Pahlawan No. 13', 'Yoga Pratama', 'SELESAI', '2026-09-14', 'Perbaikan no internet'),
  ('GATRA - AIS', 'PERBAIKAN', 'Jl. Kemerdekaan No. 27', 'Zahra Amalia', 'SELESAI', '2026-09-17', 'Ganti ONT rusak'),
  ('GATRA - AIS', 'PERBAIKAN', 'Jl. Kenari No. 33', 'Andi Saputra', 'SELESAI', '2026-09-20', 'Perbaikan lampu LOS'),
  ('AZWAR - RIO', 'PEMASANGAN', 'Jl. Imam Bonjol No. 21', 'Bayu Firmansyah', 'SELESAI', '2026-09-02', 'Pemasangan baru rumah'),
  ('AZWAR - RIO', 'PEMASANGAN', 'Jl. Kartini No. 5', 'Citra Lestari', 'SELESAI', '2026-09-04', 'Instalasi ONT'),
  ('AZWAR - RIO', 'PEMASANGAN', 'Jl. Cut Nyak Dien No. 16', 'Dimas Prayoga', 'SELESAI', '2026-09-06', 'Pemasangan fiber optik'),
  ('AZWAR - RIO', 'PEMASANGAN', 'Jl. Sudirman No. 40', 'Eka Wulandari', 'SELESAI', '2026-09-08', 'Pemasangan paket rumahan'),
  ('AZWAR - RIO', 'PEMASANGAN', 'Jl. Gatot Subroto No. 29', 'Fajar Ramadhan', 'SELESAI', '2026-09-10', 'Instalasi di apartemen'),
  ('AZWAR - RIO', 'PEMASANGAN', 'Jl. Ahmad Yani No. 37', 'Gita Puspita', 'SELESAI', '2026-09-12', 'Pemasangan baru'),
  ('AZWAR - RIO', 'PEMASANGAN', 'Jl. Diponegoro No. 11', 'Hadi Susanto', 'SELESAI', '2026-09-14', 'Pemasangan ONT baru'),
  ('AZWAR - RIO', 'PERBAIKAN', 'Jl. Pemuda No. 26', 'Ira Setyawati', 'WAITING LIST', '2026-09-25', 'Menunggu spare part'),
  ('AZWAR - RIO', 'PERBAIKAN', 'Jl. Merdeka No. 32', 'Jefri Pratama', 'SELESAI', '2026-09-01', 'Ganti kabel fiber putus'),
  ('AZWAR - RIO', 'PERBAIKAN', 'Jl. Veteran No. 14', 'Kurnia Sandi', 'SELESAI', '2026-09-03', 'Perbaikan redaman'),
  ('AZWAR - RIO', 'PERBAIKAN', 'Jl. Panjaitan No. 22', 'Lestari Dewi', 'SELESAI', '2026-09-05', 'Reset modem remot'),
  ('AZWAR - RIO', 'PERBAIKAN', 'Jl. Sisingamangaraja No. 8', 'Maman Supriatna', 'SELESAI', '2026-09-07', 'Ganti patch cord SC/APC'),
  ('AZWAR - RIO', 'PERBAIKAN', 'Jl. Teuku Umar No. 20', 'Nina Agustina', 'SELESAI', '2026-09-09', 'Perbaikan kabel LAN'),
  ('AZWAR - RIO', 'PERBAIKAN', 'Jl. Fatmawati No. 3', 'Omar Daniel', 'SELESAI', '2026-09-11', 'Ganti splitter rusak'),
  ('AZWAR - RIO', 'PERBAIKAN', 'Jl. Rasuna Said No. 25', 'Putri Rahayu', 'SELESAI', '2026-09-13', 'Perbaikan no signal'),
  ('AZWAR - RIO', 'PERBAIKAN', 'Jl. Sultan Agung No. 7', 'Rizky Aditya', 'SELESAI', '2026-09-15', 'Ganti ONT mati total'),
  ('AZWAR - RIO', 'PERBAIKAN', 'Jl. Hayam Wuruk No. 30', 'Sinta Oktaviani', 'SELESAI', '2026-09-17', 'Perbaikan redaman tinggi'),
  ('AZWAR - RIO', 'PERBAIKAN', 'Jl. Gajah Mada No. 12', 'Tono Widodo', 'SELESAI', '2026-09-19', 'Ganti kabel patch'),
  ('AZWAR - RIO', 'PERBAIKAN', 'Jl. Mangkubumi No. 18', 'Ulya Maghfiroh', 'SELESAI', '2026-09-21', 'Perbaikan konektor'),
  ('AZWAR - RIO', 'PERBAIKAN', 'Jl. Braga No. 9', 'Victor Handoko', 'SELESAI', '2026-09-23', 'Reset ONT dari MDF'),
  ('IQBAL - JUSMAN', 'PEMASANGAN', 'Jl. Salemba No. 11', 'Angga Pratama', 'SELESAI', '2026-09-02', 'Pemasangan baru'),
  ('IQBAL - JUSMAN', 'PEMASANGAN', 'Jl. Kramat Raya No. 8', 'Bella Anastasia', 'SELESAI', '2026-09-04', 'Instalasi ONT'),
  ('IQBAL - JUSMAN', 'PEMASANGAN', 'Jl. Matraman No. 23', 'Cahyo Nugroho', 'SELESAI', '2026-09-06', 'Pemasangan fiber'),
  ('IQBAL - JUSMAN', 'PEMASANGAN', 'Jl. Pegangsaan Timur No. 15', 'Dian Permata', 'SELESAI', '2026-09-08', 'Pemasangan baru rumah'),
  ('IQBAL - JUSMAN', 'PEMASANGAN', 'Jl. Cikini Raya No. 7', 'Eko Wahyudi', 'SELESAI', '2026-09-10', 'Instalasi paket internet'),
  ('IQBAL - JUSMAN', 'PEMASANGAN', 'Jl. Setiabudi No. 19', 'Fitriani Utami', 'SELESAI', '2026-09-12', 'Pemasangan di ruko'),
  ('IQBAL - JUSMAN', 'PEMASANGAN', 'Jl. Thamrin No. 26', 'Gilang Ramadhan', 'SELESAI', '2026-09-14', 'Pemasangan ONT'),
  ('IQBAL - JUSMAN', 'PEMASANGAN', 'Jl. Kuningan No. 12', 'Hana Yulianti', 'SELESAI', '2026-09-16', 'Instalasi baru koneksi'),
  ('IQBAL - JUSMAN', 'PERBAIKAN', 'Jl. Casablanca No. 34', 'Irfan Hakimi', 'SELESAI', '2026-09-01', 'Ganti kabel patch'),
  ('IQBAL - JUSMAN', 'PERBAIKAN', 'Jl. TB Simatupang No. 9', 'Julia Rahmawati', 'SELESAI', '2026-09-03', 'Perbaikan redaman'),
  ('IQBAL - JUSMAN', 'PERBAIKAN', 'Jl. Ampera No. 17', 'Kevin Sanjaya', 'SELESAI', '2026-09-05', 'Reset modem dari OLT'),
  ('IQBAL - JUSMAN', 'PERBAIKAN', 'Jl. Ragunan No. 22', 'Lia Agustina', 'SELESAI', '2026-09-07', 'Ganti splitter'),
  ('IQBAL - JUSMAN', 'PERBAIKAN', 'Jl. Darsono No. 5', 'M Riski Pratama', 'SELESAI', '2026-09-09', 'Perbaikan no internet'),
  ('IQBAL - JUSMAN', 'PERBAIKAN', 'Jl. Bulungan No. 13', 'Nanda Wijaya', 'SELESAI', '2026-09-11', 'Ganti ONT rusak'),
  ('IQBAL - JUSMAN', 'PERBAIKAN', 'Jl. Wijaya No. 28', 'Olivia Chen', 'SELESAI', '2026-09-13', 'Perbaikan kabel putus'),
  ('IQBAL - JUSMAN', 'PERBAIKAN', 'Jl. Radio Dalam No. 3', 'Prasetyo Utomo', 'SELESAI', '2026-09-15', 'Ganti patch cord SC'),
  ('IQBAL - JUSMAN', 'PERBAIKAN', 'Jl. Lebak Bulus No. 10', 'Rina Wulandari', 'SELESAI', '2026-09-17', 'Perbaikan lampu LOS'),
  ('IQBAL - JUSMAN', 'PEMUTUSAN', 'Jl. Kemang No. 16', 'Satria Nugraha', 'WAITING LIST', '2026-09-26', 'Menunggu konfirmasi pelanggan');

-- Seed data: Leads
INSERT INTO leads (nama, sumber, status, tanggal, telepon, alamat) VALUES
  ('Rina Marlina', 'IKLAN', 'BARU', '2026-09-01', '081234567890', 'Jl. Baru No. 1'),
  ('Tono Sugiarto', 'AFFILIATE', 'KONTAK', '2026-09-03', '081234567891', 'Jl. Lama No. 2'),
  ('Siti Nurhaliza', 'MARKETING', 'DIJADWALKAN', '2026-09-05', '081234567892', 'Jl. Tengah No. 3'),
  ('Andi Wijaya', 'IKLAN', 'SELESAI', '2026-09-02', '081234567893', 'Jl. Utama No. 4'),
  ('Maya Anggraeni', 'AFFILIATE', 'BARU', '2026-09-08', '081234567894', 'Jl. Pahlawan No. 5');

-- Seed data: Gangguan
INSERT INTO gangguan (tanggal, kategori, pelanggan, alamat, status, keterangan, user_terdampak) VALUES
  ('2026-09-02', 'Kabel Putus', 'Budi Santoso', 'Jl. Sudirman No. 25', 'SELESAI', 'Kabel putus karena pohon tumbang', 4),
  ('2026-09-05', 'Modem', 'Eko Prasetyo', 'Jl. Ahmad Yani No. 12', 'SELESAI', 'Modem mati total', 1),
  ('2026-09-08', 'Redaman Tinggi', 'Dewi Lestari', 'Jl. Gatot Subroto No. 5', 'PROGRESS', 'Redaman > 25dB', 3),
  ('2026-09-10', 'No Internet', 'Fitri Handayani', 'Jl. Diponegoro No. 8', 'SELESAI', 'Gangguan upstream', 1),
  ('2026-09-11', 'Modem', 'Rina Wulandari', 'Jl. Imam Bonjol No. 31', 'SELESAI', 'Modem overheating', 2),
  ('2026-09-11', 'Modem', 'Agus Setiawan', 'Jl. Hayam Wuruk No. 17', 'PROGRESS', 'Modem restart terus menerus', 3),
  ('2026-09-12', 'Kabel Putus', 'Siti Nurhaliza', 'Jl. Gajah Mada No. 44', 'SELESAI', 'Kabel fiber dipotong saat renovasi', 6),
  ('2026-09-13', 'Modem', 'Hendra Kusuma', 'Jl. Pahlawan No. 9', 'SELESAI', 'Modem tidak sync', 1),
  ('2026-09-13', 'Modem', 'Yanti Susanti', 'Jl. Kenanga No. 22', 'SELESAI', 'Modem lambat', 2),
  ('2026-09-14', 'Redaman Tinggi', 'Andi Cahyono', 'Jl. Melati No. 3', 'SELESAI', 'Redaman 28dB, splice required', 4),
  ('2026-09-15', 'Modem', 'Putri Rahayu', 'Jl. Cendana No. 11', 'PROGRESS', 'Modem ada warning PON', 2),
  ('2026-09-16', 'Modem', 'Rudi Hartono', 'Jl. Jendral Sudirman No. 56', 'SELESAI', 'Modem perlu replace', 1),
  ('2026-09-17', 'Modem', 'Maya Anggraeni', 'Jl. Pemuda No. 28', 'SELESAI', 'Modem LOS merah', 3),
  ('2026-09-17', 'Kabel Putus', 'Dodi Firmansyah', 'Jl. Bangunan No. 15', 'SELESAI', 'Kabel putus akibat proyek jalan', 5),
  ('2026-09-18', 'Modem', 'Wati Sumarni', 'Jl. Anggrek No. 7', 'PROGRESS', 'Modem belum konfigurasi', 1),
  ('2026-09-19', 'Modem', 'Fajar Nugroho', 'Jl. Merdeka No. 40', 'SELESAI', 'Modem firmware corrupt', 2),
  ('2026-09-20', 'Redaman Tinggi', 'Lina Marlina', 'Jl. Teuku Umar No. 19', 'PROGRESS', 'Redaman 30dB, joint box rusak', 6),
  ('2026-09-20', 'Modem', 'Bambang Priyono', 'Jl. Veteran No. 13', 'SELESAI', 'Modem hang', 1),
  ('2026-09-21', 'Modem', 'Ratna Sari', 'Jl. Flamboyan No. 26', 'SELESAI', 'Modem power supply rusak', 2),
  ('2026-09-22', 'Kabel Putus', 'Tono Sugiarto', 'Jl. Jambu No. 33', 'SELESAI', 'Kabel putus karena kucing', 3);

-- Seed data: ODP/ODC
INSERT INTO odp_odc (odc, nama, keterangan, status) VALUES
  ('ODC 1', 'ODP 1.2 - M. Sarno', 'Sudah Diperbaiki/Azwar', 'Diperbaiki'),
  ('ODC 1', 'ODP 1.6 - Mildayanti', '', ''),
  ('ODC 1', 'ODP 1.7 - Ani Febriyanti', 'Aman', 'Aman'),
  ('ODC 2', 'ODP 2.4 - Alfian Azis P', 'Aman', 'Aman'),
  ('ODC 3', 'ODP 3.5 - Selvi Sushanti', 'Aman', 'Aman'),
  ('ODC 3', 'ODP 3.7 - Muhammad Arifin 2', '', ''),
  ('ODC 4', 'ODP 4.8 - Sanyabi', 'Aman', 'Aman'),
  ('ODC 6', 'ODP 6.2 - Nuryani', '', ''),
  ('ODC 7', 'ODP 7.1 - Tiko Arnesto Junio', '', ''),
  ('ODC 8', 'ODP 8.3 - Iwan Hermawan', 'Aman', 'Aman'),
  ('ODC 11', 'ODP 11.8 Hafizha Nurazizah AZ', '', ''),
  ('ODC 11', 'ODP 11.3 Didik Eko Cahyono', '', ''),
  ('ODC 11', 'ODP 11.3 Rizka Andriana S', 'Aman', 'Aman'),
  ('ODC 11', 'ODP 11.2 - Kusnadin', 'Aman', 'Aman'),
  ('ODC 12', 'ODP 12.7 - Adi Gunawan', 'Aman', 'Aman'),
  ('ODC 12', 'ODP 12.4 - Eko Supriadi', '', ''),
  ('ODC 23', 'ODP 23.2 Hasbi Andika', 'Aman', 'Aman');
