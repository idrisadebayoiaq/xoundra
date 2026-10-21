import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const supportEmail = "xoundra.support@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!secret) return json({ error: "paystack_secret_missing" }, 500);

  const admin = createClient(supabaseUrl, service);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "charge");

  if (action === "renew_due") {
    const cron = Deno.env.get("BILLING_CRON_SECRET") ?? "";
    if (!cron || req.headers.get("x-billing-cron") !== cron) return json({ error: "not_allowed" }, 401);
    return json(await renewDue(admin, secret));
  }

  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user?.email) return json({ error: "sign_in_required" }, 401);
  const user = userData.user;

  if (action === "cards") return json({ cards: await listCards(admin, user.id) });
  if (action === "remove") return json(await removeCard(admin, user, String(body.card_id ?? "")));
  if (action === "submit_pin") return json(await submitExtra(admin, secret, user, body, "pin"));
  if (action === "submit_otp") return json(await submitExtra(admin, secret, user, body, "otp"));
  if (action === "finish") return json(await finishReference(admin, secret, user, String(body.reference ?? ""), String(body.plan_id ?? ""), body.save_card !== false));
  if (action === "charge_saved") return json(await chargeSaved(admin, secret, user, String(body.plan_id ?? ""), String(body.card_id ?? "")));
  if (action === "renew_mine") return json(await renewDue(admin, secret));

  return json(await chargeNew(admin, secret, user, body));
});

function json(payload: unknown, status = 200) {
  return Response.json(payload, { status, headers: cors });
}

async function paystack(secret: string, path: string, init?: RequestInit) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return await response.json();
}

async function chargeNew(admin: ReturnType<typeof createClient>, secret: string, user: { id: string; email?: string }, body: Record<string, unknown>) {
  const planId = String(body.plan_id ?? "");
  const card = body.card as Record<string, string> | undefined;
  const number = String(card?.number ?? "").replace(/\D/g, "");
  const cvv = String(card?.cvv ?? "").replace(/\D/g, "");
  const expiryMonth = String(card?.expiry_month ?? "").padStart(2, "0");
  const expiryYear = String(card?.expiry_year ?? "").slice(-2);
  if (number.length < 12 || cvv.length < 3 || expiryMonth.length !== 2 || expiryYear.length !== 2) {
    return { error: "card_incomplete" };
  }
  const prepared = await preparePurchase(admin, user.id, planId);
  if (prepared.error) return prepared;
  const result = await paystack(secret, "/charge", {
    method: "POST",
    body: JSON.stringify({
      email: user.email,
      amount: prepared.amount,
      currency: "NGN",
      card: { number, cvv, expiry_month: expiryMonth, expiry_year: expiryYear },
      metadata: { user_id: user.id, plan_id: planId, purchase_id: prepared.purchaseId },
    }),
  });
  if (!result.status) {
    await failPurchase(admin, prepared.purchaseId);
    return { error: "charge_failed", message: result.message || "The card was declined." };
  }
  return await interpret(admin, secret, user, planId, prepared.purchaseId, result.data, body.save_card !== false);
}

async function chargeSaved(admin: ReturnType<typeof createClient>, secret: string, user: { id: string; email?: string }, planId: string, cardId: string) {
  const { data: card } = await admin.from("saved_cards").select("*").eq("id", cardId).eq("user_id", user.id).maybeSingle();
  if (!card) return { error: "card_missing" };
  const prepared = await preparePurchase(admin, user.id, planId);
  if (prepared.error) return prepared;
  const result = await paystack(secret, "/transaction/charge_authorization", {
    method: "POST",
    body: JSON.stringify({
      email: user.email,
      amount: prepared.amount,
      currency: "NGN",
      authorization_code: card.authorization_code,
      metadata: { user_id: user.id, plan_id: planId, purchase_id: prepared.purchaseId },
    }),
  });
  if (!result.status) {
    await failPurchase(admin, prepared.purchaseId);
    return { error: "charge_failed", message: result.message || "The saved card was declined." };
  }
  return await interpret(admin, secret, user, planId, prepared.purchaseId, result.data, true);
}

