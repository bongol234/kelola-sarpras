
-- Enum peran
CREATE TYPE public.app_role AS ENUM ('admin', 'petugas', 'guru', 'kepala_sekolah');
CREATE TYPE public.item_condition AS ENUM ('baik', 'rusak_ringan', 'rusak_berat');
CREATE TYPE public.loan_status AS ENUM ('diajukan', 'disetujui', 'ditolak', 'dipinjam', 'dikembalikan');
CREATE TYPE public.maintenance_status AS ENUM ('terjadwal', 'berlangsung', 'selesai');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "user_roles_select_auth" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger handle_new_user: auto profile + role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  
  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'guru');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Kategori
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_manage" ON public.categories FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'petugas'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'petugas'));

-- Lokasi
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  building TEXT,
  floor TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.locations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "locations_select" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "locations_manage" ON public.locations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'petugas'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'petugas'));

-- Items
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  condition item_condition NOT NULL DEFAULT 'baik',
  quantity INT NOT NULL DEFAULT 1,
  acquisition_date DATE,
  funding_source TEXT,
  asset_value NUMERIC(15,2) DEFAULT 0,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_select" ON public.items FOR SELECT TO authenticated USING (true);
CREATE POLICY "items_manage" ON public.items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'petugas'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'petugas'));

-- Loans (peminjaman + pengembalian dalam satu tabel)
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  borrower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  purpose TEXT,
  loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  return_condition item_condition,
  return_notes TEXT,
  status loan_status NOT NULL DEFAULT 'diajukan',
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loans TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.loans TO authenticated;
GRANT ALL ON public.loans TO service_role;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loans_select_auth" ON public.loans FOR SELECT TO authenticated USING (true);
CREATE POLICY "loans_insert_own" ON public.loans FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = borrower_id);
CREATE POLICY "loans_update_staff" ON public.loans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'petugas'));
CREATE POLICY "loans_delete_staff" ON public.loans FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'petugas'));

-- Maintenance
CREATE TABLE public.maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  description TEXT NOT NULL,
  cost NUMERIC(15,2) DEFAULT 0,
  status maintenance_status NOT NULL DEFAULT 'terjadwal',
  performed_by TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.maintenance_records TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.maintenance_records TO authenticated;
GRANT ALL ON public.maintenance_records TO service_role;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maint_select" ON public.maintenance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "maint_manage" ON public.maintenance_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'petugas'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'petugas'));

-- Asset mutations
CREATE TABLE public.asset_mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  from_location_id UUID REFERENCES public.locations(id),
  to_location_id UUID REFERENCES public.locations(id),
  mutation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.asset_mutations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.asset_mutations TO authenticated;
GRANT ALL ON public.asset_mutations TO service_role;
ALTER TABLE public.asset_mutations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mut_select" ON public.asset_mutations FOR SELECT TO authenticated USING (true);
CREATE POLICY "mut_manage" ON public.asset_mutations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'petugas'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'petugas'));

-- Seed kategori & lokasi awal
INSERT INTO public.categories (name, description) VALUES
  ('Elektronik', 'Perangkat elektronik sekolah'),
  ('Mebel', 'Meja, kursi, lemari'),
  ('Alat Olahraga', 'Peralatan olahraga'),
  ('Alat Laboratorium', 'Peralatan praktikum'),
  ('Buku & Media', 'Buku, media pembelajaran');

INSERT INTO public.locations (name, building, floor) VALUES
  ('Ruang Kelas 1A', 'Gedung A', '1'),
  ('Laboratorium IPA', 'Gedung B', '2'),
  ('Perpustakaan', 'Gedung A', '1'),
  ('Ruang Guru', 'Gedung A', '2'),
  ('Gudang Sarpras', 'Gedung C', '1');
