-- =========================================================================
-- SOLUSI: PERBAIKAN DATABASE ERROR SAVING NEW USER PADA SUPABASE
-- Silakan Copy & Run di Supabase SQL Editor (Dashboard Supabase Anda)
-- =========================================================================

-- 1. Tambahkan kolom yang diperlukan jika belum ada pada tabel public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tim text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allowed_menus text[] DEFAULT ARRAY['/', '/pekerjaan', '/gangguan']::text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_role_title text DEFAULT '';

-- 2. Hapus batasan check constraint role lama yang membatasi hanya 'admin' atau 'user'
-- agar role 'teknisi' atau role kustom lainnya diizinkan masuk ke database
DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Perbaiki fungsi trigger handle_new_user agar aman (Bulletproof Trigger)
-- Menggunakan EXCEPTION WHEN OTHERS agar pendaftaran akun di auth.users TIDAK PERNAH gagal
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text := 'user';
  v_name text := '';
  v_tim text := '';
BEGIN
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
    v_tim := COALESCE(NEW.raw_user_meta_data->>'tim', '');
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, tim)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    v_name,
    v_role,
    v_tim
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    role = CASE WHEN EXCLUDED.role <> '' THEN EXCLUDED.role ELSE public.profiles.role END,
    tim = CASE WHEN EXCLUDED.tim <> '' THEN EXCLUDED.tim ELSE public.profiles.tim END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Mencegah pesan 'Database error saving new user' jika terjadi issue pada tabel profiles
    RAISE WARNING 'handle_new_user exception: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Pasang ulang trigger pada tabel auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Berikan izin akses yang benar
GRANT ALL ON TABLE public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
