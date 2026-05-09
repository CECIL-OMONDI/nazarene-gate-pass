// Admin/engineer-only: approve or reject a pending signup request.
// On approve: creates the auth user with a one-time temporary password,
// returns the temp password so the admin can share it. The user must change it
// after first login (or via Forgot Password if they provided an email).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

function genTempPassword(): string {
  // 12-char password: letters + digits, no ambiguous chars
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return j({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u.user) return j({ error: "Invalid session" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    const isStaff = (roleRows ?? []).some((r) => r.role === "admin" || r.role === "engineer");
    if (!isStaff) return j({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? "");
    const action = String(body.action ?? "");
    if (!id || !["approve","reject"].includes(action)) return j({ error: "Bad request" }, 400);

    const { data: reqRow, error: rErr } = await admin.from("signup_requests").select("*").eq("id", id).maybeSingle();
    if (rErr || !reqRow) return j({ error: "Request not found" }, 404);
    if (reqRow.status !== "pending") return j({ error: "Already processed" }, 409);

    if (action === "reject") {
      await admin.from("signup_requests").update({
        status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: u.user.id,
        reject_reason: body.reason ? String(body.reason) : null,
      }).eq("id", id);
      return j({ ok: true });
    }

    // approve → generate temp password and create auth user
    const realEmail = reqRow.email as string | null;
    const authEmail = realEmail || `${(reqRow.phone as string).replace(/\D/g,"")}@mbingo.local`;
    const tempPassword = genTempPassword();

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: authEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: reqRow.full_name,
        phone: reqRow.phone,
        username: (reqRow.full_name as string).toLowerCase().replace(/[^a-z0-9]+/g,"_").slice(0,30),
        email_real: realEmail,
        must_change_password: true,
      },
    });
    if (cErr || !created.user) return j({ error: cErr?.message ?? "create failed" }, 400);

    await admin.from("profiles").upsert({
      id: created.user.id,
      full_name: reqRow.full_name,
      phone: reqRow.phone,
      email: realEmail,
      username: (reqRow.full_name as string).toLowerCase().replace(/[^a-z0-9]+/g,"_").slice(0,30),
    });
    await admin.from("user_roles").insert({ user_id: created.user.id, role: reqRow.requested_role });

    await admin.from("signup_requests").update({
      status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: u.user.id,
    }).eq("id", id);

    return j({ ok: true, user_id: created.user.id, temp_password: tempPassword, phone: reqRow.phone });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
