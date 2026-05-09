
-- ===== Enums =====
DO $$ BEGIN
  CREATE TYPE public.site_progress AS ENUM ('planning','foundation','walling','roofing','finishing','handover');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.transfer_status AS ENUM ('pending','approved','rejected','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend order_status to include 'cancelled' if not present
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'cancelled';
EXCEPTION WHEN others THEN NULL; END $$;

-- ===== Column additions =====
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS supplier text;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS progress_stage public.site_progress NOT NULL DEFAULT 'planning',
  ADD COLUMN IF NOT EXISTS progress_notes text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid;

-- ===== audit_logs =====
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_label text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity, entity_id);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_read_staff ON public.audit_logs;
CREATE POLICY audit_read_staff ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'engineer'));

-- ===== order_comments =====
CREATE TABLE IF NOT EXISTS public.order_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_comments_order ON public.order_comments (order_id, created_at);
ALTER TABLE public.order_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS oc_read ON public.order_comments;
CREATE POLICY oc_read ON public.order_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_comments.order_id
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'engineer')
         OR public.has_role(auth.uid(),'yard_storekeeper')
         OR o.contractor_id = auth.uid() OR public.is_site_keeper(o.site_id))));
DROP POLICY IF EXISTS oc_insert ON public.order_comments;
CREATE POLICY oc_insert ON public.order_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_comments.order_id
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'engineer')
         OR public.has_role(auth.uid(),'yard_storekeeper')
         OR o.contractor_id = auth.uid() OR public.is_site_keeper(o.site_id))));

-- ===== material_transfers =====
CREATE TABLE IF NOT EXISTS public.material_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_site uuid NOT NULL,
  to_site uuid NOT NULL,
  material_id uuid NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  status public.transfer_status NOT NULL DEFAULT 'pending',
  reason text,
  reject_reason text,
  requested_by uuid NOT NULL,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.material_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mt_read ON public.material_transfers;
CREATE POLICY mt_read ON public.material_transfers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'engineer')
         OR public.is_site_keeper(from_site) OR public.is_site_keeper(to_site)
         OR public.is_site_contractor(from_site) OR public.is_site_contractor(to_site));
CREATE TRIGGER trg_mt_updated BEFORE UPDATE ON public.material_transfers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ===== Quantity sanity trigger =====
CREATE OR REPLACE FUNCTION public.tg_check_order_qty()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.quantity > 100000 THEN
    RAISE EXCEPTION 'Quantity % is unreasonably large (max 100000 per line)', NEW.quantity;
  END IF;
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_order_items_qty ON public.order_items;
CREATE TRIGGER trg_order_items_qty BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_check_order_qty();

-- ===== RPCs =====

-- Cancel a dispatched (or partially_dispatched) order — return goods to yard
CREATE OR REPLACE FUNCTION public.cancel_dispatched_order(_order_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row RECORD; _status order_status;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'yard_storekeeper')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN RAISE EXCEPTION 'Reason required'; END IF;
  SELECT status INTO _status FROM public.orders WHERE id=_order_id FOR UPDATE;
  IF _status IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _status NOT IN ('dispatched','partially_dispatched') THEN
    RAISE EXCEPTION 'Only in-transit orders can be cancelled (current: %)', _status;
  END IF;
  -- return goods
  FOR _row IN SELECT material_id, COALESCE(dispatched_qty, quantity) AS qty
              FROM public.order_items WHERE order_id=_order_id AND COALESCE(dispatched_qty,quantity)>0 LOOP
    INSERT INTO public.yard_inventory (material_id, quantity)
      VALUES (_row.material_id, _row.qty)
      ON CONFLICT (material_id) DO UPDATE
        SET quantity = public.yard_inventory.quantity + EXCLUDED.quantity, updated_at = now();
  END LOOP;
  UPDATE public.orders SET status='cancelled', cancellation_reason=_reason,
         cancelled_at=now(), cancelled_by=auth.uid() WHERE id=_order_id;
END $$;

-- Set site progress
CREATE OR REPLACE FUNCTION public.set_site_progress(_site_id uuid, _stage public.site_progress, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'engineer')
          OR public.is_site_contractor(_site_id)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.sites SET progress_stage=_stage, progress_notes=COALESCE(_notes, progress_notes),
         updated_at=now() WHERE id=_site_id;
END $$;

