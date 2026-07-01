import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Records a purchase in the Mailchimp e-commerce store so their built-in
 * "product recommendations" and purchase-based automations can work.
 *
 * Body shape:
 *   {
 *     email: string,           // buyer
 *     first_name?: string,
 *     last_name?: string,
 *     order: {
 *       id: string,            // idempotency key e.g. "ticket:<uuid>"
 *       total: number,         // dollars
 *       lines: [{ id: string, product_id: string, product_title: string,
 *                 quantity: number, price: number, category?: string }]
 *     }
 *   }
 *
 * Products are upserted on demand from the line's product_id/title so the
 * caller doesn't have to pre-register them.
 */

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("MAILCHIMP_API_KEY");
  const server = Deno.env.get("MAILCHIMP_SERVER_PREFIX");
  const audienceId = Deno.env.get("MAILCHIMP_AUDIENCE_ID");
  if (!apiKey || !server || !audienceId) return json({ error: "Mailchimp not configured" }, 500);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: storeCfg } = await admin
    .from("app_config").select("value").eq("key", "mailchimp_store").maybeSingle();
  const storeId = storeCfg?.value?.id;
  if (!storeId) return json({ error: "Store not bootstrapped" }, 500);

  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }

  const email = String(body?.email || "").toLowerCase().trim();
  const order = body?.order;
  if (!email || !order?.id || !Array.isArray(order?.lines) || order.lines.length === 0) {
    return json({ error: "Missing email/order" }, 400);
  }

  const base = `https://${server}.api.mailchimp.com/3.0`;
  const auth = "Basic " + btoa(`anystring:${apiKey}`);
  const mc = (path: string, init?: RequestInit) =>
    fetch(`${base}${path}`, {
      ...init,
      headers: { Authorization: auth, "Content-Type": "application/json", ...(init?.headers || {}) },
    });

  // Ensure customer exists (upsert)
  const customerId = email; // deterministic
  await mc(`/ecommerce/stores/${storeId}/customers/${encodeURIComponent(customerId)}`, {
    method: "PUT",
    body: JSON.stringify({
      id: customerId,
      email_address: email,
      opt_in_status: true,
      first_name: body.first_name || undefined,
      last_name: body.last_name || undefined,
    }),
  }).catch(() => {});

  // Ensure each product exists
  for (const line of order.lines) {
    const pid = String(line.product_id);
    const pRes = await mc(`/ecommerce/stores/${storeId}/products/${encodeURIComponent(pid)}`);
    if (pRes.status === 404) {
      await mc(`/ecommerce/stores/${storeId}/products`, {
        method: "POST",
        body: JSON.stringify({
          id: pid,
          title: line.product_title || "Kenworthy item",
          type: line.category || "general",
          variants: [{ id: pid, title: line.product_title || pid, price: Number(line.price) || 0 }],
        }),
      }).catch(() => {});
    }
  }

  // Idempotent order create (409 on duplicate id is fine)
  const orderPayload = {
    id: String(order.id),
    customer: { id: customerId, email_address: email, opt_in_status: true },
    currency_code: "USD",
    order_total: Number(order.total) || 0,
    lines: order.lines.map((l: any, i: number) => ({
      id: String(l.id || `${order.id}-${i}`),
      product_id: String(l.product_id),
      product_variant_id: String(l.product_id),
      quantity: Number(l.quantity) || 1,
      price: Number(l.price) || 0,
    })),
    processed_at_foreign: new Date().toISOString(),
  };
  const orderRes = await mc(`/ecommerce/stores/${storeId}/orders`, {
    method: "POST",
    body: JSON.stringify(orderPayload),
  });
  if (!orderRes.ok && orderRes.status !== 409) {
    const detail = await orderRes.json().catch(() => ({}));
    console.error("[mailchimp-ecommerce] order failed", orderRes.status, detail);
    return json({ error: "Order create failed", detail }, 502);
  }

  return json({ ok: true });
});