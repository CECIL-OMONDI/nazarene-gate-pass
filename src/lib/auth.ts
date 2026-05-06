import { supabase } from "@/integrations/supabase/client";

/** Look up the auth email for a phone number, then sign in. */
export async function signInWithPhone(phone: string, password: string) {
  const { data: email, error: lookupErr } = await supabase.rpc("lookup_login_email", { _phone: phone.trim() });
  if (lookupErr) throw lookupErr;
  if (!email) throw new Error("No account found for that phone number");
  const { data, error } = await supabase.auth.signInWithPassword({ email: email as string, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}
