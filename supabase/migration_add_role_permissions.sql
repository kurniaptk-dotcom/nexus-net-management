-- ==============================================================================
-- NEXUS NET MANAGEMENT - MIGRASI ROLE & HAK AKSES MENU (SUPABASE)
-- ==============================================================================
-- Cara menjalankan:
-- 1. Buka Supabase Dashboard > Pilih Proyek Anda
-- 2. Masuk ke menu "SQL Editor" di bilah samping kiri
-- 3. Paste seluruh script ini lalu klik "Run" (tombol hijau)
-- ==============================================================================

-- 1. Lepaskan batasan lama agar kolom role bisa menampung role fleksibel:
--    'admin', 'teknisi', 'cs', 'marketing', 'user', atau custom role lainnya.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Tambahkan kolom allowed_menus (Array Text) untuk menyimpan daftar rute menu yang diizinkan
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allowed_menus text[] DEFAULT ARRAY['/', '/pekerjaan', '/gangguan']::text[];

-- 3. Tambahkan kolom custom_role_title jika admin memberikan nama gelar/jabatan khusus
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_role_title text DEFAULT '';

-- 4. Tambahkan kolom tim untuk penugasan regu teknisi lapangan
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tim text DEFAULT '';

-- 4. Berikan hak akses penuh ke semua akun admin saat ini
UPDATE profiles
SET allowed_menus = ARRAY['/', '/tim', '/pekerjaan', '/leads', '/gangguan', '/odp', '/laporan', '/users']::text[]
WHERE role = 'admin';

-- 5. Berikan hak akses default untuk akun non-admin yang sudah ada
UPDATE profiles
SET allowed_menus = ARRAY['/', '/tim', '/pekerjaan', '/leads', '/gangguan', '/odp', '/laporan']::text[]
WHERE role != 'admin' OR allowed_menus IS NULL;

-- 6. Konfirmasi hasil migrasi
SELECT id, email, full_name, role, allowed_menus FROM profiles ORDER BY created_at ASC;
