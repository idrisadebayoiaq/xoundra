import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const encoder = new TextEncoder();
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const isService = Boolean(serviceKey) && bearer === serviceKey;

  let userId = "";
  if (!isService) {
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: header } },
    });
    const { data } = await userClient.auth.getUser();
    userId = data.user?.id ?? "";
    if (!userId) return json({ error: "sign_in_required" }, 401);
  }

  const accountRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!accountRaw) return json({ error: "firebase_not_configured" }, 500);
  let account: { client_email: string; private_key: string; project_id: string };
  try {
    account = JSON.parse(accountRaw);
  } catch {
    return json({ error: "firebase_not_configured" }, 500);
  }
  if (!account?.client_email || !account?.private_key || !account?.project_id) {
    return json({ error: "firebase_not_configured" }, 500);
  }

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
  if (action === "broadcast" && !isService) return json({ error: "not_allowed" }, 403);
  if (action === "self" && !userId) return json({ error: "sign_in_required" }, 401);

  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Xoundra";
  const message = typeof body.body === "string" ? body.body.trim() : "";
  const admin = createClient(supabaseUrl, serviceKey);
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
    if (response.status === 404 || response.status === 400) {
      await admin.from("push_tokens").delete().eq("token", row.token);
    }
  }
  return json({ sent });
});
