import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const callbackUrl = "https://mmgezkeemyjxluxcshaz.supabase.co/functions/v1/paystack-callback";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!secret) {
    return Response.json({ error: "paystack_secret_missing" }, { status: 500, headers: cors });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user?.email) {
    return Response.json({ error: "sign_in_required" }, { status: 401, headers: cors });
  }

  const body = await req.json();
  const planId = String(body.plan_id ?? "");
  const surface = body.surface === "web" ? "web" : "app";
  const admin = createClient(supabaseUrl, service);
  const userId = userData.user.id;

  const { data: profile } = await admin.from("profiles").select("country_code").eq("id", userId).single();
  const { data: country } = await admin.from("countries").select("*").eq("code", profile?.country_code ?? "NG").single();
  const displayCurrency = country?.display_currency ?? "NGN";
  const { data: chargePrice } = await admin
    .from("plan_prices")
    .select("*")
    .eq("plan_id", planId)
    .eq("currency", "NGN")
    .maybeSingle();
  const { data: displayPrice } = await admin
    .from("plan_prices")
    .select("amount_minor, currency")
    .eq("plan_id", planId)
    .eq("currency", displayCurrency)
    .maybeSingle();

  if (!chargePrice || chargePrice.amount_minor <= 0) {
    return Response.json({ error: "unknown_plan" }, { status: 400, headers: cors });
  }
  if (chargePrice.interval !== "once" && chargePrice.interval !== "none" && !chargePrice.paystack_plan_code) {
    return Response.json({ error: "plan_not_configured" }, { status: 409, headers: cors });
  }

  const channels = surface === "web" && country?.local_web_methods
    ? ["card", "bank", "bank_transfer", "ussd"]
    : ["card"];

  const { data: purchase, error: purchaseError } = await admin
    .from("purchases")
    .insert({
      user_id: userId,
      plan_id: planId,
      currency: "NGN",
      amount_minor: chargePrice.amount_minor,
      status: "pending",
      country_code: country?.code ?? "NG",
    })
    .select("id")
    .single();
  if (purchaseError || !purchase) {
    return Response.json({ error: "purchase_create_failed" }, { status: 500, headers: cors });
  }

  if (planId === "founding_lifetime") {
    const { error: slotError } = await admin.rpc("reserve_lifetime_slot", {
      p_user: userId,
      p_purchase: purchase.id,
    });
    if (slotError) {
      await admin.from("purchases").update({ status: "failed" }).eq("id", purchase.id);
      return Response.json({ error: "sold_out" }, { status: 409, headers: cors });
    }
  }

  const payload: Record<string, unknown> = {
    email: userData.user.email,
    amount: chargePrice.amount_minor,
    currency: "NGN",
    channels,
    callback_url: callbackUrl,
    metadata: {
      user_id: userId,
      plan_id: planId,
      purchase_id: purchase.id,
      country_code: country?.code ?? "NG",
    },
  };
  if (chargePrice.paystack_plan_code) payload.plan = chargePrice.paystack_plan_code;

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!result.status) {
    await admin.rpc("release_lifetime_slot", { p_purchase: purchase.id });
    await admin.from("purchases").update({ status: "failed" }).eq("id", purchase.id);
    return Response.json({ error: "paystack_initialize_failed" }, { status: 502, headers: cors });
  }

  await admin.from("purchases").update({ provider_reference: result.data.reference }).eq("id", purchase.id);
  return Response.json({
    authorization_url: result.data.authorization_url,
    reference: result.data.reference,
    purchase_id: purchase.id,
    display_currency: displayPrice?.currency ?? "NGN",
    display_amount_minor: displayPrice?.amount_minor ?? chargePrice.amount_minor,
    charge_currency: "NGN",
    charge_amount_minor: chargePrice.amount_minor,
  }, { headers: cors });
});