-- Deactivate / reactivate user (admin only)
CREATE OR REPLACE FUNCTION public.set_user_active(_user_id uuid, _active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.profiles SET is_active=_active, updated_at=now() WHERE id=_user_id;
END $$;

-- Request material transfer (site keeper or contractor of from_site or admin)
CREATE OR REPLACE FUNCTION public.request_material_transfer(
  _from_site uuid, _to_site uuid, _material_id uuid, _quantity numeric, _reason text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _avail numeric;
BEGIN
  IF _from_site = _to_site THEN RAISE EXCEPTION 'Source and destination must differ'; END IF;
  IF _quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR public.is_site_keeper(_from_site)
          OR public.is_site_contractor(_from_site)) THEN
    RAISE EXCEPTION 'Not authorized to request from that site';
  END IF;
  SELECT quantity INTO _avail FROM public.site_inventory
    WHERE site_id=_from_site AND material_id=_material_id;
  IF _avail IS NULL OR _avail < _quantity THEN RAISE EXCEPTION 'Insufficient stock at source'; END IF;
  INSERT INTO public.material_transfers (from_site,to_site,material_id,quantity,reason,requested_by)
    VALUES (_from_site,_to_site,_material_id,_quantity,_reason,auth.uid())
    RETURNING id INTO _id;
  RETURN _id;
END $$;

-- Approve transfer (admin only) — moves stock instantly
CREATE OR REPLACE FUNCTION public.approve_material_transfer(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t RECORD; _avail numeric;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO _t FROM public.material_transfers WHERE id=_id FOR UPDATE;
  IF _t IS NULL THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF _t.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  SELECT quantity INTO _avail FROM public.site_inventory
    WHERE site_id=_t.from_site AND material_id=_t.material_id FOR UPDATE;
  IF _avail IS NULL OR _avail < _t.quantity THEN RAISE EXCEPTION 'Source no longer has enough stock'; END IF;
  UPDATE public.site_inventory SET quantity = quantity - _t.quantity, updated_at=now()
    WHERE site_id=_t.from_site AND material_id=_t.material_id;
  INSERT INTO public.site_inventory (site_id, material_id, quantity)
    VALUES (_t.to_site, _t.material_id, _t.quantity)
    ON CONFLICT (site_id, material_id) DO UPDATE
      SET quantity = public.site_inventory.quantity + EXCLUDED.quantity, updated_at=now();
  UPDATE public.material_transfers SET status='completed', approved_by=auth.uid(), updated_at=now()
    WHERE id=_id;
END $$;

-- Reject transfer (admin only)
CREATE OR REPLACE FUNCTION public.reject_material_transfer(_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.material_transfers SET status='rejected', reject_reason=_reason,
         approved_by=auth.uid(), updated_at=now()
    WHERE id=_id AND status='pending';
END $$;

-- Update last login (called by client after sign-in)
CREATE OR REPLACE FUNCTION public.touch_last_login()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET last_login_at = now() WHERE id = auth.uid();
$$;

-- ===== Generic audit trigger =====
CREATE OR REPLACE FUNCTION public.tg_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _eid uuid; _payload jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _eid := (to_jsonb(OLD)->>'id')::uuid;
    _payload := jsonb_build_object('old', to_jsonb(OLD));
  ELSIF TG_OP = 'INSERT' THEN
    _eid := (to_jsonb(NEW)->>'id')::uuid;
    _payload := jsonb_build_object('new', to_jsonb(NEW));
  ELSE
    _eid := (to_jsonb(NEW)->>'id')::uuid;
    _payload := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, payload)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, _eid, _payload);
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_audit_orders ON public.orders;
CREATE TRIGGER trg_audit_orders AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
DROP TRIGGER IF EXISTS trg_audit_materials ON public.materials;
CREATE TRIGGER trg_audit_materials AFTER INSERT OR UPDATE OR DELETE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
DROP TRIGGER IF EXISTS trg_audit_sites ON public.sites;
CREATE TRIGGER trg_audit_sites AFTER INSERT OR UPDATE OR DELETE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit();
DROP TRIGGER IF EXISTS trg_audit_tools ON public.tools;
CREATE TRIGGER trg_audit_tools AFTER INSERT OR UPDATE OR DELETE ON public.tools
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit();

-- Realtime: enable for orders & order_comments so site keepers/contractors get live updates
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_comments REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.order_comments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
