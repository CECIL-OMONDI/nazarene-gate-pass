-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin','yard_storekeeper','contractor','site_storekeeper');
CREATE TYPE public.order_status AS ENUM ('pending','dispatched','received','cancelled');

-- =========================
-- UPDATED_AT TRIGGER FUNCTION
-- =========================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================
-- USER ROLES
-- =========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_user_roles()
RETURNS SETOF public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid();
$$;

-- =========================
-- MATERIALS CATALOG
-- =========================
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, unit)
);
CREATE TRIGGER trg_materials_upd BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- =========================
-- SITES
-- =========================
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  contractor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  site_keeper_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sites_contractor ON public.sites(contractor_id);
CREATE INDEX idx_sites_keeper ON public.sites(site_keeper_id);
CREATE TRIGGER trg_sites_upd BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- helpers for site-based access
CREATE OR REPLACE FUNCTION public.is_site_contractor(_site_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sites WHERE id = _site_id AND contractor_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_site_keeper(_site_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sites WHERE id = _site_id AND site_keeper_id = auth.uid());
$$;

-- =========================
-- YARD INVENTORY
-- =========================
CREATE TABLE public.yard_inventory (
  material_id UUID PRIMARY KEY REFERENCES public.materials(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_yard_upd BEFORE UPDATE ON public.yard_inventory
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
ALTER TABLE public.yard_inventory ENABLE ROW LEVEL SECURITY;

-- =========================
-- SITE INVENTORY
-- =========================
CREATE TABLE public.site_inventory (
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, material_id)
);
CREATE INDEX idx_site_inv_site ON public.site_inventory(site_id);
CREATE TRIGGER trg_site_inv_upd BEFORE UPDATE ON public.site_inventory
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
ALTER TABLE public.site_inventory ENABLE ROW LEVEL SECURITY;

-- =========================
-- TOOLS (per site)
-- =========================
CREATE TABLE public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id, name)
);
CREATE INDEX idx_tools_site ON public.tools(site_id);
CREATE TRIGGER trg_tools_upd BEFORE UPDATE ON public.tools
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

-- =========================
-- WORKERS (per site)
-- =========================
CREATE TABLE public.workers (
  site_id UUID PRIMARY KEY REFERENCES public.sites(id) ON DELETE CASCADE,
  skilled_count INTEGER NOT NULL DEFAULT 0 CHECK (skilled_count >= 0),
  unskilled_count INTEGER NOT NULL DEFAULT 0 CHECK (unskilled_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_workers_upd BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- =========================
-- ORDERS
-- =========================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status public.order_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispatched_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  dispatched_by UUID REFERENCES auth.users(id),
  received_by UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_orders_site ON public.orders(site_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_contractor ON public.orders(contractor_id);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,2) NOT NULL CHECK (quantity > 0),
  UNIQUE (order_id, material_id)
);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_dispatches (
  order_id UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  vehicle TEXT,
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_dispatches ENABLE ROW LEVEL SECURITY;

-- =========================
-- USAGE & RECEIPTS
-- =========================
CREATE TABLE public.material_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,2) NOT NULL CHECK (quantity > 0),
  used_on DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_usage_site_mat ON public.material_usage(site_id, material_id);
ALTER TABLE public.material_usage ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.material_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,2) NOT NULL CHECK (quantity > 0),
  supplier TEXT,
  received_by UUID NOT NULL REFERENCES auth.users(id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);
CREATE INDEX idx_receipts_mat ON public.material_receipts(material_id);
ALTER TABLE public.material_receipts ENABLE ROW LEVEL SECURITY;

-- =========================
-- RLS POLICIES
-- =========================

