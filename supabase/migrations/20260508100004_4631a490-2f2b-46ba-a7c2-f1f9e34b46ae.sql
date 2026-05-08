
-- 1. Materials: pricing + reorder threshold
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS reorder_level numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_price numeric NOT NULL DEFAULT 0;

-- 2. Orders: rejection + delivery notes + new statuses
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'partially_dispatched';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS delivery_notes text,
  ADD COLUMN IF NOT EXISTS received_notes text;

-- 3. Order items: track dispatched qty separately from requested qty
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS dispatched_qty numeric;

-- order_items needs UPDATE policy for yard
DROP POLICY IF EXISTS order_items_yard_upd ON public.order_items;
CREATE POLICY order_items_yard_upd ON public.order_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id
            AND o.status = 'pending')
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'yard_storekeeper'))
  );

-- 4. Tools: under-repair tracking
ALTER TYPE tool_condition ADD VALUE IF NOT EXISTS 'under_repair';
ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS under_repair_count integer NOT NULL DEFAULT 0;

-- 5. Auto low-stock alert trigger
CREATE OR REPLACE FUNCTION public.tg_auto_low_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _level numeric; _name text;
BEGIN
  SELECT reorder_level, name INTO _level, _name FROM public.materials WHERE id = NEW.material_id;
  IF _level IS NULL OR _level <= 0 THEN RETURN NEW; END IF;
  IF NEW.quantity <= _level THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.low_stock_alerts
       WHERE material_id = NEW.material_id AND status = 'open'
    ) THEN
      INSERT INTO public.low_stock_alerts (material_id, message, created_by, status)
      VALUES (NEW.material_id,
              'Auto: yard stock for ' || _name || ' fell to ' || NEW.quantity::text || ' (reorder ≤ ' || _level::text || ')',
              COALESCE(auth.uid(), NEW.material_id), 'open');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS yard_inv_low_stock ON public.yard_inventory;
CREATE TRIGGER yard_inv_low_stock
AFTER INSERT OR UPDATE OF quantity ON public.yard_inventory
FOR EACH ROW EXECUTE FUNCTION public.tg_auto_low_stock();

-- 6. Reject order with reason
CREATE OR REPLACE FUNCTION public.reject_order(_order_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'yard_storekeeper')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN
    RAISE EXCEPTION 'Reason is required';
  END IF;
  PERFORM 1 FROM public.orders WHERE id = _order_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only pending orders can be rejected'; END IF;
  UPDATE public.orders
     SET status = 'rejected', reject_reason = _reason,
         rejected_at = now(), rejected_by = auth.uid()
   WHERE id = _order_id;
END $$;

