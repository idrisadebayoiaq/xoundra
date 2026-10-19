import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const encoder = new TextEncoder();

async function sign(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(mac))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("ok");
  }

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  if (!secret || signature !== await sign(secret, raw)) {
    return new Response("invalid signature", { status: 401 });
  }

  const event = JSON.parse(raw);
  const data = event.data ?? {};
  const reference = data.reference ?? data.transaction_reference ?? data.id?.toString() ?? "";
  const eventId = `${event.event}:${reference || crypto.randomUUID()}`;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { error: insertError } = await admin.from("webhook_events").insert({
    id: eventId,
    provider: "paystack",
    event_type: event.event,
    reference,
    payload: event,
  });
  if (insertError) {
    return Response.json({ received: true, duplicate: true });
  }

  if (event.event === "charge.success" && reference) {
    const verified = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await verified.json();
    const payment = body?.data;
    if (payment?.status === "success") {
      const purchaseId = payment.metadata?.purchase_id;
      if (purchaseId) {
        await admin.rpc("confirm_paystack_purchase", {
          p_purchase_id: purchaseId,
          p_reference: reference,
          p_currency: payment.currency,
          p_amount: payment.amount,
          p_brand: payment.authorization?.brand ?? "",
        });
      }
    }
  }

  if (event.event === "charge.failed" && data.metadata?.purchase_id) {
    await admin.from("purchases").update({ status: "failed" }).eq("id", data.metadata.purchase_id);
    await admin.rpc("release_lifetime_slot", { p_purchase: data.metadata.purchase_id });
  }

  if (event.event === "refund.processed" && reference) {
    await admin.rpc("revoke_purchase", { p_reference: reference, p_status: "refunded" });
  }

  if (event.event === "subscription.create") {
    const stop = await admin.rpc("record_paystack_subscription", {
      p_email: data.customer?.email ?? "",
      p_code: data.subscription_code,
      p_token: data.email_token,
      p_plan_code: data.plan?.plan_code ?? "",
    });
    if (stop.data === true && data.subscription_code && data.email_token) {
      await fetch("https://api.paystack.co/subscription/disable", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: data.subscription_code, token: data.email_token }),
      });
    }
  }

  return Response.json({ received: true });
});
