import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-check-in-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supportEmail = "xoundra.support@gmail.com";
const appUrl = "https://xoundra.vercel.app";

/** Rough UTC offsets (hours) by country — Nigeria-first catalogue. */
const offsets: Record<string, number> = {
  NG: 1, GH: 0, KE: 3, ZA: 2, EG: 2, MA: 1, TZ: 3, UG: 3, ET: 3,
  US: -5, GB: 0, CA: -5, AU: 10, IN: 5.5, AE: 4, SA: 3, DE: 1, FR: 1,
  NL: 1, IE: 0, BR: -3, MX: -6, JP: 9, SG: 8, PH: 8, KR: 9, ES: 1,
  IT: 1, PT: 0, SE: 1, NO: 1, DK: 1, FI: 2, PL: 1, TR: 3, CN: 8,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, service);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "dispatch");

  try {
    if (action === "dispatch") {
      if (!(await cronAuthorized(admin, req, body))) {
        return json({ error: "unauthorized" }, 401);
      }
      return await dispatchCheckIns(admin, body);
    }

    if (action === "preview") {
      const user = await caller(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", req);
      if (!user) return json({ error: "sign_in_required" }, 401);
      const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!role) return json({ error: "not_admin" }, 403);
      const { data: profile } = await admin.from("profiles").select("first_name, country_code").eq("id", user.id).maybeSingle();
      const forced = body.force_kind === "morning" || body.force_kind === "evening" ? body.force_kind : null;
      const slot = forced
        ? { kind: forced, subject: forced === "morning" ? "Good morning from Xoundra" : "Good evening from Xoundra" }
        : greetingFor(profile?.country_code || "NG", new Date())
          || { kind: "evening" as const, subject: "Good evening from Xoundra" };
      const html = checkInMail(profile?.first_name || "", slot.kind, user.email || "");
      return json({ ok: true, kind: slot.kind, subject: slot.subject, html });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "request_failed";
    const status = message === "smtp_not_configured" ? 503 : 500;
    return json({ error: message === "smtp_not_configured" ? message : "request_failed" }, status);
  }
});

function json(payload: Record<string, unknown>, status = 200) {
  return Response.json(payload, { status, headers: cors });
}

async function readAppSecret(admin: ReturnType<typeof createClient>, name: string) {
  const { data, error } = await admin.rpc("read_app_secret", { p_name: name });
  if (error || typeof data !== "string") return "";
  return data;
}

async function cronAuthorized(
  admin: ReturnType<typeof createClient>,
  req: Request,
  body: Record<string, unknown>,
) {
  const headerSecret = req.headers.get("x-check-in-secret") ?? "";
  const bodySecret = String(body.secret ?? "");
  const provided = headerSecret || bodySecret;
  if (!provided) return false;
  const envSecret = Deno.env.get("CHECK_IN_CRON_SECRET") ?? Deno.env.get("BILLING_CRON_SECRET") ?? "";
  if (envSecret && provided === envSecret) return true;
  const stored = await readAppSecret(admin, "CHECK_IN_CRON_SECRET");
  return Boolean(stored && provided === stored);
}

async function caller(url: string, anon: string, req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return null;
  const client = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

function localHour(country: string, now: Date) {
  const offset = offsets[country] ?? 1;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const local = new Date(utc + offset * 3600000);
  return local.getHours();
}

function greetingFor(country: string, now: Date) {
  const hour = localHour(country, now);
  if (hour === 7) {
    return { kind: "morning" as const, subject: "Good morning from Xoundra", label: "Good morning" };
  }
  if (hour === 21) {
    return { kind: "evening" as const, subject: "Good evening from Xoundra", label: "Good evening" };
  }
  return null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] ?? char));
}

const morningVariants = [
  {
    mood: "Hope the day opens gently.",
    prompt: "As you settle into the day, we would love to hear how Xoundra has been for you.",
    cards: [
      ["What do you think of Xoundra so far?", "The sounds, the Guide, the quiet of it — anything that stood out."],
      ["Has it helped you sleep, focus, or unwind?", "Even a short note helps us shape what comes next."],
      ["Is there a sound or feature you wish we had?", "Tell us what is missing from your mornings."],
    ],
  },
  {
    mood: "A soft start can change the whole day.",
    prompt: "If you listened recently, what stayed with you?",
    cards: [
      ["Which sound felt most like home?", "Rain, ocean, night — or something else entirely."],
      ["Did the Guide find the right mood?", "Tell us when it landed, and when it missed."],
      ["What would make mornings quieter?", "A playlist, a scene, or a small habit in the app."],
    ],
  },
  {
    mood: "Light in, noise out — that is the hope.",
    prompt: "We are listening as carefully as you are.",
    cards: [
      ["Did Xoundra help you begin calmly?", "Focus, stretch, commute — wherever you pressed play."],
      ["Anything confusing in the app?", "Screens, Premium, downloads — we will smooth the edges."],
      ["Who should hear about Xoundra?", "A friend who needs sleep or a quieter desk."],
    ],
  },
  {
    mood: "Another morning, another chance to breathe.",
    prompt: "Your notes keep the catalogue honest.",
    cards: [
      ["What felt missing yesterday?", "A longer loop, softer night, clearer Guide."],
      ["Are check-ins welcome, or too much?", "We can keep them gentle."],
      ["Any artist you want more of?", "Names and moods help us invite the right sounds."],
    ],
  },
];

