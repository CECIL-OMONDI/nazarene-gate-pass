
-- 1) Tool condition
DO $$ BEGIN
  CREATE TYPE public.tool_condition AS ENUM ('working','broken');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS condition public.tool_condition NOT NULL DEFAULT 'working';

-- 2) Low-stock alerts
CREATE TABLE IF NOT EXISTS public.low_stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open | resolved
  created_by UUID NOT NULL,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alerts_read ON public.low_stock_alerts;
CREATE POLICY alerts_read ON public.low_stock_alerts FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'yard_storekeeper')
    OR created_by = auth.uid()
  );

-- 3) Yard storekeeper read access to site_inventory and tools (cross-site visibility)
DROP POLICY IF EXISTS site_inv_read ON public.site_inventory;
CREATE POLICY site_inv_read ON public.site_inventory FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'yard_storekeeper')
    OR public.is_site_contractor(site_id)
    OR public.is_site_keeper(site_id)
  );

DROP POLICY IF EXISTS tools_read ON public.tools;
CREATE POLICY tools_read ON public.tools FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'yard_storekeeper')
    OR public.is_site_contractor(site_id)
    OR public.is_site_keeper(site_id)
  );

-- 4) RPC: cancel a pending order (yard / admin)
CREATE OR REPLACE FUNCTION public.cancel_pending_order(_order_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'yard_storekeeper')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  PERFORM 1 FROM public.orders WHERE id = _order_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only pending orders can be cancelled'; END IF;
  DELETE FROM public.order_items WHERE order_id = _order_id;
  DELETE FROM public.orders WHERE id = _order_id;
END; $$;

-- 5) RPC: edit a pending order item quantity (yard / admin). 0 removes the line; if no items remain, the order is deleted.
CREATE OR REPLACE FUNCTION public.update_pending_order_item(_item_id UUID, _new_quantity NUMERIC)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _order UUID; _remaining INT;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'yard_storekeeper')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _new_quantity < 0 THEN RAISE EXCEPTION 'Quantity must be >= 0'; END IF;

  SELECT order_id INTO _order FROM public.order_items WHERE id = _item_id;
  IF _order IS NULL THEN RAISE EXCEPTION 'Item not found'; END IF;

  PERFORM 1 FROM public.orders WHERE id = _order AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only pending orders can be edited'; END IF;

  IF _new_quantity = 0 THEN
    DELETE FROM public.order_items WHERE id = _item_id;
  ELSE
    UPDATE public.order_items SET quantity = _new_quantity WHERE id = _item_id;
  END IF;

  SELECT count(*) INTO _remaining FROM public.order_items WHERE order_id = _order;
  IF _remaining = 0 THEN DELETE FROM public.orders WHERE id = _order; END IF;
END; $$;

-- 6) Low-stock alert RPCs
CREATE OR REPLACE FUNCTION public.create_low_stock_alert(_material_id UUID, _message TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'yard_storekeeper')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.low_stock_alerts (material_id, message, created_by)
    VALUES (_material_id, _message, auth.uid())
    RETURNING id INTO _id;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.resolve_low_stock_alert(_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.low_stock_alerts
    SET status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
    WHERE id = _id;
END; $$;

-- 7) Tool condition RPC
CREATE OR REPLACE FUNCTION public.set_tool_condition(_tool_id UUID, _condition public.tool_condition)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _site UUID;
BEGIN
  SELECT site_id INTO _site FROM public.tools WHERE id = _tool_id;
  IF _site IS NULL THEN RAISE EXCEPTION 'Tool not found'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR public.is_site_keeper(_site)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.tools SET condition = _condition, updated_at = now() WHERE id = _tool_id;
END; $$;
