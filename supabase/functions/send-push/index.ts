import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const encoder = new TextEncoder();
const supportEmail = "xoundra.support@gmail.com";
const emailKinds = new Set([
  "verification_approved",
  "verification_rejected",
  "verification_request",
  "premium_granted",
  "support_reply",
  "support_ticket",
  "bulletin_invite",
  "follow_bulletin",
  "announcement",
]);
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-push-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function bytesToBase64Url(bytes: Uint8Array) {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function pemToPkcs8(pem: string) {
  const body = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const raw = atob(body);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function firebaseAccessToken(account: { client_email: string; private_key: string }) {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const now = Math.floor(Date.now() / 1000);
  const header = bytesToBase64Url(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })));
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(`${header}.${payload}`),
  );
  const assertion = `${header}.${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error("firebase_auth_failed");
  const json = await response.json();
  return json.access_token as string;
}

function json(payload: Record<string, unknown>, status = 200) {
  return Response.json(payload, { status, headers: cors });
}

async function readAppSecret(admin: SupabaseClient, name: string) {
  const { data, error } = await admin.rpc("read_app_secret", { p_name: name });
  if (error || typeof data !== "string") return "";
  return data;
}

async function loadFirebaseAccount(admin: SupabaseClient) {
  let accountRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT") ?? "";
  if (!accountRaw) accountRaw = await readAppSecret(admin, "FIREBASE_SERVICE_ACCOUNT");
  if (!accountRaw) return null;
  try {
    const account = JSON.parse(accountRaw) as { client_email: string; private_key: string; project_id: string };
    if (!account?.client_email || !account?.private_key || !account?.project_id) return null;
    return account;
  } catch {
    return null;
  }
}

async function cronAuthorized(admin: SupabaseClient, req: Request) {
  const provided = req.headers.get("x-push-secret") ?? "";
  if (!provided) return false;
  const envSecret = Deno.env.get("PUSH_DISPATCH_SECRET") ?? Deno.env.get("CHECK_IN_CRON_SECRET") ?? "";
  if (envSecret && provided === envSecret) return true;
  const stored = await readAppSecret(admin, "PUSH_DISPATCH_SECRET")
    || await readAppSecret(admin, "CHECK_IN_CRON_SECRET");
  return Boolean(stored && provided === stored);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceKey);
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const isService = Boolean(serviceKey) && bearer === serviceKey;
  const isCron = await cronAuthorized(admin, req);

  let userId = "";
  if (!isService && !isCron) {
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: header } },
    });
    const { data } = await userClient.auth.getUser();
    userId = data.user?.id ?? "";
    if (!userId) return json({ error: "sign_in_required" }, 401);
  }

  const account = await loadFirebaseAccount(admin);
  if (!account) return json({ error: "firebase_not_configured" }, 500);

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "broadcast";
  if (action === "check") {
    try {
      await firebaseAccessToken(account);
    } catch {
      return json({ error: "firebase_auth_failed" }, 500);
    }
    return json({ firebase: "ok" });
  }
  if (action === "dispatch") {
    if (!userId && !isService && !isCron) return json({ error: "sign_in_required" }, 401);
    const pending = await admin
      .from("notification_outbox")
      .select(
        "id, user_id, kind, title, body, track_id, album_id, announcement_id, quiet_room_post_id, bulletin_id, bulletin_invite_id, email_sent_at",
      )
      .is("sent_at", null)
      .limit(25);
    if (pending.error) return json({ error: "push_failed", detail: pending.error.message }, 500);
    const rows = pending.data ?? [];
    if (!rows.length) return json({ sent: 0 });
    let accessToken = "";
    try {
      accessToken = await firebaseAccessToken(account);
    } catch {
      return json({ error: "firebase_auth_failed" }, 500);
    }
    let sent = 0;
    for (const row of rows) {
      if (!row.email_sent_at && emailKinds.has(String(row.kind || ""))) {
        try {
          await emailNotice(admin, row);
          await admin.from("notification_outbox").update({ email_sent_at: new Date().toISOString() }).eq("id", row.id);
        } catch {
          /* push still attempted */
        }
      }
      const tokens = await admin.from("push_tokens").select("token").eq("user_id", row.user_id);
      let delivered = !tokens.error;
      for (const tokenRow of tokens.data ?? []) {
        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: tokenRow.token,
              notification: { title: row.title, body: row.body },
              data: {
                kind: row.kind || "",
                track_id: row.track_id || "",
                album_id: row.album_id || "",
                announcement_id: row.announcement_id || "",
                quiet_room_post_id: row.quiet_room_post_id || "",
                bulletin_id: row.bulletin_id || "",
                bulletin_invite_id: row.bulletin_invite_id || "",
              },
              android: {
                priority: "HIGH",
                notification: {
                  channel_id: "default",
                  icon: "notification_icon",
                  color: "#8BE1CF",
                },
              },
            },
          }),
        });
        if (response.ok) {
          sent += 1;
          continue;
        }
        delivered = false;
        if (response.status === 404 || response.status === 400) {
          await admin.from("push_tokens").delete().eq("token", tokenRow.token);
          delivered = true;
        }
      }
      if (delivered || (tokens.data ?? []).length === 0) {
        await admin.from("notification_outbox").update({ sent_at: new Date().toISOString() }).eq("id", row.id);
      }
    }
    return json({ sent });
  }
  if (action === "broadcast" && !isService) return json({ error: "not_allowed" }, 403);
  if (action === "self" && !userId) return json({ error: "sign_in_required" }, 401);

  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Xoundra";
  const message = typeof body.body === "string" ? body.body.trim() : "";
  const query = admin.from("push_tokens").select("token");
  const { data, error } = action === "self" ? await query.eq("user_id", userId) : await query;
  if (error) return json({ error: "push_failed" }, 500);

  let accessToken = "";
  try {
    accessToken = await firebaseAccessToken(account);
  } catch {
    return json({ error: "firebase_auth_failed" }, 500);
  }

  let sent = 0;
  for (const row of data ?? []) {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: row.token,
          notification: { title, body: message },
          ...(action === "self" ? { data: { local: "1" } } : {}),
          android: {
            priority: "HIGH",
            notification: {
              channel_id: typeof body?.data?.kind === "string" && body.data.kind === "rewards" ? "rewards" : "default",
              icon: "notification_icon",
              color: "#8BE1CF",
            },
          },
        },
      }),
    });
    if (response.ok) {
      sent += 1;
      continue;
    }
    if (response.status === 404 || response.status === 400) {
      await admin.from("push_tokens").delete().eq("token", row.token);
    }
  }
  return json({ sent });
});

async function smtpPassword(admin: SupabaseClient) {
  const fromEnv = Deno.env.get("SMTP_APP_PASSWORD") ?? "";
  if (fromEnv) return fromEnv;
  return await readAppSecret(admin, "SMTP_APP_PASSWORD");
}

async function emailNotice(
  admin: SupabaseClient,
  row: { user_id: string; kind: string; title: string; body: string },
) {
  const { data: userData } = await admin.auth.admin.getUserById(row.user_id);
  const to = userData?.user?.email;
  if (!to) return;
  const password = await smtpPassword(admin);
  if (!password) return;
  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: supportEmail, password },
    },
  });
  const safeTitle = String(row.title || "Xoundra");
  const safeBody = String(row.body || "");
  const html = `<!doctype html><html><body style="margin:0;background:#07080D;color:#F3F6F8;font-family:Arial,sans-serif;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:#101725;border:1px solid #243044;border-radius:24px;padding:28px;">
    <div style="letter-spacing:0.28em;color:#8BE1CF;font-size:12px;">XOUNDRA</div>
    <h1 style="font-family:Georgia,serif;font-size:28px;margin:16px 0 12px;">${escapeHtml(safeTitle)}</h1>
    <p style="line-height:1.7;color:#C5CED6;margin:0;">${escapeHtml(safeBody)}</p>
    <p style="margin:28px 0 0;color:#8BE1CF;font-style:italic;">Find your quiet.</p>
  </div></body></html>`;
  await client.send({
    from: `Xoundra <${supportEmail}>`,
    to,
    subject: safeTitle,
    content: safeBody,
    html,
  });
  await client.close();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] ?? char));
}