const eveningVariants = [
  {
    mood: "Hope the evening feels a little softer.",
    prompt: "Before the night deepens, we would love to hear how Xoundra has been for you.",
    cards: [
      ["What do you think of Xoundra so far?", "The sounds, the Guide, the quiet of it — anything that stood out."],
      ["Has it helped you sleep, focus, or unwind?", "Even a short note helps us shape what comes next."],
      ["Is there a sound or feature you wish we had?", "Tell us what is missing from your evenings."],
    ],
  },
  {
    mood: "Let the day settle. The night can be quieter.",
    prompt: "If you played something tonight, how did it feel?",
    cards: [
      ["Ready for sleep, or still winding down?", "Tell us what you reach for after dark."],
      ["Did offline or sleep schedules help?", "We want those tools to stay simple."],
      ["One change that would matter this week?", "Small requests are welcome."],
    ],
  },
  {
    mood: "Soft light, soft sound — that is enough.",
    prompt: "Your evenings teach us what to build next.",
    cards: [
      ["Which shelf do you open most at night?", "Sleep, night, rain, focus — be honest."],
      ["Anything that interrupted the calm?", "Ads, navigation, or a missing download."],
      ["Would you invite someone to listen with you?", "Scenes and shared quiet are on our mind."],
    ],
  },
  {
    mood: "The day can stop here for a minute.",
    prompt: "A short reply is a gift to the next listener.",
    cards: [
      ["Did a sound help you rest?", "Or did you keep searching?"],
      ["How is Premium feeling, if you have it?", "Worth it, confusing, or waiting."],
      ["What should tomorrow’s quiet include?", "A mood, a place, or a longer mix."],
    ],
  },
];

function pickVariant(kind: "morning" | "evening", seed = Date.now()) {
  const list = kind === "morning" ? morningVariants : eveningVariants;
  const day = Math.floor(seed / 86400000);
  return list[Math.abs(day) % list.length];
}

function checkInMail(firstName: string, kind: "morning" | "evening", email: string, seed = Date.now()) {
  const name = firstName ? escapeHtml(firstName) : "there";
  const hello = kind === "morning" ? "Good morning" : "Good evening";
  const variant = pickVariant(kind, seed);
  const cards = variant.cards
    .map(
      ([title, copy], index) => `<tr><td style="background:#0B1018;border:1px solid #243044;border-radius:16px;padding:16px 18px;">
      ${index === 0 ? `<div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.2em;color:#8BE1CF;">A FEW THINGS WE WONDER</div>` : ""}
      <div style="font-family:Georgia,serif;font-size:16px;color:#F3F6F8;${index === 0 ? "padding-top:10px;" : ""}line-height:1.5;">${escapeHtml(title)}</div>
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#8E98A3;padding-top:6px;line-height:1.5;">${escapeHtml(copy)}</div>
    </td></tr>`,
    )
    .join("");

  const body = `
  <p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;color:#F3F6F8;">
    ${hello}, ${name}.
  </p>
  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#C5CED6;">
    ${escapeHtml(variant.mood)}
  </p>
  <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#C5CED6;">
    ${escapeHtml(variant.prompt)}
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-collapse:separate;border-spacing:0 10px;">
    ${cards}
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr>
      <td style="border-radius:26px;background:#8BE1CF;">
        <a href="mailto:${supportEmail}?subject=${encodeURIComponent("My thoughts on Xoundra")}&body=${encodeURIComponent(`Hi Xoundra,%0A%0AHere is what I think so far:%0A%0A`)}"
           style="display:inline-block;padding:14px 26px;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#10211C;text-decoration:none;">
          Share your thoughts
        </a>
      </td>
    </tr>
  </table>

  <p style="margin:22px 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#8E98A3;">
    Or open the app and keep listening — we will be here.
    <br/><a href="${appUrl}" style="color:#8BE1CF;text-decoration:none;">${appUrl.replace("https://", "")}</a>
  </p>
  <p style="margin:28px 0 0;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#66707A;">
    Sent to ${escapeHtml(email)}. You can turn these notes off anytime in Settings → Check-in emails.
  </p>`;

  return shell(hello, body);
}

function shell(eyebrow: string, body: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>Xoundra</title>
</head>
<body style="margin:0;padding:0;background:#05060A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#05060A;padding:36px 14px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0C111A;border:1px solid #1E2A3A;border-radius:28px;overflow:hidden;">
        <tr>
          <td style="height:5px;background:linear-gradient(90deg,#8BE1CF 0%,#B8A9F5 100%);font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:34px 30px 12px;">
            <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.32em;color:#8BE1CF;">XOUNDRA</div>
            <div style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.08em;color:#8E98A3;padding-top:14px;text-transform:uppercase;">${escapeHtml(eyebrow)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 30px 36px;">
            ${body}
            <div style="margin-top:36px;padding-top:22px;border-top:1px solid #1E2A3A;font-family:Georgia,serif;font-size:15px;color:#8BE1CF;font-style:italic;">
              Find your quiet.
            </div>
          </td>
        </tr>
      </table>
      <div style="font-family:Arial,sans-serif;font-size:11px;color:#555E68;padding-top:18px;">
        © Xoundra · Ambient sound for sleep, focus, and calm
      </div>
    </td></tr>
  </table>
</body>
</html>`;
}

async function smtpPassword(admin: ReturnType<typeof createClient>) {
  const fromEnv = Deno.env.get("SMTP_APP_PASSWORD") ?? "";
  if (fromEnv) return fromEnv;
  return await readAppSecret(admin, "SMTP_APP_PASSWORD");
}

async function sendMail(
  admin: ReturnType<typeof createClient>,
  to: string,
  subject: string,
  html: string,
  text: string,
) {
  const password = await smtpPassword(admin);
  if (!password) throw new Error("smtp_not_configured");
  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: supportEmail, password },
    },
  });
  await client.send({
    from: `Xoundra <${supportEmail}>`,
    to,
    subject,
    content: text,
    html,
  });
  await client.close();
}

