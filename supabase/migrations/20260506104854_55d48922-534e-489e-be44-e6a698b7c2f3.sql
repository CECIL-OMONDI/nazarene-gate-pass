
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS broken_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.set_tool_broken_count(_tool_id uuid, _broken integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _site uuid; _qty int;
BEGIN
  SELECT site_id, quantity INTO _site, _qty FROM public.tools WHERE id = _tool_id;
  IF _site IS NULL THEN RAISE EXCEPTION 'Tool not found'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR public.is_site_keeper(_site)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _broken < 0 OR _broken > _qty THEN
    RAISE EXCEPTION 'Broken count must be between 0 and %', _qty;
  END IF;
  UPDATE public.tools
    SET broken_count = _broken,
        condition = CASE WHEN _broken > 0 THEN 'broken'::tool_condition ELSE 'working'::tool_condition END,
        updated_at = now()
    WHERE id = _tool_id;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_low_stock_alert(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  DELETE FROM public.low_stock_alerts WHERE id = _id;
END; $$;