-- profiles: anyone authenticated can read (so dropdowns work for admins/contractors); only owner or admin can update
CREATE POLICY "profiles_read_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_admin_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR id = auth.uid());
CREATE POLICY "profiles_admin_delete" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- user_roles: readable by self and admins; only admins write
CREATE POLICY "roles_read_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_admin_write" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_admin_delete" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- materials: all authenticated read; only admin write
CREATE POLICY "materials_read" ON public.materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "materials_admin_ins" ON public.materials FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "materials_admin_upd" ON public.materials FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "materials_admin_del" ON public.materials FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- sites: admin all; contractor sees own; site keeper sees own; yard sk sees all (for routing)
CREATE POLICY "sites_read" ON public.sites FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'yard_storekeeper')
  OR contractor_id = auth.uid()
  OR site_keeper_id = auth.uid()
);
CREATE POLICY "sites_admin_write" ON public.sites FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "sites_admin_upd" ON public.sites FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "sites_admin_del" ON public.sites FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- yard_inventory: admin/yard_sk/contractor read; only admin direct writes (RPCs use SECURITY DEFINER to bypass)
CREATE POLICY "yard_read" ON public.yard_inventory FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'yard_storekeeper')
  OR public.has_role(auth.uid(),'contractor')
);
CREATE POLICY "yard_admin_write" ON public.yard_inventory FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- site_inventory: admin all; contractor of site read; site keeper of site read; yard sk read
CREATE POLICY "site_inv_read" ON public.site_inventory FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'yard_storekeeper')
  OR public.is_site_contractor(site_id)
  OR public.is_site_keeper(site_id)
);
CREATE POLICY "site_inv_admin_write" ON public.site_inventory FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- tools: contractor of site full crud; site keeper read; admin all
CREATE POLICY "tools_read" ON public.tools FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR public.is_site_contractor(site_id)
  OR public.is_site_keeper(site_id)
);
CREATE POLICY "tools_contractor_ins" ON public.tools FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.is_site_contractor(site_id)
);
CREATE POLICY "tools_contractor_upd" ON public.tools FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.is_site_contractor(site_id)
);
CREATE POLICY "tools_contractor_del" ON public.tools FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.is_site_contractor(site_id)
);

-- workers
CREATE POLICY "workers_read" ON public.workers FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR public.is_site_contractor(site_id)
  OR public.is_site_keeper(site_id)
);
CREATE POLICY "workers_contractor_write" ON public.workers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.is_site_contractor(site_id))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.is_site_contractor(site_id));

-- orders
CREATE POLICY "orders_read" ON public.orders FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'yard_storekeeper')
  OR contractor_id = auth.uid()
  OR public.is_site_keeper(site_id)
);
CREATE POLICY "orders_contractor_ins" ON public.orders FOR INSERT TO authenticated WITH CHECK (
  contractor_id = auth.uid() AND public.is_site_contractor(site_id)
);
-- updates only via RPC (no direct UPDATE policy except admin)
CREATE POLICY "orders_admin_upd" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders_admin_del" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "order_items_read" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'yard_storekeeper')
    OR o.contractor_id = auth.uid()
    OR public.is_site_keeper(o.site_id)
  ))
);
CREATE POLICY "order_items_contractor_ins" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.contractor_id = auth.uid() AND o.status = 'pending')
);
CREATE POLICY "order_items_contractor_del" ON public.order_items FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.contractor_id = auth.uid() AND o.status = 'pending')
);

CREATE POLICY "dispatches_read" ON public.order_dispatches FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'yard_storekeeper')
    OR o.contractor_id = auth.uid()
    OR public.is_site_keeper(o.site_id)
  ))
);
-- writes only through RPC

-- usage
CREATE POLICY "usage_read" ON public.material_usage FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR public.is_site_contractor(site_id)
  OR public.is_site_keeper(site_id)
);
-- writes through RPC

-- receipts
CREATE POLICY "receipts_read" ON public.material_receipts FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'yard_storekeeper')
);
-- writes through RPC

-- =========================
-- RPCs
-- =========================

