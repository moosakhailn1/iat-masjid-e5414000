import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

const planFromProductName = (name: string | null | undefined) => {
  const normalized = (name || "").toLowerCase();
  if (normalized.includes("imam")) return "Imam AI";
  if (normalized.includes("scholar")) return "Scholar AI";
  if (normalized.includes("student")) return "Student AI";
  if (normalized.includes("seeker")) return "Seeker AI";
  return null;
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    if (!supabaseUrl || !serviceRoleKey || !stripeKey) {
      throw new Error("Missing required backend secrets");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData.user;
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const normalizedEmail = user.email.trim().toLowerCase();
    const customers = await stripe.customers.list({ email: normalizedEmail, limit: 1 });

    let targetPlan: string | null = null;
    let expiresAt: string | null = null;

    if (customers.data.length > 0) {
      const customer = customers.data[0];

      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 10,
        expand: ["data.items.data.price.product"],
      });

      if (subscriptions.data.length > 0) {
        const latestSub = subscriptions.data.sort((a, b) => b.created - a.created)[0];
        const product = latestSub.items.data[0]?.price?.product;
        const productName = typeof product === "string" ? "" : product?.name;
        targetPlan = planFromProductName(productName);
        expiresAt = new Date(latestSub.current_period_end * 1000).toISOString();
      }

      if (!targetPlan) {
        const sessions = await stripe.checkout.sessions.list({
          customer: customer.id,
          limit: 20,
        });

        const completedSessions = sessions.data
          .filter((s) => s.status === "complete" && ["paid", "no_payment_required"].includes(s.payment_status || ""))
          .sort((a, b) => b.created - a.created);

        for (const session of completedSessions) {
          const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ["line_items.data.price.product"],
          });

          const lineItem = fullSession.line_items?.data?.[0];
          const product = lineItem?.price?.product;
          const productName = typeof product === "string" ? "" : product?.name;
          const mapped = planFromProductName(productName);

          if (mapped) {
            targetPlan = mapped;
            expiresAt = oneTimeExpiryFromProductName(productName);
            break;
          }
        }
      }
    }

    // Fallback: guest checkout without Stripe customer attached
    if (!targetPlan) {
      const sessions = await stripe.checkout.sessions.list({ limit: 100 });
      const completedSessions = sessions.data
        .filter((s) => s.status === "complete" && ["paid", "no_payment_required"].includes(s.payment_status || ""))
        .sort((a, b) => b.created - a.created);

      for (const session of completedSessions) {
        const sessionEmail = session.customer_details?.email?.trim().toLowerCase();
        if (!sessionEmail || sessionEmail !== normalizedEmail) continue;

        const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["line_items.data.price.product"],
        });

        const lineItem = fullSession.line_items?.data?.[0];
        const product = lineItem?.price?.product;
        const productName = typeof product === "string" ? "" : product?.name;
        const mapped = planFromProductName(productName);

        if (mapped) {
          targetPlan = mapped;
          expiresAt = oneTimeExpiryFromProductName(productName);
          break;
        }
      }
    }

    if (!targetPlan) {
      return new Response(JSON.stringify({ synced: false, reason: "no_paid_plan_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const payload = {
      plan: targetPlan,
      daily_limit: PLAN_LIMITS[targetPlan] ?? 15,
      is_free_grant: false,
      discount_percent: 0,
      granted_by: null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };

    if (existingSub?.id) {
      await supabase.from("user_subscriptions").update(payload).eq("id", existingSub.id);
    } else {
      await supabase.from("user_subscriptions").insert({ user_id: user.id, ...payload });
    }

    return new Response(JSON.stringify({ synced: true, plan: targetPlan, expires_at: expiresAt }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-subscription error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
