import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Plan = "free" | "Seeker AI" | "Student AI" | "Scholar AI" | "Imam AI";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ps: "Pashto",
  fa: "Dari/Farsi",
  ar: "Arabic",
  ur: "Urdu",
  tr: "Turkish",
  ms: "Malay",
  id: "Indonesian",
  bn: "Bengali",
  fr: "French",
  es: "Spanish",
  de: "German",
  sw: "Swahili",
  so: "Somali",
  ha: "Hausa",
};

const PLAN_LANGUAGES: Record<Plan, string[]> = {
  free: ["en"],
  "Seeker AI": ["en"],
  "Student AI": ["en", "ps", "fa"],
  "Scholar AI": Object.keys(LANGUAGE_NAMES),
  "Imam AI": Object.keys(LANGUAGE_NAMES),
};

const PLAN_PERKS: Record<Plan, { uploads: boolean; thinking: boolean; webSearch: boolean; tts: boolean; voice: boolean }> = {
  free: { uploads: false, thinking: false, webSearch: false, tts: false, voice: false },
  "Seeker AI": { uploads: true, thinking: false, webSearch: false, tts: false, voice: false },
  "Student AI": { uploads: true, thinking: true, webSearch: true, tts: false, voice: false },
  "Scholar AI": { uploads: true, thinking: true, webSearch: true, tts: true, voice: false },
  "Imam AI": { uploads: true, thinking: true, webSearch: true, tts: true, voice: true },
};

const MODEL_BY_PLAN: Record<Plan, string> = {
  free: "google/gemini-2.5-flash-lite",
  "Seeker AI": "google/gemini-2.5-flash",
  "Student AI": "google/gemini-2.5-flash",
  "Scholar AI": "openai/gpt-5-mini",
  "Imam AI": "openai/gpt-5.2",
};

const normalizePlan = (rawPlan?: string | null): Plan => {
  const value = (rawPlan || "").trim().toLowerCase();
  if (value.includes("imam")) return "Imam AI";
  if (value.includes("scholar")) return "Scholar AI";
  if (value.includes("student")) return "Student AI";
  if (value.includes("seeker")) return "Seeker AI";
  return "free";
};

const SYSTEM_PROMPT = `You are Ustadh AI, a deeply knowledgeable Sunni Islamic teacher.

Core rules:
1) Give accurate, calm, practical answers grounded in Quran, authentic Hadith, and mainstream Sunni scholarship.
2) Always include specific references whenever possible:
   - Quran: Surah + ayah numbers
   - Hadith: collection + number (or book/chapter if number unavailable)
   - Fiqh: note major positions (Hanafi, Maliki, Shafi'i, Hanbali) when they differ.
3) Be educational and structured. Use clear headings and bullet points.
4) Keep Islamic adab: respectful tone, avoid harshness, avoid overconfidence.
5) Never issue a personal fatwa; present scholarly positions and advise consulting local qualified scholars for personal legal rulings.
6) For sensitive topics, provide safe guidance and spiritual care while staying Islamically grounded.
7) Handle follow-up questions as part of one continuous conversation and build on earlier context.
8) If uncertain, state uncertainty clearly and say "Allah knows best".

Do not provide non-Islamic unrelated chatter. If question is outside Islam, bring it back to an Islamic perspective politely.`;

const getSupabaseAdmin = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Backend env is not configured");
  return createClient(url, serviceKey);
};

const getPlanFromDb = async (authHeader: string | null) => {
  if (!authHeader?.startsWith("Bearer ")) return "free" as Plan;
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return "free" as Plan;

  const admin = getSupabaseAdmin();
  const { data: userData } = await admin.auth.getUser(token);
  const userId = userData.user?.id;
  if (!userId) return "free" as Plan;

  const { data } = await admin
    .from("user_subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  return normalizePlan(data?.plan);
};

const fetchWebContext = async (query: string) => {
  if (!query?.trim()) return "";
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&no_redirect=1`,
    );
    if (!response.ok) return "";
    const data = await response.json();
    const snippets: string[] = [];
    if (data.AbstractText) snippets.push(`Summary: ${data.AbstractText}`);

    const related = Array.isArray(data.RelatedTopics) ? data.RelatedTopics : [];
    for (const item of related.slice(0, 4)) {
      if (item?.Text) snippets.push(`- ${item.Text}`);
      if (item?.Topics?.[0]?.Text) snippets.push(`- ${item.Topics[0].Text}`);
    }

    if (!snippets.length) return "";
    return `Web context (verify before relying):\n${snippets.join("\n")}`;
  } catch {
    return "";
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const options = body.options ?? {};
    const rawAttachments = Array.isArray(body.attachments) ? body.attachments : [];
    const requestedLanguage = String(body.language || "en");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const plan = await getPlanFromDb(req.headers.get("authorization"));
    const perks = PLAN_PERKS[plan] || PLAN_PERKS.free;

    const allowedLangs = PLAN_LANGUAGES[plan] || PLAN_LANGUAGES.free;
    const language = allowedLangs.includes(requestedLanguage) ? requestedLanguage : "en";
    const languageName = LANGUAGE_NAMES[language] || "English";

    const thinkingEnabled = Boolean(options.thinking) && perks.thinking;
    const webSearchEnabled = Boolean(options.webSearch) && perks.webSearch;
    const attachments = perks.uploads
      ? rawAttachments
          .filter((a: any) => typeof a?.dataUrl === "string" && a.dataUrl.startsWith("data:image/"))
          .slice(0, 3)
      : [];

    const lastUserMessage =
      [...messages].reverse().find((m: any) => m?.role === "user")?.content ?? "";

    const webContext = webSearchEnabled ? await fetchWebContext(String(lastUserMessage)) : "";

    let model = MODEL_BY_PLAN[plan] || "google/gemini-2.5-flash";
    if (thinkingEnabled && plan === "Student AI") {
      model = "google/gemini-2.5-pro";
    }
    if (thinkingEnabled && (plan === "Scholar AI" || plan === "Imam AI")) {
      model = "openai/gpt-5.2";
    }

    const modelMessages = messages.map((m: any, idx: number) => {
      const isLast = idx === messages.length - 1;
      if (isLast && m.role === "user" && attachments.length > 0) {
        return {
          role: "user",
          content: [
            { type: "text", text: String(m.content || "") },
            ...attachments.map((a: any) => ({ type: "image_url", image_url: { url: a.dataUrl } })),
          ],
        };
      }
      return { role: m.role, content: String(m.content || "") };
    });

    const languageInstruction = `
LANGUAGE RULE (CRITICAL):
- The selected output language is ${languageName}.
- Respond fully in ${languageName}.
- Do NOT switch to English unless explicitly asked by the user.
- Keep Quran and Hadith Arabic text when quoting it, but explain and discuss in ${languageName}.
- If you accidentally output a different language, immediately correct yourself and continue in ${languageName}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "system",
            content: `Current user plan: ${plan}.\nEnabled perks: uploads=${perks.uploads}, thinking=${perks.thinking}, webSearch=${perks.webSearch}, tts=${perks.tts}, voice=${perks.voice}.\n${languageInstruction}\n${
              thinkingEnabled
                ? "Deep thinking mode is ON: compare evidences, include nuanced scholarly differences, and produce a highly structured answer with references."
                : "Provide concise-but-substantive guidance with practical points and references."
            }`,
          },
          ...(webContext ? [{ role: "system", content: webContext }] : []),
          ...modelMessages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ustadh-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
