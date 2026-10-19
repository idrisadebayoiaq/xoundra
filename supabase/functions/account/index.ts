import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const supportEmail = "xoundra.support@gmail.com";
const codeMinutes = 15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, service);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  try {
    if (action === "signup") return await signup(admin, body);
    if (action === "verify-signup") return await verifySignup(admin, body);
    if (action === "resend-signup") return await resendSignup(admin, body);

    const user = await caller(supabaseUrl, anon, req);
    if (!user) return json({ error: "sign_in_required" }, 401);

    if (action === "start-email-change") return await startEmailChange(admin, supabaseUrl, anon, user, body);
    if (action === "confirm-email-change") return await confirmEmailChange(admin, user, body);
    if (action === "change-password") return await changePassword(admin, supabaseUrl, anon, user, body);
    if (action === "delete-account") return await deleteAccount(admin, supabaseUrl, anon, user, body);
    if (action === "support") return await supportMessage(user, body);
    if (action === "admin-overview") return await adminOverview(admin, user);
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

async function caller(url: string, anon: string, req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return null;
  const client = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

function passwordProblems(password: string) {
  const problems: string[] = [];
  if (password.length < 8) problems.push("length");
  if (!/[A-Z]/.test(password)) problems.push("uppercase");
  if (!/[a-z]/.test(password)) problems.push("lowercase");
  if (!/[0-9]/.test(password)) problems.push("number");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("symbol");
  return problems;
}

function sixDigit() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(value).padStart(6, "0");
}

async function hashCode(userId: string, code: string) {
  const bytes = new TextEncoder().encode(`${userId}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function issueCode(admin: ReturnType<typeof createClient>, userId: string, email: string, purpose: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin.from("email_codes").select("id", { count: "exact", head: true }).eq("email", email.toLowerCase()).gte("created_at", since);
  if ((count ?? 0) >= 5) return { error: "rate_limited" as const, code: "" };
  await admin.from("email_codes").update({ used_at: new Date().toISOString() }).eq("user_id", userId).eq("purpose", purpose).is("used_at", null);
  const code = sixDigit();
  const { error } = await admin.from("email_codes").insert({
    user_id: userId,
    email: email.toLowerCase(),
    purpose,
    code_hash: await hashCode(userId, code),
    expires_at: new Date(Date.now() + codeMinutes * 60 * 1000).toISOString(),
  });
  if (error) return { error: "code_create_failed" as const, code: "" };
  return { error: null, code };
}

async function codeMatches(admin: ReturnType<typeof createClient>, userId: string, email: string, purpose: string, code: string) {
  const { data } = await admin
    .from("email_codes")
    .select("id, code_hash, expires_at")
    .eq("user_id", userId)
    .eq("email", email.toLowerCase())
    .eq("purpose", purpose)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data || new Date(data.expires_at).getTime() < Date.now()) return false;
  return (await hashCode(userId, code)) === data.code_hash;
}

async function consumeCode(admin: ReturnType<typeof createClient>, userId: string, email: string, purpose: string, code: string) {
  if (!(await codeMatches(admin, userId, email, purpose, code))) return false;
  const { data } = await admin
    .from("email_codes")
    .select("id")
    .eq("user_id", userId)
    .eq("email", email.toLowerCase())
    .eq("purpose", purpose)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return false;
  const { data: used } = await admin
    .from("email_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id)
    .is("used_at", null)
    .select("id");
  return Array.isArray(used) && used.length > 0;
}

async function sendMail(to: string, subject: string, html: string, text: string) {
  const password = Deno.env.get("SMTP_APP_PASSWORD") ?? "";
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

function shell(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#07080D;color:#F3F6F8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07080D;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#101725;border:1px solid #243044;border-radius:28px;">
        <tr><td style="height:4px;background:#8BE1CF;border-radius:28px 28px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:36px 32px 32px;">
          <div style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.28em;color:#8BE1CF;">XOUNDRA</div>
          <div style="font-family:Georgia,serif;font-size:34px;line-height:1.2;color:#F3F6F8;padding-top:18px;">${title}</div>
          <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#C5CED6;padding-top:16px;">${body}</div>
          <div style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.04em;color:#8E98A3;padding-top:32px;">Find your quiet.</div>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function codeMail(code: string, title: string, lead: string) {
  const body = `<p style="margin:0;">${lead}</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr><td align="center" style="background:#0B1018;border:1px solid #8BE1CF;border-radius:18px;padding:22px 12px;">
      <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.24em;color:#8BE1CF;">YOUR CODE</div>
      <div style="font-family:Georgia,serif;font-size:40px;letter-spacing:0.32em;color:#F3F6F8;padding:12px 0 0 0.32em;">${code}</div>
    </td></tr>
  </table>
  <p style="margin:18px 0 0;">It expires in ${codeMinutes} minutes. If you did not ask for this, you can ignore the message.</p>`;
  return shell(title, body);
}

function welcomeMail(firstName: string, admin: boolean) {
  const name = firstName ? ` ${escapeHtml(firstName)}` : "";
  const adminLine = admin
    ? `<p style="margin:22px 0 0;">This address is the Xoundra admin. Premium is already on, and Admin is on your profile. You do not pay for a plan.</p>`
    : "";
  const row = (title: string, copy: string) => `<tr><td style="padding:14px 0;border-top:1px solid #243044;">
    <div style="font-family:Georgia,serif;font-size:16px;color:#F3F6F8;">${title}</div>
    <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#C5CED6;padding-top:4px;">${copy}</div>
  </td></tr>`;
  const body = `<p style="margin:0;">Welcome${name}. Xoundra is a quiet place for sleep, focus, and calm.</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
    ${row("The catalogue", "Rain, ocean, forest, and night, ready to play.")}
    ${row("Your library", "Favourites, history, and playlists stay with your account.")}
    ${row("Premium", "Mixes, offline downloads, the sleep timer, and the voice guide.")}
  </table>
  ${adminLine}`;
  return shell("Welcome to Xoundra", body);
}

async function signup(admin: ReturnType<typeof createClient>, body: Record<string, unknown>) {
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const firstName = String(body.first_name ?? "").trim();
  const country = String(body.country_code ?? "NG").trim() || "NG";
  if (!email || !email.includes("@") || !firstName) return json({ error: "missing_details" }, 400);
  const problems = passwordProblems(password);
  if (problems.length) return json({ error: "weak_password", problems }, 400);

  const { data: existingId } = await admin.rpc("user_id_for_email", { p_email: email });
  if (existingId) {
    const { data: profile } = await admin.from("profiles").select("email_confirmed").eq("id", existingId).maybeSingle();
    if (profile?.email_confirmed) return json({ error: "already_registered" }, 409);
    const issued = await issueCode(admin, existingId, email, "signup");
    if (issued.error) return json({ error: issued.error }, 429);
    await sendMail(email, "Your Xoundra code", codeMail(issued.code, "Confirm your email", "Enter this code in Xoundra to finish creating your account."), `Your Xoundra code is ${issued.code}`);
    return json({ ok: true, email });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { first_name: firstName, country_code: country },
  });
  if (error || !data.user) return json({ error: "signup_failed" }, 400);
  const issued = await issueCode(admin, data.user.id, email, "signup");
  if (issued.error) {
    await admin.auth.admin.deleteUser(data.user.id);
    return json({ error: issued.error }, 500);
  }
  try {
    await sendMail(email, "Your Xoundra code", codeMail(issued.code, "Confirm your email", "Enter this code in Xoundra to finish creating your account."), `Your Xoundra code is ${issued.code}`);
  } catch (error) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw error;
  }
  return json({ ok: true, email });
}

async function sessionToken(admin: ReturnType<typeof createClient>, email: string) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data?.properties?.hashed_token) return "";
  return data.properties.hashed_token;
}

async function verifySignup(admin: ReturnType<typeof createClient>, body: Record<string, unknown>) {
  const email = String(body.email ?? "").trim().toLowerCase();
  const code = String(body.code ?? "").replace(/\D/g, "");
  if (code.length !== 6) return json({ error: "invalid_code" }, 400);
  const { data: userId } = await admin.rpc("user_id_for_email", { p_email: email });
  if (!userId) return json({ error: "invalid_code" }, 400);
  const { data: before } = await admin.from("profiles").select("email_confirmed, first_name").eq("id", userId).maybeSingle();
  if (!(await codeMatches(admin, userId, email, "signup", code))) {
    if (before?.email_confirmed) return json({ error: "already_confirmed" }, 409);
    return json({ error: "invalid_code" }, 400);
  }
  await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  const { error: flagError } = await admin.rpc("mark_email_confirmed", { p_user: userId });
  if (flagError) return json({ error: "signup_failed" }, 500);
  const tokenHash = await sessionToken(admin, email);
  const consumed = await consumeCode(admin, userId, email, "signup", code);
  let welcome = "skipped";
  if (consumed && !before?.email_confirmed) {
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    try {
      const html = welcomeMail(before?.first_name ?? "", Boolean(role));
      await sendMail(email, "Welcome to Xoundra", html, "Welcome to Xoundra. Sounds for sleep, focus, and calm.");
      welcome = "sent";
    } catch {
      welcome = "failed";
    }
  }
  return json({ ok: true, welcome, token_hash: tokenHash });
}

async function resendSignup(admin: ReturnType<typeof createClient>, body: Record<string, unknown>) {
  const email = String(body.email ?? "").trim().toLowerCase();
  const { data: userId } = await admin.rpc("user_id_for_email", { p_email: email });
  if (!userId) return json({ ok: true });
  const { data: profile } = await admin.from("profiles").select("email_confirmed").eq("id", userId).maybeSingle();
  if (profile?.email_confirmed) return json({ error: "already_confirmed" }, 409);
  const issued = await issueCode(admin, userId, email, "signup");
  if (issued.error) return json({ error: issued.error }, 429);
  await sendMail(email, "Your Xoundra code", codeMail(issued.code, "Confirm your email", "Enter this code in Xoundra to finish creating your account."), `Your Xoundra code is ${issued.code}`);
  return json({ ok: true });
}

async function passwordMatches(url: string, anon: string, email: string, password: string) {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return response.ok;
}

async function recent(admin: ReturnType<typeof createClient>, userId: string) {
  const { data } = await admin.rpc("user_session_is_recent", { p_user: userId });
  return data === true;
}

async function startEmailChange(admin: ReturnType<typeof createClient>, url: string, anon: string, user: { id: string; email?: string }, body: Record<string, unknown>) {
  const next = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.current_password ?? "");
  const current = (user.email ?? "").toLowerCase();
  if (!next || !next.includes("@") || next === current) return json({ error: "invalid_email" }, 400);
  if (!(await passwordMatches(url, anon, current, password))) return json({ error: "wrong_password" }, 401);
  const { data: taken } = await admin.rpc("user_id_for_email", { p_email: next });
  if (taken) return json({ error: "email_taken" }, 409);
  const oldCode = await issueCode(admin, user.id, current, "email_old");
  if (oldCode.error) return json({ error: oldCode.error }, 429);
  const newCode = await issueCode(admin, user.id, next, "email_new");
  if (newCode.error) return json({ error: newCode.error }, 429);
  await sendMail(current, "Approve your Xoundra email change", codeMail(oldCode.code, "Approve this change", "Enter this code from your current address before the email on your account can change."), `Your current-email code is ${oldCode.code}`);
  await sendMail(next, "Confirm your new Xoundra email", codeMail(newCode.code, "Confirm this address", "Enter this code to make this the email on your Xoundra account."), `Your new-email code is ${newCode.code}`);
  return json({ ok: true });
}

async function confirmEmailChange(admin: ReturnType<typeof createClient>, user: { id: string; email?: string }, body: Record<string, unknown>) {
  const next = String(body.email ?? "").trim().toLowerCase();
  const oldCode = String(body.old_code ?? "").replace(/\D/g, "");
  const newCode = String(body.new_code ?? "").replace(/\D/g, "");
  const current = (user.email ?? "").toLowerCase();
  if (oldCode.length !== 6 || newCode.length !== 6) return json({ error: "invalid_code" }, 400);
  const oldOk = await codeMatches(admin, user.id, current, "email_old", oldCode);
  const newOk = await codeMatches(admin, user.id, next, "email_new", newCode);
  if (!oldOk || !newOk) return json({ error: "invalid_code" }, 400);
  await consumeCode(admin, user.id, current, "email_old", oldCode);
  await consumeCode(admin, user.id, next, "email_new", newCode);
  const { error } = await admin.auth.admin.updateUserById(user.id, { email: next, email_confirm: true });
  if (error) return json({ error: "email_update_failed" }, 400);
  return json({ ok: true, email: next });
}

async function changePassword(admin: ReturnType<typeof createClient>, url: string, anon: string, user: { id: string; email?: string }, body: Record<string, unknown>) {
  const currentPassword = String(body.current_password ?? "");
  const next = String(body.password ?? "");
  if (passwordProblems(next).length) return json({ error: "weak_password" }, 400);
  if (!(await recent(admin, user.id))) return json({ error: "sign_in_again" }, 401);
  const email = (user.email ?? "").toLowerCase();
  if (!(await passwordMatches(url, anon, email, currentPassword))) return json({ error: "wrong_password" }, 401);
  const { error } = await admin.auth.admin.updateUserById(user.id, { password: next });
  if (error) return json({ error: "password_update_failed" }, 400);
  return json({ ok: true });
}

async function deleteAccount(admin: ReturnType<typeof createClient>, url: string, anon: string, user: { id: string; email?: string }, body: Record<string, unknown>) {
  const password = String(body.current_password ?? "");
  if (!(await recent(admin, user.id))) return json({ error: "sign_in_again" }, 401);
  if (!(await passwordMatches(url, anon, (user.email ?? "").toLowerCase(), password))) return json({ error: "wrong_password" }, 401);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: "delete_failed" }, 400);
  return json({ ok: true });
}

async function supportMessage(user: { email?: string }, body: Record<string, unknown>) {
  const message = String(body.message ?? "").trim();
  if (message.length < 4) return json({ error: "missing_details" }, 400);
  const from = user.email ?? "unknown";
  const html = shell("A note from the app", `<p style="margin:0;">${escapeHtml(from)} wrote:</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;"><tr><td style="background:#0B1018;border-left:3px solid #8BE1CF;border-radius:12px;padding:16px 18px;font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#F3F6F8;">${escapeHtml(message)}</td></tr></table>`);
  await sendMail(supportEmail, "Xoundra support", html, `${from}\n\n${message}`);
  return json({ ok: true });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] ?? char));
}

async function adminOverview(admin: ReturnType<typeof createClient>, user: { id: string }) {
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!role) return json({ error: "not_admin" }, 403);
  const [people, premium, tracks, slots, purchases] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("entitlements").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("tracks").select("id", { count: "exact", head: true }).eq("status", "published"),
    admin.rpc("lifetime_slots_remaining"),
    admin.from("purchases").select("id, plan_id, status, amount_minor, currency, created_at").order("created_at", { ascending: false }).limit(8),
  ]);
  return json({
    people: people.count ?? 0,
    premium: premium.count ?? 0,
    tracks: tracks.count ?? 0,
    lifetime_remaining: slots.data ?? 0,
    purchases: purchases.data ?? [],
  });
}