async function submitExtra(admin: ReturnType<typeof createClient>, secret: string, user: { id: string; email?: string }, body: Record<string, unknown>, kind: "pin" | "otp") {
  const reference = String(body.reference ?? "");
  const planId = String(body.plan_id ?? "");
  const value = String(body.value ?? "").replace(/\D/g, "");
  if (!reference || !value) return { error: "card_incomplete" };
  const path = kind === "pin" ? "/charge/submit_pin" : "/charge/submit_otp";
  const payload = kind === "pin" ? { pin: value, reference } : { otp: value, reference };
  const result = await paystack(secret, path, { method: "POST", body: JSON.stringify(payload) });
  if (!result.status) return { error: "charge_failed", message: result.message || "That code was not accepted." };
  return await interpret(admin, secret, user, planId, String(body.purchase_id ?? ""), result.data, body.save_card !== false);
}

async function finishReference(admin: ReturnType<typeof createClient>, secret: string, user: { id: string; email?: string }, reference: string, planId: string, saveCard: boolean) {
  if (!reference) return { error: "charge_failed" };
  const result = await paystack(secret, `/transaction/verify/${reference}`);
  return await interpret(admin, secret, user, planId, String(result?.data?.metadata?.purchase_id ?? ""), result.data, saveCard);
}

async function interpret(admin: ReturnType<typeof createClient>, secret: string, user: { id: string; email?: string }, planId: string, purchaseId: string, data: Record<string, unknown> | undefined, saveCard = true) {
  const status = String(data?.status ?? "");
  const reference = String(data?.reference ?? "");
  if (status === "send_pin" || status === "send_otp" || status === "open_url") {
    return { status, reference, purchase_id: purchaseId, url: data?.url ?? "" };
  }
  if (status !== "success") {
    const verified = reference ? await paystack(secret, `/transaction/verify/${reference}`) : null;
    if (verified?.data?.status !== "success") {
      if (purchaseId) await failPurchase(admin, purchaseId);
      return { error: "charge_failed", message: "The payment is not complete." };
    }
    data = verified.data;
  }
  const payment = data as Record<string, unknown>;
  const paidReference = String(payment.reference ?? reference);
  const amount = Number(payment.amount);
  const brand = String((payment.authorization as Record<string, string> | undefined)?.brand ?? (payment.authorization as Record<string, string> | undefined)?.card_type ?? "");
  const confirmed = await admin.rpc("confirm_paystack_purchase", {
    p_purchase_id: purchaseId,
    p_reference: paidReference,
    p_currency: "NGN",
    p_amount: amount,
    p_brand: brand,
  });
  if (confirmed.error || (confirmed.data !== "granted" && confirmed.data !== "duplicate")) {
    return { error: "charge_failed", message: "The payment could not be recorded." };
  }
  const card = saveCard
    ? await rememberCard(admin, user.id, payment.authorization as Record<string, unknown> | undefined)
    : null;
  if (!saveCard) await admin.from("saved_cards").delete().eq("user_id", user.id);
  await rememberRenewal(admin, user, planId, card);
  await sendSuccess(user.email || "", planId, card?.last4 || "");
  return { ok: true, cards: await listCards(admin, user.id) };
}

