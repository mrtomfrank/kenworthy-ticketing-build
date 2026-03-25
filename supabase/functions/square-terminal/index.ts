import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SQUARE_SANDBOX_BASE = "https://connect.squareupsandbox.com/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SQUARE_ACCESS_TOKEN = Deno.env.get("SQUARE_SANDBOX_ACCESS_TOKEN");
  if (!SQUARE_ACCESS_TOKEN) {
    return new Response(
      JSON.stringify({ error: "SQUARE_SANDBOX_ACCESS_TOKEN not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const SQUARE_LOCATION_ID = Deno.env.get("SQUARE_SANDBOX_LOCATION_ID");
  if (!SQUARE_LOCATION_ID) {
    return new Response(
      JSON.stringify({ error: "SQUARE_SANDBOX_LOCATION_ID not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check admin role
  const { data: hasAdmin } = await supabase.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });
  if (!hasAdmin) {
    return new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, ...params } = await req.json();

    if (action === "create_checkout") {
      return await createCheckout(SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, params, corsHeaders);
    }

    if (action === "get_checkout") {
      return await getCheckout(SQUARE_ACCESS_TOKEN, params, corsHeaders);
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Square Terminal error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function createCheckout(
  accessToken: string,
  locationId: string,
  params: { amount_cents: number; note: string; idempotency_key: string; device_id?: string },
  headers: Record<string, string>
) {
  // In sandbox, we can't use real devices. The Terminal API sandbox simulates device behavior.
  // We create a Terminal Checkout that would normally be sent to a Square Terminal device.
  const body: Record<string, unknown> = {
    idempotency_key: params.idempotency_key,
    checkout: {
      amount_money: {
        amount: params.amount_cents,
        currency: "USD",
      },
      device_options: {
        device_id: params.device_id || "SIMULATED_SANDBOX_DEVICE",
        skip_receipt_screen: true,
        collect_signature: false,
        tip_settings: { allow_tipping: false },
      },
      reference_id: params.idempotency_key,
      note: params.note,
      payment_type: "CARD_PRESENT",
    },
  };

  const response = await fetch(`${SQUARE_SANDBOX_BASE}/terminals/checkouts`, {
    method: "POST",
    headers: {
      "Square-Version": "2024-01-18",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    // In sandbox without a real device, Terminal API may return errors.
    // Fall back to a simulated/mock checkout for development.
    console.warn("Square Terminal API returned error (sandbox):", JSON.stringify(data));
    
    return new Response(
      JSON.stringify({
        simulated: true,
        checkout: {
          id: `SIM_${params.idempotency_key}`,
          status: "COMPLETED",
          payment_type: "CARD_PRESENT",
          amount_money: { amount: params.amount_cents, currency: "USD" },
          note: params.note,
          created_at: new Date().toISOString(),
        },
        message: "Sandbox simulation — no real Square Terminal device connected. Payment auto-approved for testing.",
      }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ simulated: false, checkout: data.checkout }),
    { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
  );
}

async function getCheckout(
  accessToken: string,
  params: { checkout_id: string },
  headers: Record<string, string>
) {
  if (params.checkout_id.startsWith("SIM_")) {
    return new Response(
      JSON.stringify({
        simulated: true,
        checkout: {
          id: params.checkout_id,
          status: "COMPLETED",
        },
      }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  const response = await fetch(
    `${SQUARE_SANDBOX_BASE}/terminals/checkouts/${params.checkout_id}`,
    {
      headers: {
        "Square-Version": "2024-01-18",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Square API error [${response.status}]: ${JSON.stringify(data)}`);
  }

  return new Response(
    JSON.stringify({ simulated: false, checkout: data.checkout }),
    { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
  );
}
