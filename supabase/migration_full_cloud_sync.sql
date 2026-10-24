-- ==============================================================================
-- MIGRATION: FULL CLOUD SYNC & CROSS-DEVICE REALTIME (XNET WIFI MANAGER)
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Pastikan Ekstensi UUID Aktif
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Buat / Lengkapi Tabel 'pelanggan_radius'
CREATE TABLE IF NOT EXISTS pelanggan_radius (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_pelanggan text UNIQUE NOT NULL,
  nama text NOT NULL,
  telepon text,
  alamat text,
  odp text,
  paket text,
  status text DEFAULT 'AKTIF' CHECK (status IN ('BARU', 'AKTIF', 'ISOLIR', 'PUTUS')),
  ip_address text,
  tgl_daftar date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Tambahkan Kolom Lengkap Operasional pada Tabel 'pekerjaan' (Idempotent)
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS odp text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS spk_no text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS prioritas text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS sesi text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS telepon text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS port text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS shareloc text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS redaman text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS sn_modem text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS mac_modem text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS kabel_meter text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS evidence jsonb;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS komisi_items jsonb;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS komisi_total numeric DEFAULT 0;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS waktu_selesai text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS revisi_catatan text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS waktu_lapor text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS cutoff_status text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS cutoff_label text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS foto_bukti_utama text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS foto_bukti_modem text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS foto_bukti_redaman text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS teknisi_list jsonb;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS is_started boolean DEFAULT false;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS waktu_mulai text;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS lng double precision;
ALTER TABLE pekerjaan ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Longgarkan constraint check status pekerjaan jika ada agar mencakup 'MENUNGGU VALIDASI'
DO $$
BEGIN
  ALTER TABLE pekerjaan DROP CONSTRAINT IF EXISTS pekerjaan_status_check;
  ALTER TABLE pekerjaan ADD CONSTRAINT pekerjaan_status_check 
    CHECK (status IN ('WAITING LIST', 'DIJADWALKAN', 'MENUNGGU VALIDASI', 'SELESAI', 'GAGAL'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 4. Set REPLICA IDENTITY FULL Agar Realtime Mengirim Seluruh Data Baris Saat Update/Delete
ALTER TABLE pekerjaan REPLICA IDENTITY FULL;
ALTER TABLE leads REPLICA IDENTITY FULL;
ALTER TABLE gangguan REPLICA IDENTITY FULL;
ALTER TABLE odp_odc REPLICA IDENTITY FULL;
ALTER TABLE tim REPLICA IDENTITY FULL;
ALTER TABLE pengajuan_pemutusan REPLICA IDENTITY FULL;
ALTER TABLE daftar_gangguan REPLICA IDENTITY FULL;
ALTER TABLE pelanggan_radius REPLICA IDENTITY FULL;

-- 5. Daftarkan Semua Tabel Operasional ke Supabase Realtime Publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE pekerjaan;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE leads;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE gangguan;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE odp_odc;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE tim;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE pengajuan_pemutusan;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE daftar_gangguan;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE pelanggan_radius;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 6. Konfigurasi Row Level Security (RLS) Multi-Perangkat (Akses Authenticated & Anon)
-- Memberikan hak akses penuh kepada pengguna yang login (staf kantor / teknisi di lapangan)
-- serta mengizinkan sinkronisasi fallback ketika perangkat sedang transisi sesi / PWA offline.

ALTER TABLE tim ENABLE ROW LEVEL SECURITY;
ALTER TABLE pekerjaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE gangguan ENABLE ROW LEVEL SECURITY;
ALTER TABLE odp_odc ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengajuan_pemutusan ENABLE ROW LEVEL SECURITY;
ALTER TABLE daftar_gangguan ENABLE ROW LEVEL SECURITY;
ALTER TABLE pelanggan_radius ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama agar tidak duplikat/konflik
DROP POLICY IF EXISTS "Allow all on tim" ON tim;
DROP POLICY IF EXISTS "Allow all on pekerjaan" ON pekerjaan;
DROP POLICY IF EXISTS "Allow all on pelanggan_radius" ON pelanggan_radius;
DROP POLICY IF EXISTS "Allow all on leads" ON leads;
DROP POLICY IF EXISTS "Allow all on gangguan" ON gangguan;
DROP POLICY IF EXISTS "Allow all on odp_odc" ON odp_odc;
DROP POLICY IF EXISTS "Allow all on pengajuan_pemutusan" ON pengajuan_pemutusan;
DROP POLICY IF EXISTS "Allow all on daftar_gangguan" ON daftar_gangguan;

DROP POLICY IF EXISTS "Authenticated users can access tim" ON tim;
DROP POLICY IF EXISTS "Authenticated users can access pekerjaan" ON pekerjaan;
DROP POLICY IF EXISTS "Authenticated users can access pelanggan_radius" ON pelanggan_radius;
DROP POLICY IF EXISTS "Authenticated users can access leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can access gangguan" ON gangguan;
DROP POLICY IF EXISTS "Authenticated users can access odp_odc" ON odp_odc;
DROP POLICY IF EXISTS "Authenticated users can access pengajuan_pemutusan" ON pengajuan_pemutusan;
DROP POLICY IF EXISTS "Authenticated users can access daftar_gangguan" ON daftar_gangguan;

DROP POLICY IF EXISTS "Permissive operational access on tim" ON tim;
DROP POLICY IF EXISTS "Permissive operational access on pekerjaan" ON pekerjaan;
DROP POLICY IF EXISTS "Permissive operational access on leads" ON leads;
DROP POLICY IF EXISTS "Permissive operational access on gangguan" ON gangguan;
DROP POLICY IF EXISTS "Permissive operational access on odp_odc" ON odp_odc;
DROP POLICY IF EXISTS "Permissive operational access on pengajuan_pemutusan" ON pengajuan_pemutusan;
DROP POLICY IF EXISTS "Permissive operational access on daftar_gangguan" ON daftar_gangguan;
DROP POLICY IF EXISTS "Permissive operational access on pelanggan_radius" ON pelanggan_radius;

-- Buat policy komprehensif yang mengizinkan authenticated dan anon (public key)
CREATE POLICY "Permissive operational access on tim" 
  ON tim FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permissive operational access on pekerjaan" 
  ON pekerjaan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permissive operational access on leads" 
  ON leads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permissive operational access on gangguan" 
  ON gangguan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permissive operational access on odp_odc" 
  ON odp_odc FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permissive operational access on pengajuan_pemutusan" 
  ON pengajuan_pemutusan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permissive operational access on daftar_gangguan" 
  ON daftar_gangguan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permissive operational access on pelanggan_radius" 
  ON pelanggan_radius FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Selesai! Seluruh tabel sekarang siap menyinkronkan data antar HP Android teknisi dan Komputer Kantor secara realtime.
