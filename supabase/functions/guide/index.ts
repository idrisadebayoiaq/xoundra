import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Track = { id: string; title: string; category: string; tags: string[] };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const header = req.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) return json({ error: "sign_in_required" }, 401);

  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: header } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) return json({ error: "sign_in_required" }, 401);

  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").replace(/\s+/g, " ").trim();
  if (text.length < 2 || text.length > 240) return json({ error: "missing_details" }, 400);

  const admin = createClient(supabaseUrl, service);
  const { data: premium } = await admin.rpc("has_active_premium", { p_user: user.id });
  if (premium !== true) return json({ error: "not_premium" }, 403);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin.from("ai_requests").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= 30) return json({ error: "rate_limited" }, 429);

  const { data: rows, error } = await admin
    .from("tracks")
    .select("id, title, category, track_tags(tag)")
    .eq("status", "published");
  if (error || !rows?.length) return json({ error: "guide_failed" }, 500);

  const tracks: Track[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: String(row.category || ""),
    tags: (row.track_tags || []).map((item: { tag: string }) => item.tag),
  }));

  const choice = await choose(text, tracks);
  await admin.from("ai_requests").insert({ user_id: user.id });
  return json({ id: choice.id, line: choice.line, ids: relatedIds(choice.id, text, tracks), source: choice.source });
});

function json(payload: Record<string, unknown>, status = 200) {
  return Response.json(payload, { status, headers: cors });
}

async function choose(text: string, tracks: Track[]) {
  const model = Deno.env.get("OPENROUTER_MODEL") || "google/gemini-2.5-flash-lite";
  const fallback = Deno.env.get("OPENROUTER_FALLBACK_MODEL") || "openai/gpt-4o-mini";
  const first = await askModel(model, text, tracks);
  if (first) return { ...first, source: "model" };
  const second = await askModel(fallback, text, tracks);
  if (second) return { ...second, source: "model" };
  return { ...keywordChoice(text, tracks), source: "catalogue" };
}

async function askModel(model: string, text: string, tracks: Track[]) {
  const key = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  if (!key) return null;
  const catalogue = tracks.map((track) => `${track.id} | ${track.title} | ${track.category} | ${track.tags.join(", ")}`).join("\n");
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": Deno.env.get("OPENROUTER_SITE_URL") || "https://xoundra.app",
      "X-Title": Deno.env.get("OPENROUTER_APP_NAME") || "Xoundra",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You guide a relaxation sound app. Reply with JSON only: {\"id\",\"line\"}. The id must be copied from the catalogue. Do not invent a sound. The line is one calm sentence under 18 words, written to be spoken aloud. Name the sound and say you will stay with sounds like it.",
        },
        { role: "user", content: `Catalogue:\n${catalogue}\n\nThe person said: ${text}` },
      ],
    }),
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content ?? "";
  return parseChoice(String(raw), tracks);
}

function parseChoice(raw: string, tracks: Track[]) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    const track = tracks.find((item) => item.id === String(parsed.id || ""));
    if (!track) return null;
    const line = String(parsed.line || "").replace(/\s+/g, " ").trim().slice(0, 140);
    return { id: track.id, line: line || `${track.title} is on. I will stay with sounds like this.` };
  } catch {
    return null;
  }
}

function relatedIds(seedId: string, text: string, tracks: Track[]) {
  const seed = tracks.find((track) => track.id === seedId) || tracks[0];
  const said = text.toLowerCase();
  const ranked = tracks
    .map((track) => {
      let score = track.id === seed.id ? 100 : 0;
      if (track.category === seed.category) score += 8;
      for (const tag of seed.tags) {
        if (track.tags.includes(tag)) score += 3;
        if (said.includes(tag.toLowerCase())) score += 2;
      }
      if (said.includes(track.category.toLowerCase())) score += 4;
      return { id: track.id, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const ids = ranked.map((item) => item.id);
  if (!ids.includes(seed.id)) ids.unshift(seed.id);
  return ids.slice(0, 12);
}

function keywordChoice(text: string, tracks: Track[]) {
  const said = text.toLowerCase();
  const words = ["rain", "ocean", "forest", "sleep", "focus", "meditation", "thunder", "wind", "night", "water"];
  const word = words.find((item) => said.includes(item));
  const match = tracks.find((track) => {
    const hay = `${track.title} ${track.category} ${track.tags.join(" ")}`.toLowerCase();
    return word ? hay.includes(word) : false;
  }) || tracks[0];
  return { id: match.id, line: `${match.title} is on. I will stay with sounds like this.` };
}
