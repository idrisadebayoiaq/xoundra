import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Draft = {
  description: string;
  blurb: string;
  tags: string[];
  moods: string[];
  altText: string;
  categoryHint: string;
  characterHints: string[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true }, 200);
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

  const admin = createClient(supabaseUrl, service);
  const { data: profile } = await admin.from("profiles").select("is_artist").eq("id", user.id).maybeSingle();
  if (profile?.is_artist !== true) return json({ error: "not_artist" }, 403);

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").replace(/\s+/g, " ").trim();
  const type = String(body.type ?? "single").toLowerCase() === "album" ? "album" : "single";
  const category = String(body.category ?? "").trim().slice(0, 40);
  const audioHint = String(body.audioHint ?? "").trim().slice(0, 120);
  if (title.length < 2 || title.length > 120) return json({ error: "missing_details" }, 400);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("ai_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= 40) return json({ error: "rate_limited" }, 429);

  const draft = await draftCopy({ title, type, category, audioHint });
  await admin.from("ai_requests").insert({ user_id: user.id });
  return json({ ...draft, source: draft.source });
});

function json(payload: Record<string, unknown>, status = 200) {
  return Response.json(payload, { status, headers: cors });
}

async function draftCopy(input: {
  title: string;
  type: string;
  category: string;
  audioHint: string;
}): Promise<Draft & { source: string }> {
  const model = Deno.env.get("OPENROUTER_MODEL") || "google/gemini-2.5-flash-lite";
  const fallback = Deno.env.get("OPENROUTER_FALLBACK_MODEL") || "openai/gpt-4o-mini";
  const first = await askModel(model, input);
  if (first) return { ...first, source: "model" };
  const second = await askModel(fallback, input);
  if (second) return { ...second, source: "model" };
  return { ...localDraft(input), source: "local" };
}

async function askModel(
  model: string,
  input: { title: string; type: string; category: string; audioHint: string },
): Promise<Draft | null> {
  const key = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  if (!key) return null;
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
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You help verified artists write catalogue copy for a calm listening app (Xoundra). Reply JSON only: {\"description\",\"blurb\",\"tags\",\"moods\",\"altText\",\"categoryHint\",\"characterHints\"}. description <= 280 chars; blurb <= 90 chars; tags/moods arrays of 2-6 short words; altText for artwork; categoryHint one of rain,ocean,forest,nature,ambient,focus,meditation,sleep when possible; characterHints rough listening character (rain/wind/drone/pulse, energy, shelf) — not medical or fake science. No therapy framing.",
        },
        {
          role: "user",
          content: `Type: ${input.type}\nTitle: ${input.title}\nCategory: ${input.category || "unset"}\nAudio notes: ${input.audioHint || "none"}`,
        },
      ],
    }),
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const raw = String(payload?.choices?.[0]?.message?.content ?? "");
  return parseDraft(raw);
}

function parseDraft(raw: string): Draft | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return normalize(parsed);
  } catch {
    return null;
  }
}

function normalize(parsed: Record<string, unknown>): Draft {
  const asList = (value: unknown) =>
    (Array.isArray(value) ? value : String(value || "").split(","))
      .map((item) => String(item).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 6);

  return {
    description: String(parsed.description || "").replace(/\s+/g, " ").trim().slice(0, 280),
    blurb: String(parsed.blurb || "").replace(/\s+/g, " ").trim().slice(0, 90),
    tags: asList(parsed.tags),
    moods: asList(parsed.moods),
    altText: String(parsed.altText || "").replace(/\s+/g, " ").trim().slice(0, 140),
    categoryHint: String(parsed.categoryHint || "").trim().toLowerCase().slice(0, 40),
    characterHints: asList(parsed.characterHints),
  };
}

function localDraft(input: {
  title: string;
  type: string;
  category: string;
  audioHint: string;
}): Draft {
  const hay = `${input.title} ${input.category} ${input.audioHint}`.toLowerCase();
  const hints = ["calm", "loop-friendly"];
  if (/rain|drizzle/.test(hay)) hints.push("rain", "soft");
  if (/wind|breeze/.test(hay)) hints.push("wind");
  if (/drone|hum/.test(hay)) hints.push("drone");
  if (/pulse|beat/.test(hay)) hints.push("pulse");
  if (/sleep|night/.test(hay)) hints.push("night shelf");
  if (/focus|work/.test(hay)) hints.push("focus shelf");
  const categoryHint =
    ["rain", "ocean", "forest", "nature", "ambient", "focus", "meditation", "sleep"].find((item) =>
      hay.includes(item)
    ) || input.category || "ambient";
  return {
    description: `${input.title} — a ${input.type} shaped for quiet listening. Edit freely before you publish.`,
    blurb: `${input.title}: soft listening.`,
    tags: hints.slice(0, 4),
    moods: ["calm", "steady"].concat(hints.includes("night shelf") ? ["night"] : []).slice(0, 4),
    altText: `Artwork for ${input.title}`,
    categoryHint,
    characterHints: hints,
  };
}
