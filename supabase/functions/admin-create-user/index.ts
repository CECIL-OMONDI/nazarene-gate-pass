// Admin-only edge function to create a new user (contractor / yard_storekeeper / site_storekeeper)
// using a username + password. Stores synthetic email so Supabase Auth works.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

const ALLOWED_ROLES = new Set([
  "contractor",
  "yard_storekeeper",
  "site_storekeeper",
  "admin",
]);

function emailFromUsername(u: string) {
  return `${u.trim().toLowerCase()}@mbingo.local`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing auth" }, 401);
    }

    // Verify caller is admin
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const full_name = String(body.full_name ?? "").trim();
    const phone = body.phone ? String(body.phone).trim() : null;
    const role = String(body.role ?? "");

    if (!/^[a-z0-9_.-]{3,32}$/.test(username))
      return json({ error: "Username must be 3-32 chars: a-z 0-9 . _ -" }, 400);
    if (password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
    if (full_name.length < 2) return json({ error: "Full name required" }, 400);
    if (!ALLOWED_ROLES.has(role)) return json({ error: "Invalid role" }, 400);

    // username collision check
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (existing) return json({ error: "Username already taken" }, 409);

    const email = emailFromUsername(username);
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, full_name, phone },
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? "Failed to create user" }, 400);
    }

    // Profile is created by trigger; ensure values are correct
    await admin.from("profiles").upsert({
      id: created.user.id,
      username,
      full_name,
      phone,
    });

    // Assign role
    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: created.user.id, role });
    if (roleErr) {
      return json({ error: `User created but role failed: ${roleErr.message}` }, 500);
    }

    return json({ ok: true, user_id: created.user.id, username });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
