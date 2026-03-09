import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_LIMITS: Record<string, number> = {
  "Seeker AI": 50,
  "Student AI": 150,
  "Scholar AI": 500,
  "Imam AI": 999999,
};

const log = (step: string, details?: any) => {
  console.log(`[SYNC] ${step}`, details ? JSON.stringify(details) : "");
};

const planFromProductName = (name: string | null | undefined) => {
  const normalized = (name || "").toLowerCase();
  log("planFromProductName checking", { name, normalized });
  if (normalized.includes("imam")) return "Imam AI";
  if (normalized.includes("scholar")) return "Scholar AI";
  if (normalized.includes("student")) return "Student AI";
  if (normalized.includes("seeker")) return "Seeker AI";
  return null;
};

const planFromPriceId = async (stripe: any, priceId: string) => {
  try {
    const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
    const product = price.product;
    const productName = typeof product === "string" ? "" : product?.name;
    log("planFromPriceId", { priceId, productName });
    return planFromProductName(productName);
  } catch (e) {
    log("planFromPriceId error", { priceId, error: String(e) });
    return null;
  }
};

const oneTimeExpiryFromProductName = (name: string | null | undefined) => {
  const now = new Date();
  const normalized = (name || "").toLowerCase();
  if (normalized.includes("year")) {
    now.setFullYear(now.getFullYear() + 1);
  } else {
    now.setMonth(now.getMonth() + 1);
  }
  return now.toISOString();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    if (!supabaseUrl || !serviceRoleKey || !stripeKey) {
      throw new Error("Missing required backend secrets");
    }
    log("Secrets verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      log("No auth header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user?.email) {
      log("Auth failed", { error: authError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData.user;
    log("User authenticated", { email: user.email, id: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const normalizedEmail = user.email!.trim().toLowerCase();

    // Also load our payment_links table to map price IDs to plans
    const { data: paymentLinksData } = await supabase.from("payment_links").select("*");
    const priceIdToPlan: Record<string, string> = {};
    (paymentLinksData || []).forEach((row: any) => {
      if (row.monthly_price_id) priceIdToPlan[row.monthly_price_id] = row.plan;
      if (row.yearly_price_id) priceIdToPlan[row.yearly_price_id] = row.plan;
    });
    log("Price ID map from DB", priceIdToPlan);

    const customers = await stripe.customers.list({ email: normalizedEmail, limit: 1 });
    log("Stripe customers found", { count: customers.data.length });

    let targetPlan: string | null = null;
    let expiresAt: string | null = null;
    // Unix seconds from Stripe indicating when we last saw a paid purchase/subscription
    // Used to decide whether to override an admin-managed (is_free_grant) plan.
    let evidenceCreated: number | null = null;

    if (customers.data.length > 0) {
      const customer = customers.data[0];
      log("Checking customer", { customerId: customer.id });

      // Check active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 10,
        expand: ["data.items.data.price.product"],
      });
      log("Active subscriptions", { count: subscriptions.data.length });

      if (subscriptions.data.length > 0) {
        const latestSub = subscriptions.data.sort((a: any, b: any) => b.created - a.created)[0];
        const priceId = latestSub.items.data[0]?.price?.id;
        const product = latestSub.items.data[0]?.price?.product;
        const productName = typeof product === "string" ? "" : (product as any)?.name;
        log("Latest subscription", { priceId, productName });

        // Try price ID map first, then product name
        targetPlan = priceIdToPlan[priceId] || planFromProductName(productName);
        expiresAt = new Date(latestSub.current_period_end * 1000).toISOString();
        evidenceCreated = typeof latestSub.created === "number" ? latestSub.created : null;
        log("From subscription", { targetPlan, expiresAt, evidenceCreated });
      }

      // Check completed checkout sessions (one-time payments)
      if (!targetPlan) {
        log("Checking checkout sessions for customer");
        const sessions = await stripe.checkout.sessions.list({
          customer: customer.id,
          limit: 20,
        });

        const completedSessions = sessions.data
          .filter((s: any) => s.status === "complete" && ["paid", "no_payment_required"].includes(s.payment_status || ""))
          .sort((a: any, b: any) => b.created - a.created);

        log("Completed sessions for customer", { count: completedSessions.length });

        for (const session of completedSessions) {
          const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ["line_items.data.price.product"],
          });

          const lineItem = fullSession.line_items?.data?.[0];
          const priceId = lineItem?.price?.id || "";
          const product = lineItem?.price?.product;
          const productName = typeof product === "string" ? "" : (product as any)?.name;
          log("Session line item", { sessionId: session.id, priceId, productName });

          // Try price ID map first, then product name
          const mapped = priceIdToPlan[priceId] || planFromProductName(productName);
          if (mapped) {
            targetPlan = mapped;
            expiresAt = oneTimeExpiryFromProductName(productName);
            evidenceCreated =
              typeof (fullSession as any).created === "number"
                ? (fullSession as any).created
                : typeof (session as any).created === "number"
                  ? (session as any).created
                  : null;
            log("Matched from session", { targetPlan, expiresAt, evidenceCreated });
            break;
          }
        }
      }
    }

    // Fallback: check all recent sessions by email
    if (!targetPlan) {
      log("Fallback: checking all sessions by email");
      const sessions = await stripe.checkout.sessions.list({ limit: 100 });
      const completedSessions = sessions.data
        .filter((s: any) => s.status === "complete" && ["paid", "no_payment_required"].includes(s.payment_status || ""))
        .sort((a: any, b: any) => b.created - a.created);

      for (const session of completedSessions) {
        const sessionEmail = session.customer_details?.email?.trim().toLowerCase();
        if (!sessionEmail || sessionEmail !== normalizedEmail) continue;

        log("Found session by email", { sessionId: session.id });
        const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["line_items.data.price.product"],
        });

        const lineItem = fullSession.line_items?.data?.[0];
        const priceId = lineItem?.price?.id || "";
        const product = lineItem?.price?.product;
        const productName = typeof product === "string" ? "" : (product as any)?.name;

        const mapped = priceIdToPlan[priceId] || planFromProductName(productName);
        if (mapped) {
          targetPlan = mapped;
          expiresAt = oneTimeExpiryFromProductName(productName);
          evidenceCreated =
            typeof (fullSession as any).created === "number"
              ? (fullSession as any).created
              : typeof (session as any).created === "number"
                ? (session as any).created
                : null;
          log("Matched from fallback", { targetPlan, expiresAt, evidenceCreated });
          break;
        }
      }
    }

    if (!targetPlan) {
      log("No paid plan found");
      return new Response(JSON.stringify({ synced: false, reason: "no_paid_plan_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("id, is_free_grant, plan, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    // If admin has manually set/reset a plan, only override it when Stripe evidence is NEWER
    // than the admin action (enables "reset to free" + rebuy).
    if (existingSub?.is_free_grant) {
      const adminUpdatedAtSeconds = existingSub.updated_at
        ? Math.floor(new Date(existingSub.updated_at).getTime() / 1000)
        : null;

      const shouldOverride =
        typeof evidenceCreated === "number" && typeof adminUpdatedAtSeconds === "number" && evidenceCreated > adminUpdatedAtSeconds;

      if (!shouldOverride) {
        log("Skipping - user has admin-managed plan", {
          plan: existingSub.plan,
          adminUpdatedAtSeconds,
          evidenceCreated,
        });
        return new Response(JSON.stringify({ synced: false, reason: "skipped_admin_managed" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      log("Override admin-managed plan due to newer Stripe purchase", {
        plan: existingSub.plan,
        adminUpdatedAtSeconds,
        evidenceCreated,
      });
    }

    const payload = {
      plan: targetPlan,
      daily_limit: PLAN_LIMITS[targetPlan] ?? 15,
      is_free_grant: false,
      discount_percent: 0,
      granted_by: null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };

    log("Updating subscription", { existingId: existingSub?.id, payload });

    if (existingSub?.id) {
      const { error } = await supabase.from("user_subscriptions").update(payload).eq("id", existingSub.id);
      if (error) log("Update error", { error: error.message });
    } else {
      const { error } = await supabase.from("user_subscriptions").insert({ user_id: user.id, ...payload });
      if (error) log("Insert error", { error: error.message });
    }

    log("Sync complete", { plan: targetPlan });
    return new Response(JSON.stringify({ synced: true, plan: targetPlan, expires_at: expiresAt }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log("FATAL ERROR", { error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : "" });
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
