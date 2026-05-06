
-- Public RPC: returns the auth email for a given phone (used by login form).
-- We store auth email = real email if given at signup, else synthetic <phone>@mbingo.local.
CREATE OR REPLACE FUNCTION public.lookup_login_email(_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id UUID; _email TEXT;
BEGIN
  SELECT id INTO _id FROM public.profiles WHERE phone = _phone LIMIT 1;
  IF _id IS NULL THEN RETURN NULL; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _id;
  RETURN _email;
END; $$;

GRANT EXECUTE ON FUNCTION public.lookup_login_email(TEXT) TO anon, authenticated;
