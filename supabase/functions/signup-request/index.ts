// Public endpoint: create a signup request awaiting admin approval.
// Stores a bcrypt hash of the password (never plaintext) and a normalized phone.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED = new Set(["engineer","contractor","yard_storekeeper","site_storekeeper"]);

function normalizePhone(raw: string): string {
  let p = raw.trim().replace(/[\s\-()]/g, "");
  if (p.startsWith("+254")) return p;
  if (p.startsWith("254")) return "+" + p;
  if (p.startsWith("0") && p.length === 10) return "+254" + p.slice(1);
  return p;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const full_name = String(body.full_name ?? "").trim();
    const phone = normalizePhone(String(body.phone ?? ""));
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    const role = String(body.role ?? "");
    const password = String(body.password ?? "");

    if (full_name.length < 2) return j({ error: "Full name is required" }, 400);
    if (!/^\+?[0-9]{9,15}$/.test(phone)) return j({ error: "Valid phone number is required" }, 400);
    if (!ALLOWED.has(role)) return j({ error: "Invalid role" }, 400);
    if (password.length < 8) return j({ error: "Password must be at least 8 characters" }, 400);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return j({ error: "Invalid email" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: existProfile } = await admin.from("profiles").select("id").eq("phone", phone).maybeSingle();
    if (existProfile) return j({ error: "Phone number is already registered" }, 409);
    const { data: existReq } = await admin.from("signup_requests")
      .select("id").eq("phone", phone).eq("status","pending").maybeSingle();
    if (existReq) return j({ error: "A pending request with this phone already exists" }, 409);

    const hash = await bcrypt.hash(password, 10);

    const { error } = await admin.from("signup_requests").insert({
      full_name, phone, email, requested_role: role, password: hash, status: "pending",
    });
    if (error) return j({ error: error.message }, 500);
    return j({ ok: true });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