-- Restock yard (admin only): adds quantity, logs receipt
CREATE OR REPLACE FUNCTION public.restock_yard(_material_id UUID, _quantity NUMERIC, _supplier TEXT DEFAULT NULL, _notes TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only admin can restock yard'; END IF;
  IF _quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;

  INSERT INTO public.yard_inventory (material_id, quantity)
    VALUES (_material_id, _quantity)
    ON CONFLICT (material_id) DO UPDATE SET quantity = public.yard_inventory.quantity + EXCLUDED.quantity, updated_at = now();

  INSERT INTO public.material_receipts (material_id, quantity, supplier, received_by, notes)
    VALUES (_material_id, _quantity, _supplier, auth.uid(), _notes);
END; $$;

-- Dispatch order (yard storekeeper or admin): deducts yard stock atomically
CREATE OR REPLACE FUNCTION public.dispatch_order(_order_id UUID, _driver TEXT, _plate TEXT, _vehicle TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row RECORD;
BEGIN
  IF NOT (public.has_role(auth.uid(),'yard_storekeeper') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Not authorized to dispatch';
  END IF;

  PERFORM 1 FROM public.orders WHERE id = _order_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found or not pending'; END IF;

  -- Lock relevant yard rows and validate stock
  FOR _row IN SELECT oi.material_id, oi.quantity FROM public.order_items oi WHERE oi.order_id = _order_id LOOP
    PERFORM 1 FROM public.yard_inventory WHERE material_id = _row.material_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Material % not in yard', _row.material_id; END IF;
    IF (SELECT quantity FROM public.yard_inventory WHERE material_id = _row.material_id) < _row.quantity THEN
      RAISE EXCEPTION 'Insufficient yard stock for material %', _row.material_id;
    END IF;
  END LOOP;

  -- Deduct
  FOR _row IN SELECT oi.material_id, oi.quantity FROM public.order_items oi WHERE oi.order_id = _order_id LOOP
    UPDATE public.yard_inventory SET quantity = quantity - _row.quantity, updated_at = now()
      WHERE material_id = _row.material_id;
  END LOOP;

  INSERT INTO public.order_dispatches (order_id, driver_name, plate_number, vehicle)
    VALUES (_order_id, _driver, _plate, _vehicle);

  UPDATE public.orders SET status = 'dispatched', dispatched_at = now(), dispatched_by = auth.uid() WHERE id = _order_id;
END; $$;

-- Receive order (site keeper of that site or admin): adds to site inventory
CREATE OR REPLACE FUNCTION public.receive_order(_order_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _site UUID;
  _row RECORD;
BEGIN
  SELECT site_id INTO _site FROM public.orders WHERE id = _order_id AND status = 'dispatched' FOR UPDATE;
  IF _site IS NULL THEN RAISE EXCEPTION 'Order not found or not dispatched'; END IF;

  IF NOT (public.has_role(auth.uid(),'admin') OR public.is_site_keeper(_site)) THEN
    RAISE EXCEPTION 'Not authorized to confirm receipt for this site';
  END IF;

  FOR _row IN SELECT material_id, quantity FROM public.order_items WHERE order_id = _order_id LOOP
    INSERT INTO public.site_inventory (site_id, material_id, quantity)
      VALUES (_site, _row.material_id, _row.quantity)
      ON CONFLICT (site_id, material_id) DO UPDATE
        SET quantity = public.site_inventory.quantity + EXCLUDED.quantity, updated_at = now();
  END LOOP;

  UPDATE public.orders SET status = 'received', received_at = now(), received_by = auth.uid() WHERE id = _order_id;
END; $$;

-- Record usage (site keeper of that site or admin): deducts site inventory
CREATE OR REPLACE FUNCTION public.record_usage(_site_id UUID, _material_id UUID, _quantity NUMERIC, _used_on DATE DEFAULT NULL, _notes TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _avail NUMERIC; BEGIN
  IF _quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR public.is_site_keeper(_site_id)) THEN
    RAISE EXCEPTION 'Not authorized to record usage for this site';
  END IF;

  SELECT quantity INTO _avail FROM public.site_inventory WHERE site_id = _site_id AND material_id = _material_id FOR UPDATE;
  IF _avail IS NULL OR _avail < _quantity THEN RAISE EXCEPTION 'Insufficient site stock'; END IF;

  UPDATE public.site_inventory SET quantity = quantity - _quantity, updated_at = now()
    WHERE site_id = _site_id AND material_id = _material_id;

  INSERT INTO public.material_usage (site_id, material_id, quantity, used_on, recorded_by, notes)
    VALUES (_site_id, _material_id, _quantity, COALESCE(_used_on, CURRENT_DATE), auth.uid(), _notes);
END; $$;

-- =========================
-- VIEW: per-site per-material totals used (for dashboards)
-- =========================
CREATE OR REPLACE VIEW public.v_site_material_usage_totals AS
SELECT site_id, material_id, SUM(quantity)::NUMERIC(14,2) AS total_used
FROM public.material_usage GROUP BY site_id, material_id;

-- =========================
-- AUTO PROFILE TRIGGER (if user is created with metadata)
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();