import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", ps: "Pashto", fa: "Dari/Farsi", ar: "Arabic", ur: "Urdu",
  tr: "Turkish", ms: "Malay", id: "Indonesian", bn: "Bengali",
  fr: "French", es: "Spanish", de: "German", sw: "Swahili", so: "Somali", ha: "Hausa",
};

const PLAN_LANGUAGES: Record<string, string[]> = {
  free: ["en"],
  "Seeker AI": ["en"],
  "Student AI": ["en", "ps", "fa"],
  "Scholar AI": Object.keys(LANGUAGE_NAMES),
  "Imam AI": Object.keys(LANGUAGE_NAMES),
};

const SYSTEM_PROMPT = `You are Ustadh AI — an exceptionally knowledgeable, deeply thoughtful, and compassionate Islamic scholar and teacher. You are one of the most comprehensive Islamic knowledge AI assistants in the world.

Your expertise spans:
- The entire Quran with detailed Tafsir from Ibn Kathir, Al-Tabari, Al-Qurtubi, Al-Sa'di, and contemporary scholars
- All six major Hadith collections (Kutub al-Sittah): Sahih Bukhari, Sahih Muslim, Sunan Abu Dawud, Jami at-Tirmidhi, Sunan an-Nasa'i, Sunan Ibn Majah, plus Muwatta Malik, Musnad Ahmad, and other collections
- All four Sunni schools of Fiqh (Hanafi, Maliki, Shafi'i, Hanbali) with deep understanding of their usul (principles) and methodology
- Aqeedah (Islamic theology) including Ash'ari, Maturidi, and Athari perspectives
- Complete Seerah (prophetic biography) from Ibn Ishaq, Ibn Hisham, and Al-Mubarakpuri
- Islamic history from the Rashidun Caliphate through the Ottoman period
- Islamic ethics, spirituality (Tazkiyah), and character development
- Comparative religion and interfaith dialogue from an Islamic perspective
- Islamic finance (Muamalat), inheritance law (Faraid), and family law
- Contemporary Islamic issues and modern scholarly opinions

Your approach:
1. ALWAYS provide specific references: Surah name + verse number, Hadith collection + book + number, scholar name + work title
2. When multiple scholarly opinions exist, present ALL major positions with their evidences and reasoning
3. Use Arabic terms naturally with translations: "Tawakkul (reliance upon Allah ﷻ)"
4. Structure responses with clear headings, numbered points, and organized sections
5. Begin topic introductions with "Bismillah" and use Islamic phrases naturally
6. For worship questions, give detailed step-by-step instructions with conditions, pillars, and sunnah acts
7. For controversial topics, present balanced views and recommend consulting local scholars
8. Never issue personal fatwas — reference established scholarly positions
9. Show genuine warmth, wisdom, patience, and encouragement
10. Build on conversation context for follow-up questions
11. If a question touches on Islam tangentially (e.g., science, history, ethics), provide the Islamic perspective
12. Give THOROUGH, COMPREHENSIVE answers — never be unnecessarily brief. Users want depth and detail.
13. Include practical advice and actionable guidance whenever relevant

You are NOT restricted to only short answers. Give rich, detailed, scholarly responses that genuinely help the user understand their question deeply.

Scope: Focus on Islam-related topics. For borderline questions, provide an Islamic perspective. Only redirect clearly off-topic questions (coding, gaming, celebrity gossip) politely.

Format all responses with markdown for readability.`;

type Plan = "free" | "Seeker AI" | "Student AI" | "Scholar AI" | "Imam AI";

const planPerks: Record<Plan, { uploads: boolean; thinking: boolean; webSearch: boolean }> = {
  free: { uploads: false, thinking: false, webSearch: false },
  "Seeker AI": { uploads: true, thinking: false, webSearch: false },
  "Student AI": { uploads: true, thinking: true, webSearch: true },
  "Scholar AI": { uploads: true, thinking: true, webSearch: true },
  "Imam AI": { uploads: true, thinking: true, webSearch: true },
};

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

  const { data } = await admin.from("user_subscriptions").select("plan").eq("user_id", userId).maybeSingle();
  const plan = (data?.plan || "free") as Plan;
  return planPerks[plan] ? plan : "free";
};

const fetchWebContext = async (query: string) => {
  if (!query?.trim()) return "";
  try {
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&no_redirect=1`);
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
    return `Web context for this question (verify before relying):\n${snippets.join("\n")}`;
  } catch { return ""; }
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
    const perks = planPerks[plan];

    // Enforce language restrictions
    const allowedLangs = PLAN_LANGUAGES[plan] || PLAN_LANGUAGES.free;
    const language = allowedLangs.includes(requestedLanguage) ? requestedLanguage : "en";
    const languageName = LANGUAGE_NAMES[language] || "English";

    const thinkingEnabled = Boolean(options.thinking) && perks.thinking;
    const webSearchEnabled = Boolean(options.webSearch) && perks.webSearch;
    const attachments = perks.uploads
      ? rawAttachments.filter((a: any) => typeof a?.dataUrl === "string" && a.dataUrl.startsWith("data:image/")).slice(0, 3)
      : [];

    const lastUserMessage = [...messages].reverse().find((m: any) => m?.role === "user")?.content ?? "";

    const webContext = webSearchEnabled ? await fetchWebContext(String(lastUserMessage)) : "";

    // Use the best model available based on plan
    let model = "google/gemini-2.5-flash";
    if (thinkingEnabled) {
      model = "google/gemini-2.5-pro";
    } else if (plan === "Scholar AI" || plan === "Imam AI") {
      model = "google/gemini-2.5-pro";
    } else if (plan === "Student AI") {
      model = "google/gemini-2.5-flash";
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

    const languageInstruction = language !== "en"
      ? `\n\nIMPORTANT: The user has selected ${languageName} as their language. You MUST respond entirely in ${languageName}. Use ${languageName} for all explanations, descriptions, and guidance. Keep Arabic Quranic verses and Hadith text in Arabic, but translate and explain everything else in ${languageName}. If you include transliterations, also provide the ${languageName} translation.`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT + languageInstruction },
          {
            role: "system",
            content: `Current user plan: ${plan}. Language: ${languageName}.
Enabled perks: uploads=${perks.uploads}, thinking=${perks.thinking}, webSearch=${perks.webSearch}.
${thinkingEnabled ? "Deep thinking mode is ON: reason step-by-step internally, consider multiple scholarly perspectives, cross-reference sources, and give a comprehensive final answer with detailed references." : "Provide thorough, well-referenced, detailed answers. Don't be brief — give useful scholarly depth with specific citations."}`,
          },
          ...(webContext ? [{ role: "system", content: webContext }] : []),
          ...modelMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ustadh-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