async function queueInboxNotice(
  admin: ReturnType<typeof createClient>,
  userId: string,
  kind: "morning" | "evening",
) {
  const title = kind === "morning" ? "Good morning" : "Good evening";
  const variant = pickVariant(kind);
  const body = variant.prompt;
  try {
    await admin.from("user_notifications").insert({
      user_id: userId,
      kind: "check_in",
      title,
      body,
    });
  } catch {
    /* inbox is best-effort */
  }
  try {
    await admin.from("notification_outbox").insert({
      user_id: userId,
      kind: "check_in",
      title,
      body,
    });
  } catch {
    /* push outbox is best-effort */
  }
}

async function dispatchCheckIns(admin: ReturnType<typeof createClient>, body: Record<string, unknown>) {
  const forceKind = body.force_kind === "morning" || body.force_kind === "evening" ? body.force_kind : null;
  const limit = Math.min(Number(body.limit) || 80, 150);
  const minDays = Math.max(Number(body.min_days) || 1, 1);
  const since = new Date(Date.now() - minDays * 24 * 3600 * 1000).toISOString();
  const now = new Date();

  const { data: rows, error } = await admin
    .from("profiles")
    .select("id, first_name, country_code, check_in_emails, last_check_in_at, last_morning_check_in_at, last_evening_check_in_at, email_confirmed, onboarding_done")
    .eq("email_confirmed", true)
    .eq("onboarding_done", true)
    .eq("check_in_emails", true)
    .order("country_code", { ascending: true })
    .limit(limit);

  if (error) return json({ error: "query_failed", detail: error.message }, 500);

  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const profile of rows || []) {
    const slot = forceKind
      ? { kind: forceKind, subject: forceKind === "morning" ? "Good morning from Xoundra" : "Good evening from Xoundra", label: forceKind === "morning" ? "Good morning" : "Good evening" }
      : greetingFor(profile.country_code || "NG", now);
    if (!slot) {
      skipped += 1;
      continue;
    }

    const stampKey = slot.kind === "morning" ? "last_morning_check_in_at" : "last_evening_check_in_at";
    const lastSlot = profile[stampKey];
    if (!forceKind && lastSlot && new Date(lastSlot).getTime() > Date.now() - minDays * 24 * 3600 * 1000) {
      skipped += 1;
      continue;
    }

    const { data: auth } = await admin.auth.admin.getUserById(profile.id);
    const email = auth.user?.email;
    if (!email) {
      skipped += 1;
      continue;
    }

    const html = checkInMail(profile.first_name || "", slot.kind, email);
    const text = `${slot.label}, ${profile.first_name || "there"}.\n\nHow has Xoundra been for you? Has it helped you sleep, focus, or unwind?\nReply to this email or write to ${supportEmail}.\n\n${appUrl}`;

    try {
      await sendMail(admin, email, slot.subject, html, text);
      await queueInboxNotice(admin, profile.id, slot.kind);
      await admin.from("profiles").update({
        last_check_in_at: now.toISOString(),
        [stampKey]: now.toISOString(),
      }).eq("id", profile.id);
      sent += 1;
    } catch (err) {
      failures.push(profile.id);
      if (err instanceof Error && err.message === "smtp_not_configured") throw err;
    }
  }

  return json({ ok: true, sent, skipped, failures: failures.length, checked: (rows || []).length });
}
