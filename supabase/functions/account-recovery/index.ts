import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMOJI_POOL: { char: string; name: string }[] = [
  { char: "🍉", name: "watermelon" },
  { char: "🌙", name: "crescent moon" },
  { char: "⭐", name: "star" },
  { char: "🕌", name: "mosque" },
  { char: "📖", name: "book" },
  { char: "🌴", name: "palm tree" },
  { char: "☕", name: "cup" },
  { char: "🔑", name: "key" },
  { char: "🍇", name: "grapes" },
  { char: "🐪", name: "camel" },
  { char: "💧", name: "water drop" },
  { char: "🌹", name: "rose" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function makeRecoveryCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes).map((b) => alphabet[b % alphabet.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}-${chars.slice(12, 16).join("")}`;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  try {
    const body = await req.json();
    const action = String(body?.action || "");

    // ---------- 1. Issue a spam-protection puzzle ----------
    if (action === "challenge") {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("signup_challenges")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .gte("created_at", since);
      if ((count ?? 0) > 20) return json({ error: "Too many attempts. Please try again later." }, 429);

      const options = shuffle(EMOJI_POOL).slice(0, 5);
      const target = options[Math.floor(Math.random() * options.length)];

      const { data, error } = await supabase
        .from("signup_challenges")
        .insert({ answer: target.char, ip })
        .select("id")
        .single();
      if (error) throw error;

      return json({
        challengeId: data.id,
        prompt: `Tap the ${target.name}`,
        options: options.map((o) => o.char),
      });
    }

    // ---------- 2. Create an account (puzzle-verified, no email needed) ----------
    if (action === "signup") {
      const { challengeId, answer, email, password, displayName } = body ?? {};
      if (!challengeId || !answer || !email || !password) return json({ error: "Missing fields" }, 400);
      if (String(password).length < 6) return json({ error: "Password must be at least 6 characters" }, 400);

      const { data: ch } = await supabase
        .from("signup_challenges")
        .select("id, answer, consumed, expires_at")
        .eq("id", challengeId)
        .maybeSingle();

      if (!ch || ch.consumed || new Date(ch.expires_at) < new Date())
        return json({ error: "Puzzle expired — please try again." }, 400);

      await supabase.from("signup_challenges").update({ consumed: true }).eq("id", ch.id);
      if (ch.answer !== answer) return json({ error: "Wrong pick — please try the new puzzle." }, 400);

      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: String(email).trim().toLowerCase(),
        password: String(password),
        email_confirm: true,
        user_metadata: { display_name: displayName || String(email).split("@")[0] },
      });
      if (createErr || !created.user) return json({ error: createErr?.message || "Could not create account" }, 400);

      const code = makeRecoveryCode();
      await supabase.from("account_recovery").upsert({
        user_id: created.user.id,
        code_hash: await sha256(`${created.user.id}:${code}`),
        created_at: new Date().toISOString(),
        used_at: null,
      });

      return json({ success: true, recoveryCode: code });
    }

    // ---------- 3. Recover the account with the code ----------
    if (action === "recover") {
      const { email, code, newPassword } = body ?? {};
      if (!email || !code || !newPassword) return json({ error: "Missing fields" }, 400);
      if (String(newPassword).length < 6) return json({ error: "Password must be at least 6 characters" }, 400);

      const target = String(email).trim().toLowerCase();
      let userId: string | null = null;
      for (let page = 1; page <= 20 && !userId; page++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        const hit = data.users.find((u) => (u.email || "").toLowerCase() === target);
        if (hit) userId = hit.id;
        if (data.users.length < 200) break;
      }
      if (!userId) return json({ error: "Email or recovery code is incorrect" }, 400);

      const { data: rec } = await supabase
        .from("account_recovery")
        .select("code_hash, used_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (!rec || rec.used_at) return json({ error: "Email or recovery code is incorrect" }, 400);

      const given = await sha256(`${userId}:${String(code).trim().toUpperCase()}`);
      if (given !== rec.code_hash) return json({ error: "Email or recovery code is incorrect" }, 400);

      const { error: updErr } = await supabase.auth.admin.updateUserById(userId, {
        password: String(newPassword),
      });
      if (updErr) return json({ error: updErr.message }, 400);

      const nextCode = makeRecoveryCode();
      await supabase.from("account_recovery").upsert({
        user_id: userId,
        code_hash: await sha256(`${userId}:${nextCode}`),
        created_at: new Date().toISOString(),
        used_at: null,
      });

      return json({ success: true, recoveryCode: nextCode });
    }

    // ---------- 4. Signed-in user asks for a brand-new code ----------
    if (action === "regenerate") {
      const authHeader = req.headers.get("Authorization") || "";
      const { data: userData, error: authErr } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", ""),
      );
      if (authErr || !userData.user) return json({ error: "Unauthorized" }, 401);

      const code = makeRecoveryCode();
      await supabase.from("account_recovery").upsert({
        user_id: userData.user.id,
        code_hash: await sha256(`${userData.user.id}:${code}`),
        created_at: new Date().toISOString(),
        used_at: null,
      });
      return json({ success: true, recoveryCode: code });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