async function preparePurchase(admin: ReturnType<typeof createClient>, userId: string, planId: string) {
  const { data: price, error: priceError } = await admin.from("plan_prices").select("amount_minor, interval").eq("plan_id", planId).eq("currency", "NGN").maybeSingle();
  if (priceError || !price || Number(price.amount_minor) <= 0) return { error: "unknown_plan" };
  price.amount_minor = Number(price.amount_minor);
  const { data: profile } = await admin.from("profiles").select("country_code").eq("id", userId).maybeSingle();
  const { data: purchase, error } = await admin.from("purchases").insert({
    user_id: userId,
    plan_id: planId,
    currency: "NGN",
    amount_minor: price.amount_minor,
    status: "pending",
    country_code: profile?.country_code ?? "NG",
  }).select("id").single();
  if (error || !purchase) return { error: "purchase_create_failed" };
  if (planId === "founding_lifetime") {
    const { error: slotError } = await admin.rpc("reserve_lifetime_slot", { p_user: userId, p_purchase: purchase.id });
    if (slotError) {
      await admin.from("purchases").update({ status: "failed" }).eq("id", purchase.id);
      return { error: "sold_out" };
    }
  }
  return { purchaseId: purchase.id, amount: price.amount_minor, interval: price.interval };
}

async function failPurchase(admin: ReturnType<typeof createClient>, purchaseId: string) {
  await admin.rpc("release_lifetime_slot", { p_purchase: purchaseId });
  await admin.from("purchases").update({ status: "failed" }).eq("id", purchaseId);
}

async function rememberCard(admin: ReturnType<typeof createClient>, userId: string, authorization: Record<string, unknown> | undefined) {
  const code = String(authorization?.authorization_code ?? "");
  if (!code) return null;
  const last4 = String(authorization?.last4 ?? "");
  const brand = String(authorization?.brand ?? authorization?.card_type ?? "Card");
  const reusable = authorization?.reusable === true;
  await admin.from("saved_cards").delete().eq("user_id", userId);
  const { data } = await admin.from("saved_cards").insert({
    user_id: userId,
    authorization_code: code,
    last4,
    brand,
    exp_month: String(authorization?.exp_month ?? ""),
    exp_year: String(authorization?.exp_year ?? ""),
    reusable,
  }).select("id, last4, brand, reusable").single();
  return data;
}

async function rememberRenewal(admin: ReturnType<typeof createClient>, user: { id: string; email?: string }, planId: string, card: { id?: string; last4?: string; reusable?: boolean; brand?: string } | null) {
  if (planId === "founding_lifetime") {
    await admin.from("renewals").delete().eq("user_id", user.id);
    return;
  }
  const months = planId === "premium_annual" ? 12 : 1;
  const next = new Date();
  next.setMonth(next.getMonth() + months);
  const canRenew = Boolean(card?.reusable) && !/amex|american express/i.test(card?.brand || "");
  await admin.from("renewals").upsert({
    user_id: user.id,
    plan_id: planId,
    saved_card_id: canRenew ? card?.id ?? null : null,
    next_charge_at: next.toISOString(),
    period_end: next.toISOString(),
    status: canRenew ? "active" : "needs_card",
    notice_sent_at: null,
    updated_at: new Date().toISOString(),
  });
  if (!canRenew && user.email) {
    await sendRenewalNeeded(user.email, next.toISOString());
  }
}

async function listCards(admin: ReturnType<typeof createClient>, userId: string) {
  const { data } = await admin.from("saved_cards").select("id, last4, brand, exp_month, exp_year, reusable").eq("user_id", userId).order("created_at", { ascending: false });
  return data ?? [];
}

