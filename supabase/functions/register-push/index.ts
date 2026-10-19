import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405, headers: cors });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const header = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: header } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) return Response.json({ error: "sign_in_required" }, { status: 401, headers: cors });

  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const platform = body.platform === "ios" ? "ios" : "android";
  if (token.length < 20 || token.length > 4096) {
    return Response.json({ error: "invalid_token" }, { status: 400, headers: cors });
  }

  const admin = createClient(supabaseUrl, service);
  const { error } = await admin.from("push_tokens").upsert(
    { token, platform, user_id: user.id, updated_at: new Date().toISOString() },
    { onConflict: "token" },
  );
  if (error) return Response.json({ error: "register_failed" }, { status: 500, headers: cors });
  return Response.json({ ok: true }, { headers: cors });
});