-- 7. Partial dispatch (uses dispatched_qty per line, deducts only that)
CREATE OR REPLACE FUNCTION public.dispatch_order_partial(
  _order_id uuid, _driver text, _plate text, _vehicle text DEFAULT NULL,
  _delivery_notes text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _row RECORD; _has_short boolean := false; _any_dispatched boolean := false;
BEGIN
  IF NOT (public.has_role(auth.uid(),'yard_storekeeper') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Not authorized to dispatch';
  END IF;
  PERFORM 1 FROM public.orders WHERE id = _order_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not pending'; END IF;

  -- default dispatched_qty = quantity if NULL
  UPDATE public.order_items
     SET dispatched_qty = quantity
   WHERE order_id = _order_id AND dispatched_qty IS NULL;

  -- validate stock and detect partial
  FOR _row IN SELECT material_id, quantity, dispatched_qty FROM public.order_items WHERE order_id = _order_id LOOP
    IF _row.dispatched_qty < 0 THEN RAISE EXCEPTION 'Negative dispatch qty'; END IF;
    IF _row.dispatched_qty > 0 THEN
      _any_dispatched := true;
      PERFORM 1 FROM public.yard_inventory WHERE material_id = _row.material_id FOR UPDATE;
      IF NOT FOUND OR (SELECT quantity FROM public.yard_inventory WHERE material_id = _row.material_id) < _row.dispatched_qty THEN
        RAISE EXCEPTION 'Insufficient yard stock for material %', _row.material_id;
      END IF;
    END IF;
    IF _row.dispatched_qty < _row.quantity THEN _has_short := true; END IF;
  END LOOP;

  IF NOT _any_dispatched THEN RAISE EXCEPTION 'Nothing to dispatch (set at least one line > 0)'; END IF;

  -- deduct
  FOR _row IN SELECT material_id, dispatched_qty FROM public.order_items WHERE order_id = _order_id AND dispatched_qty > 0 LOOP
    UPDATE public.yard_inventory SET quantity = quantity - _row.dispatched_qty, updated_at = now()
      WHERE material_id = _row.material_id;
  END LOOP;

  INSERT INTO public.order_dispatches (order_id, driver_name, plate_number, vehicle)
    VALUES (_order_id, _driver, _plate, _vehicle);

  UPDATE public.orders SET
      status = CASE WHEN _has_short THEN 'partially_dispatched'::order_status ELSE 'dispatched'::order_status END,
      dispatched_at = now(), dispatched_by = auth.uid(),
      delivery_notes = _delivery_notes
   WHERE id = _order_id;
END $$;

-- 8. Confirm receipt with notes (uses dispatched_qty)
CREATE OR REPLACE FUNCTION public.receive_order_v2(_order_id uuid, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _site uuid; _row RECORD;
BEGIN
  SELECT site_id INTO _site FROM public.orders
   WHERE id = _order_id AND status IN ('dispatched','partially_dispatched') FOR UPDATE;
  IF _site IS NULL THEN RAISE EXCEPTION 'Order not in transit'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR public.is_site_keeper(_site)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  FOR _row IN SELECT material_id, COALESCE(dispatched_qty, quantity) AS qty FROM public.order_items
              WHERE order_id = _order_id AND COALESCE(dispatched_qty, quantity) > 0 LOOP
    INSERT INTO public.site_inventory (site_id, material_id, quantity)
      VALUES (_site, _row.material_id, _row.qty)
      ON CONFLICT (site_id, material_id) DO UPDATE
        SET quantity = public.site_inventory.quantity + EXCLUDED.quantity, updated_at = now();
  END LOOP;
  UPDATE public.orders SET status = 'received', received_at = now(),
         received_by = auth.uid(), received_notes = _notes
   WHERE id = _order_id;
END $$;

-- 9. Tool repair lifecycle
CREATE OR REPLACE FUNCTION public.send_tool_for_repair(_tool_id uuid, _count integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _site uuid; _broken int;
BEGIN
  SELECT site_id, broken_count INTO _site, _broken FROM public.tools WHERE id=_tool_id;
  IF _site IS NULL THEN RAISE EXCEPTION 'Tool not found'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR public.is_site_keeper(_site) OR public.is_site_contractor(_site)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _count <= 0 OR _count > _broken THEN RAISE EXCEPTION 'Invalid count (max %)', _broken; END IF;
  UPDATE public.tools
     SET broken_count = broken_count - _count,
         under_repair_count = under_repair_count + _count,
         condition = CASE WHEN broken_count - _count > 0 THEN 'broken'::tool_condition
                          ELSE 'under_repair'::tool_condition END,
         updated_at = now()
   WHERE id = _tool_id;
END $$;

CREATE OR REPLACE FUNCTION public.tool_repaired(_tool_id uuid, _count integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _site uuid; _ur int; _br int;
BEGIN
  SELECT site_id, under_repair_count, broken_count INTO _site, _ur, _br FROM public.tools WHERE id=_tool_id;
  IF _site IS NULL THEN RAISE EXCEPTION 'Tool not found'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR public.is_site_keeper(_site) OR public.is_site_contractor(_site)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _count <= 0 OR _count > _ur THEN RAISE EXCEPTION 'Invalid count (max %)', _ur; END IF;
  UPDATE public.tools
     SET under_repair_count = under_repair_count - _count,
         condition = CASE WHEN _br > 0 THEN 'broken'::tool_condition
                          WHEN under_repair_count - _count > 0 THEN 'under_repair'::tool_condition
                          ELSE 'working'::tool_condition END,
         updated_at = now()
   WHERE id = _tool_id;
END $$;

CREATE OR REPLACE FUNCTION public.write_off_tool(_tool_id uuid, _count integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _site uuid; _br int; _qty int;
BEGIN
  SELECT site_id, broken_count, quantity INTO _site, _br, _qty FROM public.tools WHERE id=_tool_id;
  IF _site IS NULL THEN RAISE EXCEPTION 'Tool not found'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR public.is_site_contractor(_site)) THEN
    RAISE EXCEPTION 'Only admin or contractor may write off tools';
  END IF;
  IF _count <= 0 OR _count > _br THEN RAISE EXCEPTION 'Invalid count (max % broken)', _br; END IF;
  UPDATE public.tools
     SET quantity = quantity - _count,
         broken_count = broken_count - _count,
         condition = CASE WHEN broken_count - _count > 0 THEN 'broken'::tool_condition
                          WHEN under_repair_count > 0 THEN 'under_repair'::tool_condition
                          ELSE 'working'::tool_condition END,
         updated_at = now()
   WHERE id = _tool_id;
END $$;