async function removeCard(admin: ReturnType<typeof createClient>, user: { id: string; email?: string }, cardId: string) {
  const { data: renewal } = await admin.from("renewals").select("period_end, plan_id").eq("user_id", user.id).maybeSingle();
  await admin.from("saved_cards").delete().eq("user_id", user.id).eq("id", cardId);
  if (renewal && renewal.plan_id !== "founding_lifetime") {
    await admin.from("renewals").update({
      saved_card_id: null,
      status: "needs_card",
      notice_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    if (user.email) await sendRenewalNeeded(user.email, renewal.period_end);
  }
  return { ok: true, cards: await listCards(admin, user.id) };
}

async function renewDue(admin: ReturnType<typeof createClient>, secret: string) {
  const now = new Date().toISOString();
  const { data: due } = await admin.from("renewals").select("user_id, plan_id, saved_card_id, next_charge_at, period_end, status, notice_sent_at").lte("next_charge_at", now);
  let charged = 0;
  for (const row of due ?? []) {
    if (!row.saved_card_id || row.status !== "active") {
      if (!row.notice_sent_at) {
        const { data: profile } = await admin.auth.admin.getUserById(row.user_id);
        if (profile.user?.email) await sendRenewalNeeded(profile.user.email, row.period_end);
        await admin.from("renewals").update({ notice_sent_at: now, status: "needs_card" }).eq("user_id", row.user_id);
      }
      continue;
    }
    const { data: account } = await admin.auth.admin.getUserById(row.user_id);
    if (!account.user?.email) continue;
    const result = await chargeSaved(admin, secret, account.user, row.plan_id, row.saved_card_id);
    if (result.ok) charged += 1;
    else if (!row.notice_sent_at) {
      await sendRenewalNeeded(account.user.email, row.period_end);
      await admin.from("renewals").update({ notice_sent_at: now, status: "needs_card", saved_card_id: null }).eq("user_id", row.user_id);
    }
  }
  return { ok: true, charged };
}

function planLabel(planId: string) {
  if (planId === "premium_annual") return "Annual";
  if (planId === "founding_lifetime") return "Lifetime";
  return "Monthly";
}

function shell(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#07080D;color:#F3F6F8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07080D;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#101725;border:1px solid #243044;border-radius:28px;">
        <tr><td style="height:4px;background:#8BE1CF;border-radius:28px 28px 0 0;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:36px 32px 32px;">
          <div style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.28em;color:#8BE1CF;">XOUNDRA</div>
          <div style="font-family:Georgia,serif;font-size:34px;line-height:1.2;color:#F3F6F8;padding-top:18px;">${title}</div>
          <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#C5CED6;padding-top:16px;">${body}</div>
          <div style="font-family:Arial,sans-serif;font-size:12px;color:#8E98A3;padding-top:32px;">Find your quiet.</div>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

async function sendMail(to: string, subject: string, html: string, text: string) {
  const password = Deno.env.get("SMTP_APP_PASSWORD") ?? "";
  if (!password || !to) return;
  const client = new SMTPClient({
    connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: supportEmail, password } },
  });
  await client.send({ from: `Xoundra <${supportEmail}>`, to, subject, content: text, html });
  await client.close();
}

async function sendSuccess(to: string, planId: string, last4: string) {
  const name = planLabel(planId);
  const card = last4 ? ` The card ending ${last4} is saved for the next charge.` : "";
  const renew = planId === "founding_lifetime"
    ? "Lifetime is a single payment. It does not renew."
    : "If the card stays on the account, the same plan is charged again when the period ends.";
  const body = `<p style="margin:0;">Your ${name} plan is active.${card}</p><p style="margin:16px 0 0;">${renew}</p><p style="margin:16px 0 0;">Premium includes mixes, offline downloads, a sleep timer that starts and stops on a schedule, and the voice guide.</p>`;
  try {
    await sendMail(to, "Your Xoundra plan is active", shell("Premium is on", body), `Your ${name} plan is active.`);
  } catch {
    // the payment still stands if mail fails
  }
}

async function sendRenewalNeeded(to: string, periodEnd: string | null) {
  const when = periodEnd ? new Date(periodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "the end of this period";
  const body = `<p style="margin:0;">The card for your Xoundra plan is no longer saved.</p><p style="margin:16px 0 0;">Premium stays on until ${when}. Add a Visa, Mastercard, Verve, or Amex before then if you want the plan to continue.</p><p style="margin:16px 0 0;">Open Xoundra, go to Plans, and add a card.<br>xoundra.vercel.app</p>`;
  try {
    await sendMail(to, "Add a card for your next Xoundra renewal", shell("Add a card", body), `Add a card before ${when} so your Xoundra plan can renew.`);
  } catch {
    // notice can be sent again on the next check
  }
}
