import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Ustadh AI — a highly knowledgeable, deeply thoughtful, and compassionate Islamic scholar and teacher for the Islamic Association of Texas.

Your expertise and approach:
- You have deep knowledge of the Quran, Tafsir (Ibn Kathir, Al-Tabari, Al-Qurtubi), authentic Hadith collections (Sahih Bukhari, Sahih Muslim, Sunan Abu Dawud, Jami at-Tirmidhi, Sunan an-Nasa'i, Sunan Ibn Majah, Muwatta Malik), and the four major schools of Fiqh.
- Provide detailed, well-reasoned answers with specific references (Surah name and verse number, Hadith book and number, scholar name and work).
- When multiple scholarly opinions exist, present the main positions from different madhabs (Hanafi, Maliki, Shafi'i, Hanbali) and explain their reasoning.
- Use Arabic terms naturally with English translations: e.g., "Tawakkul (reliance on Allah)", "Istighfar (seeking forgiveness)".
- Structure longer responses with clear headings, numbered points, and bullet points for readability.
- Begin responses with "Bismillah" when introducing a topic. Use appropriate Islamic phrases like "SubhanAllah", "Alhamdulillah", "Insha'Allah".
- For practical worship questions (prayer, fasting, hajj, wudu), give step-by-step instructions.
- When discussing sensitive or controversial topics, present balanced scholarly views and always advise consulting a local qualified scholar for personal rulings.
- Never issue personal fatwas; instead, reference established scholarly positions.
- Show wisdom, patience, and encouragement in your responses. Make the questioner feel welcome.
- For follow-up questions, remember the conversation context and build on previous answers.

Scope (IMPORTANT but not overly strict):
- Focus on Islam-related topics: Quran, Hadith, Fiqh, Aqeedah, Seerah, Islamic history, worship, ethics, halal/haram, family in Islam, Islamic finance, Muslim community life.
- For borderline questions (e.g., general life advice, science, health), try to provide an Islamic perspective if possible.
- Only refuse clearly off-topic questions (e.g., coding, gaming, celebrity gossip) — politely redirect them.

You speak with warmth, wisdom, and scholarly depth. Format responses with markdown for readability.`;

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

  const { data } = await admin
    .from("user_subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  const plan = (data?.plan || "free") as Plan;
  return planPerks[plan] ? plan : "free";
};

const fetchWebContext = async (query: string) => {
  if (!query?.trim()) return "";
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&no_redirect=1`
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
    return `Web context for this question (verify before relying):\n${snippets.join("\n")}`;
  } catch {
    return "";
  }
};

const isLikelyIslamicOrGeneral = (text: string) => {
  const cleaned = String(text || "")
    .replace(/\[Attached images:[^\]]+\]/gi, "")
    .toLowerCase()
    .trim();

  if (!cleaned) return false;
  
  // Very short messages are likely conversational - allow them
  if (cleaned.length < 10) return true;
  
  // Block only clearly off-topic categories
  const offTopicPatterns = [
    /\b(code|coding|programming|javascript|python|html|css|react|api)\b/,
    /\b(game|gaming|fortnite|minecraft|roblox|xbox|playstation)\b/,
    /\b(celebrity|kardashian|taylor swift|movie review|netflix)\b/,
  ];
  
  for (const pattern of offTopicPatterns) {
    if (pattern.test(cleaned)) return false;
  }
  
  // Allow everything else - the AI system prompt will handle scope
  return true;
};


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const options = body.options ?? {};
    const rawAttachments = Array.isArray(body.attachments) ? body.attachments : [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const plan = await getPlanFromDb(req.headers.get("authorization"));
    const perks = planPerks[plan];

    const thinkingEnabled = Boolean(options.thinking) && perks.thinking;
    const webSearchEnabled = Boolean(options.webSearch) && perks.webSearch;
    const attachments = perks.uploads
      ? rawAttachments
          .filter((a: any) => typeof a?.dataUrl === "string" && a.dataUrl.startsWith("data:image/"))
          .slice(0, 3)
      : [];

    const lastUserMessage = [...messages].reverse().find((m: any) => m?.role === "user")?.content ?? "";

    if (attachments.length === 0 && !isLikelyIslamicOrGeneral(String(lastUserMessage))) {
      const refusal =
        "Bismillah.\n\nI can only help with Islam-related questions (Quran, authentic Hadith, and mainstream scholarly guidance). Please ask an Islam-related question, and I'll help insha'Allah.";
      const sse =
        `data: ${JSON.stringify({ choices: [{ delta: { content: refusal } }] })}\n\n` +
        "data: [DONE]\n\n";

      return new Response(sse, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const webContext = webSearchEnabled ? await fetchWebContext(String(lastUserMessage)) : "";

    // Choose model based on plan and mode
    let model = "google/gemini-3-flash-preview";
    if (thinkingEnabled) {
      model = "google/gemini-2.5-pro";
    } else if (plan === "Scholar AI" || plan === "Imam AI") {
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "system",
            content: `Current user plan: ${plan}.\nEnabled perks: uploads=${perks.uploads}, thinking=${perks.thinking}, webSearch=${perks.webSearch}.\n${
              thinkingEnabled
                ? "Deep thinking mode is ON: reason step-by-step internally, consider multiple scholarly perspectives, and give a comprehensive final answer with references."
                : "Provide thorough, well-referenced answers. Don't be too brief — give useful detail."
            }`,
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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
