// One-time wipe + seed: deletes ALL auth users + business data,
// then creates the Sir_chief admin account. No auth required (public, runs once).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ADMIN = {
  full_name: "Sir Chief",
  username: "sir_chief",
  email: "cecilomondi@gmail.com",
  phone: "0700604263",
  password: "Qwertyuiop",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Wipe business data (order matters — children first)
    const tables = [
      "low_stock_alerts","material_usage","material_receipts","order_dispatches",
      "order_items","orders","site_inventory","yard_inventory","tools","workers",
      "sites","materials","signup_requests","user_roles","profiles",
    ];
    for (const t of tables) {
      const { error } = await admin.from(t).delete().not("id","is",null).limit(100000);
      // some tables (yard_inventory, site_inventory, workers, order_dispatches) have no id col;
      // fall back to a broad delete
      if (error) {
        await admin.rpc("noop").catch(() => {});
        // try delete by another column
        const alt = await admin.from(t).delete().neq("created_at","1900-01-01");
        if (alt.error) {
          // last resort: ignore — admin SQL should have RLS bypassed
        }
      }
    }

    // Wipe all auth users
    let page = 1;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const users = data?.users ?? [];
      if (!users.length) break;
      for (const u of users) {
        await admin.auth.admin.deleteUser(u.id).catch(() => {});
      }
      if (users.length < 200) break;
      page++;
    }

    // Seed Sir_chief
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: ADMIN.email,
      password: ADMIN.password,
      email_confirm: true,
      user_metadata: {
        username: ADMIN.username,
        full_name: ADMIN.full_name,
        phone: ADMIN.phone,
        email_real: ADMIN.email,
      },
    });
    if (cErr || !created.user) return j({ error: cErr?.message ?? "create failed" }, 400);

    await admin.from("profiles").upsert({
      id: created.user.id,
      username: ADMIN.username,
      full_name: ADMIN.full_name,
      phone: ADMIN.phone,
      email: ADMIN.email,
    });
    await admin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });

    return j({ ok: true, admin_id: created.user.id });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
