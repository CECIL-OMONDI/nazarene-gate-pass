// One-time bootstrap: create the first admin user.
// Refuses to run once any admin exists.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { count, error: cErr } = await admin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (cErr) return j({ error: cErr.message }, 500);
    if ((count ?? 0) > 0) return j({ error: "Admin already exists. Bootstrap is disabled." }, 403);

    const body = await req.json().catch(() => ({}));
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const full_name = String(body.full_name ?? "").trim() || username;

    if (!/^[a-z0-9_.-]{3,32}$/.test(username)) return j({ error: "Bad username" }, 400);
    if (password.length < 8) return j({ error: "Password >= 8 chars" }, 400);

    const email = `${username}@mbingo.local`;
    const { data: created, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { username, full_name },
    });
    if (error || !created.user) return j({ error: error?.message ?? "create failed" }, 400);

    await admin.from("profiles").upsert({ id: created.user.id, username, full_name });
    const { error: rErr } = await admin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
    if (rErr) return j({ error: rErr.message }, 500);

    return j({ ok: true, username });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
