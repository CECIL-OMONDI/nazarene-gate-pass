-- Replace SECURITY DEFINER view with a normal view (RLS on underlying table still applies)
DROP VIEW IF EXISTS public.v_site_material_usage_totals;
CREATE VIEW public.v_site_material_usage_totals
WITH (security_invoker = true) AS
SELECT site_id, material_id, SUM(quantity)::NUMERIC(14,2) AS total_used
FROM public.material_usage GROUP BY site_id, material_id;

-- Ensure tg_set_updated_at has a fixed search_path
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;