import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) {
    return Response.json({ error: "sign_in_required" }, { status: 401, headers: cors });
  }

  const body = await req.json();
  const purpose = body.purpose === "download" ? "download" : "stream";
  const admin = createClient(supabaseUrl, service);
  const { data: track } = await admin
    .from("tracks")
    .select("id, access_tier, audio_path, status")
    .eq("id", body.track_id)
    .eq("status", "published")
    .maybeSingle();
  if (!track?.audio_path) {
    return Response.json({ error: "not_found" }, { status: 404, headers: cors });
  }

  const { data: premium } = await admin.rpc("has_active_premium", { p_user: userData.user.id });
  if (purpose === "download" && premium !== true) {
    return Response.json({ error: "premium_required" }, { status: 403, headers: cors });
  }
  if (track.access_tier === "premium" && premium !== true) {
    return Response.json({ error: "premium_required" }, { status: 403, headers: cors });
  }

  const ttl = Number(Deno.env.get("MEDIA_SIGNED_URL_TTL_SECONDS") ?? "300");
  const { data, error } = await admin.storage.from("track-audio").createSignedUrl(track.audio_path, ttl);
  if (error || !data?.signedUrl) {
    return Response.json({ error: "sign_failed" }, { status: 500, headers: cors });
  }
  return Response.json({ url: data.signedUrl, expires_in: ttl }, { headers: cors });
});
