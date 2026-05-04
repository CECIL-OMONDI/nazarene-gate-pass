import { supabase } from "@/integrations/supabase/client";

export const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@mbingo.local`;
export const emailToUsername = (e: string | null | undefined) =>
  e ? e.replace(/@mbingo\.local$/i, "") : "";

export async function signInWithUsername(username: string, password: string) {
  const email = usernameToEmail(username);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}
