import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Crown,
  Paperclip,
  Globe,
  Mic,
  Volume2,
  Loader2,
  Languages,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatAttachment {
  name: string;
  type: string;
  dataUrl: string;
}

type PlanName = 'free' | 'Seeker AI' | 'Student AI' | 'Scholar AI' | 'Imam AI';

type PlanPerkConfig = {
  uploads: boolean;
  thinking: boolean;
  webSearch: boolean;
  tts: boolean;
  voice: boolean;
  modelLabel: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ps', label: 'Pashto (پښتو)' },
  { code: 'fa', label: 'Dari (دری)' },
  { code: 'ar', label: 'Arabic (العربية)' },
  { code: 'ur', label: 'Urdu (اردو)' },
  { code: 'tr', label: 'Turkish (Türkçe)' },
  { code: 'ms', label: 'Malay (Bahasa Melayu)' },
  { code: 'id', label: 'Indonesian (Bahasa Indonesia)' },
  { code: 'bn', label: 'Bengali (বাংলা)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'de', label: 'German (Deutsch)' },
  { code: 'sw', label: 'Swahili (Kiswahili)' },
  { code: 'so', label: 'Somali (Soomaali)' },
  { code: 'ha', label: 'Hausa' },
] as const;

const LANGUAGE_LOCALES: Record<string, string[]> = {
  en: ['en-US', 'en-GB'],
  ps: ['ps-AF', 'ps-PK'],
  fa: ['fa-AF', 'fa-IR'],
  ar: ['ar-SA', 'ar-AE', 'ar-EG'],
  ur: ['ur-PK', 'ur-IN'],
  tr: ['tr-TR'],
  ms: ['ms-MY'],
  id: ['id-ID'],
  bn: ['bn-BD', 'bn-IN'],
  fr: ['fr-FR'],
  es: ['es-ES', 'es-MX'],
  de: ['de-DE'],
  sw: ['sw-KE', 'sw-TZ'],
  so: ['so-SO'],
  ha: ['ha-NG'],
};

// Which languages each plan can access
const PLAN_LANGUAGES: Record<PlanName, string[]> = {
  free: ['en'],
  'Seeker AI': ['en'],
  'Student AI': ['en', 'ps', 'fa'],
  'Scholar AI': LANGUAGES.map((l) => l.code),
  'Imam AI': LANGUAGES.map((l) => l.code),
};

const PLAN_LIMITS: Record<PlanName, number> = {
  free: 15,
  'Seeker AI': 50,
  'Student AI': 150,
  'Scholar AI': 500,
  'Imam AI': 999999,
};

const normalizePlan = (rawPlan?: string | null): PlanName => {
  const value = (rawPlan || '').trim().toLowerCase();
  if (value.includes('imam')) return 'Imam AI';
  if (value.includes('scholar')) return 'Scholar AI';
  if (value.includes('student')) return 'Student AI';
  if (value.includes('seeker')) return 'Seeker AI';
  return 'free';
};

const suggestedQuestions = [
  'What are the five pillars of Islam?',
  'How can I improve khushu during Salah?',
  'Explain a balanced Islamic view on patience in hardship.',
  'Give me practical steps for daily dhikr and consistency.',
];

const DEFAULT_LIMIT = 15;
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ustadh-ai`;

const planPerks: Record<PlanName, PlanPerkConfig> = {
  free: { uploads: false, thinking: false, webSearch: false, tts: false, voice: false, modelLabel: 'Foundational AI' },
  'Seeker AI': {
    uploads: true,
    thinking: false,
    webSearch: false,
    tts: false,
    voice: false,
    modelLabel: 'Guided Q&A',
  },
  'Student AI': {
    uploads: true,
    thinking: true,
    webSearch: true,
    tts: false,
    voice: false,
    modelLabel: 'Research AI',
  },
  'Scholar AI': {
    uploads: true,
    thinking: true,
    webSearch: true,
    tts: true,
    voice: false,
    modelLabel: 'Scholar Engine',
  },
  'Imam AI': {
    uploads: true,
    thinking: true,
    webSearch: true,
    tts: true,
    voice: true,
    modelLabel: 'Imam Conversational AI',
  },
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });

const getSpeechRecognitionCtor = (): SpeechRecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const maybeCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return maybeCtor || null;
};

const supportsSpeechRecognition = () => Boolean(getSpeechRecognitionCtor());
const supportsSpeechSynthesis = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

const sanitizeForSpeech = (text: string, languageCode: string) => {
  let cleaned = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (['ar', 'fa', 'ps', 'ur'].includes(languageCode)) {
    cleaned = cleaned.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
  }

  return cleaned;
};

const TypingIndicator = () => (
  <div className="flex gap-3">
    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
      <Bot size={14} className="text-primary" />
    </div>
    <div className="rounded-xl px-4 py-3 bg-secondary border border-border">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

const UstadhAI = () => {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [dailyLimit, setDailyLimit] = useState(DEFAULT_LIMIT);
  const [currentPlan, setCurrentPlan] = useState<PlanName>('free');
  const [thinkingMode, setThinkingMode] = useState(false);
  const [webSearchMode, setWebSearchMode] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [questionsUsed, setQuestionsUsed] = useState(0);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [speakingMsgIndex, setSpeakingMsgIndex] = useState<number | null>(null);
  const [voiceConversationActive, setVoiceConversationActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const chatRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceConversationRef = useRef(false);
  const voicePendingResponseRef = useRef(false);
  const isLoadingRef = useRef(false);
  const isSpeakingRef = useRef(false);

  const perks = planPerks[currentPlan] || planPerks.free;
  const isUnlimited = currentPlan === 'Imam AI';
  const remaining = isUnlimited ? Infinity : Math.max(0, dailyLimit - questionsUsed);
  const allowedLanguages = PLAN_LANGUAGES[currentPlan] || PLAN_LANGUAGES.free;

  const selectedLanguageLabel = LANGUAGES.find((lang) => lang.code === selectedLanguage)?.label || 'English';

  const pickVoiceForLanguage = (languageCode: string) => {
    const availableVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
    const localePreferences = LANGUAGE_LOCALES[languageCode] || ['en-US'];

    for (const locale of localePreferences) {
      const exactMatch = availableVoices.find((voice) => voice.lang.toLowerCase() === locale.toLowerCase());
      if (exactMatch) return { voice: exactMatch, lang: locale, hasNativeVoice: true };
    }

    for (const locale of localePreferences) {
      const prefix = locale.split('-')[0]?.toLowerCase();
      const prefixMatch = availableVoices.find((voice) => voice.lang.toLowerCase().startsWith(`${prefix}-`) || voice.lang.toLowerCase() === prefix);
      if (prefixMatch) return { voice: prefixMatch, lang: prefixMatch.lang, hasNativeVoice: true };
    }

    return { voice: null as SpeechSynthesisVoice | null, lang: localePreferences[0], hasNativeVoice: false };
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const stopSpeaking = () => {
    if (supportsSpeechSynthesis()) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgIndex(null);
    isSpeakingRef.current = false;
  };

  const startListening = () => {
    if (!voiceConversationRef.current || !perks.voice || !supportsSpeechRecognition()) return;

    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) return;

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;
    }

    const recognition = recognitionRef.current;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i]?.[0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript.trim()) {
        setVoiceDraft(interimTranscript.trim());
      }

      if (finalTranscript.trim()) {
        voicePendingResponseRef.current = true;
        setVoiceDraft('');
        setInput(finalTranscript.trim());
        recognition.stop();
        sendMessage(finalTranscript.trim(), { fromVoice: true });
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);

      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
        toast.error('Microphone access is blocked. Please allow microphone permission.');
        voiceConversationRef.current = false;
        setVoiceConversationActive(false);
        return;
      }

      if (event?.error === 'language-not-supported') {
        toast.error(`Voice input is not available for ${selectedLanguageLabel} on this device.`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (
        voiceConversationRef.current &&
        !voicePendingResponseRef.current &&
        !isLoadingRef.current &&
        !isSpeakingRef.current
      ) {
        window.setTimeout(() => startListening(), 350);
      }
    };

    recognition.lang = (LANGUAGE_LOCALES[selectedLanguage] || ['en-US'])[0];

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      // Ignore invalid state errors caused by rapid restarts.
    }
  };

  const speakText = async (text: string, index?: number) => {
    if (!perks.tts) {
      toast.error('Text-to-speech is available on Scholar AI and above.');
      return false;
    }

    if (!supportsSpeechSynthesis()) {
      toast.error('Text-to-speech is not supported on this browser.');
      return false;
    }

    if (typeof index === 'number' && speakingMsgIndex === index) {
      stopSpeaking();
      return false;
    }

    const cleaned = sanitizeForSpeech(text, selectedLanguage);
    if (!cleaned) return false;

    const { voice, lang, hasNativeVoice } = pickVoiceForLanguage(selectedLanguage);
    if (!hasNativeVoice && selectedLanguage !== 'en') {
      toast.error(`No ${selectedLanguageLabel} voice is installed on this device. Add a ${selectedLanguageLabel} system voice for proper playback.`);
      return false;
    }

    stopListening();
    stopSpeaking();

    return new Promise<boolean>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = voice?.lang || lang;
      if (voice) utterance.voice = voice;
      utterance.rate = selectedLanguage === 'ar' ? 0.9 : 1;

      utterance.onend = () => {
        setSpeakingMsgIndex(null);
        isSpeakingRef.current = false;
        resolve(true);
      };

      utterance.onerror = () => {
        setSpeakingMsgIndex(null);
        isSpeakingRef.current = false;
        resolve(false);
      };

      setSpeakingMsgIndex(typeof index === 'number' ? index : -1);
      isSpeakingRef.current = true;
      window.speechSynthesis.speak(utterance);
    });
  };

  // Load usage from database
  useEffect(() => {
    if (!user) {
      const stored = localStorage.getItem('ustadh_ai_usage');
      if (stored) {
        const { count, date } = JSON.parse(stored);
        if (date === new Date().toDateString()) setQuestionsUsed(count);
        else setQuestionsUsed(0);
      }
      setUsageLoaded(true);
      setDailyLimit(DEFAULT_LIMIT);
      setCurrentPlan('free');
      setSelectedLanguage('en');
      return;
    }

    const fetchSubAndUsage = async () => {
      await supabase.functions.invoke('sync-subscription');
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('plan, daily_limit')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subData) {
        const normalized = normalizePlan(subData.plan);
        setCurrentPlan(normalized);
        setDailyLimit(subData.daily_limit || PLAN_LIMITS[normalized]);
      } else {
        setCurrentPlan('free');
        setDailyLimit(DEFAULT_LIMIT);
      }

      const today = new Date().toISOString().split('T')[0];
      const { data: usageData } = await supabase
        .from('ai_daily_usage')
        .select('count')
        .eq('user_id', user.id)
        .eq('usage_date', today)
        .maybeSingle();

      setQuestionsUsed(usageData?.count || 0);
      setUsageLoaded(true);
    };

    fetchSubAndUsage();

    const channel = supabase
      .channel(`ustadh_sub:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new) {
            const normalized = normalizePlan(payload.new.plan);
            setDailyLimit(payload.new.daily_limit || PLAN_LIMITS[normalized]);
            setCurrentPlan(normalized);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!supportsSpeechSynthesis()) return;

    const syncVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    syncVoices();
    window.speechSynthesis.addEventListener('voiceschanged', syncVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', syncVoices);
    };
  }, []);

  useEffect(() => {
    if (!allowedLanguages.includes(selectedLanguage)) {
      setSelectedLanguage('en');
    }
  }, [allowedLanguages, selectedLanguage]);

  useEffect(() => {
    if (!perks.thinking) setThinkingMode(false);
    if (!perks.webSearch) setWebSearchMode(false);
    if (!perks.uploads) setAttachments([]);

    if (!perks.voice && voiceConversationRef.current) {
      voiceConversationRef.current = false;
      setVoiceConversationActive(false);
      stopListening();
      setVoiceDraft('');
    }
  }, [perks]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    voiceConversationRef.current = voiceConversationActive;
  }, [voiceConversationActive]);

  useEffect(() => {
    if (voiceConversationActive && isListening) {
      stopListening();
    }
  }, [selectedLanguage]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      if (supportsSpeechSynthesis()) {
        window.speechSynthesis.cancel();
      }
    },
    [],
  );

  const incrementUsage = async () => {
    const newCount = questionsUsed + 1;
    setQuestionsUsed(newCount);

    if (user) {
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('ai_daily_usage')
        .select('id, count')
        .eq('user_id', user.id)
        .eq('usage_date', today)
        .maybeSingle();

      if (existing) {
        await supabase.from('ai_daily_usage').update({ count: existing.count + 1 }).eq('id', existing.id);
      } else {
        await supabase.from('ai_daily_usage').insert({ user_id: user.id, usage_date: today, count: 1 });
      }
    } else {
      localStorage.setItem('ustadh_ai_usage', JSON.stringify({ count: newCount, date: new Date().toDateString() }));
    }
  };

  const onAttachFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!perks.uploads) {
      toast.error('Uploads are available on paid plans.');
      return;
    }

    const selected = Array.from(files).slice(0, 3);
    const validImages = selected.filter((f) => f.type.startsWith('image/') && f.size <= 4 * 1024 * 1024);
    if (validImages.length === 0) {
      toast.error('Please select image files up to 4MB each.');
      return;
    }

    try {
      const prepared = await Promise.all(
        validImages.map(async (f) => ({
          name: f.name,
          type: f.type,
          dataUrl: await fileToDataUrl(f),
        })),
      );
      setAttachments((prev) => [...prev, ...prepared].slice(0, 3));
    } catch (error: any) {
      toast.error(error.message || 'Failed to attach files');
    }
  };

  const sendMessage = async (text: string, meta?: { fromVoice?: boolean }) => {
    if ((!text.trim() && attachments.length === 0) || (!isUnlimited && remaining <= 0) || isLoading || !usageLoaded) return;

    const attachmentNote = attachments.length ? `\n\n[Attached images: ${attachments.map((a) => a.name).join(', ')}]` : '';
    const userMsg: Message = { role: 'user', content: `${text.trim()}${attachmentNote}`.trim() };
    const newMessages = [...messages, userMsg];

    setMessages(newMessages);
    setInput('');
    await incrementUsage();
    setIsLoading(true);

    let assistantSoFar = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` }),
        },
        body: JSON.stringify({
          messages: newMessages,
          attachments,
          language: selectedLanguage,
          options: { thinking: thinkingMode, webSearch: webSearchMode },
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');
      setAttachments([]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      console.error('Ustadh AI error:', e);
      toast.error(e.message || 'Failed to get response');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I apologize, I was unable to process your question. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);

      if (voiceConversationRef.current && perks.voice && assistantSoFar.trim()) {
        await speakText(assistantSoFar);
      }

      if (meta?.fromVoice) {
        voicePendingResponseRef.current = false;
      }

      if (voiceConversationRef.current && perks.voice) {
        window.setTimeout(() => startListening(), 350);
      }
    }
  };

  const toggleVoiceConversation = () => {
    if (!perks.voice) {
      toast.error('Voice conversation is available only on Imam AI.');
      return;
    }

    if (!supportsSpeechRecognition()) {
      toast.error('Voice input is not supported in this browser.');
      return;
    }

    if (voiceConversationActive) {
      voiceConversationRef.current = false;
      setVoiceConversationActive(false);
      voicePendingResponseRef.current = false;
      setVoiceDraft('');
      stopListening();
      stopSpeaking();
      toast.success('Voice conversation stopped.');
      return;
    }

    voiceConversationRef.current = true;
    setVoiceConversationActive(true);
    voicePendingResponseRef.current = false;
    setVoiceDraft('');
    startListening();
    toast.success(`Voice conversation started in ${selectedLanguageLabel}.`);
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-6 rounded-2xl border border-border bg-card/80 px-5 py-6">
        <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-secondary border-2 border-primary flex items-center justify-center">
          <Bot size={32} className="text-primary" />
        </div>
        <p className="font-arabic text-primary text-sm mb-1">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
        <h2 className="text-2xl font-bold text-foreground mb-1">As-salamu alaykum 👋</h2>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          I’m Ustadh AI — your Islamic companion for Quran, Hadith, Fiqh, and practical guidance.
        </p>
      </div>

      <div className="flex flex-wrap justify-center items-center gap-2 mb-4 text-xs">
        <span className="bg-card border border-border rounded-full px-3 py-1 text-foreground flex items-center gap-1">
          <Crown size={12} className="text-primary" /> {currentPlan}
        </span>
        <span className="bg-card border border-border rounded-full px-3 py-1 text-foreground flex items-center gap-1">
          <Languages size={12} className="text-primary" /> {perks.modelLabel}
        </span>
        {(['Uploads', 'Thinking', 'Web Search', 'TTS', 'Voice'] as const).map((label) => {
          const key =
            label === 'TTS'
              ? 'tts'
              : label === 'Web Search'
                ? 'webSearch'
                : (label.toLowerCase() as keyof typeof perks);
          const active = perks[key] as boolean;
          return (
            <span
              key={label}
              className={`rounded-full px-3 py-1 border ${
                active
                  ? 'bg-primary/10 border-primary/30 text-foreground'
                  : 'bg-secondary border-border text-muted-foreground'
              }`}
            >
              {label}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center items-center gap-2 mb-4">
        <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5">
          <Globe size={14} className="text-primary" />
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} disabled={!allowedLanguages.includes(lang.code)}>
                {lang.label} {!allowedLanguages.includes(lang.code) ? '🔒' : ''}
              </option>
            ))}
          </select>
        </div>

        {voiceConversationActive && (
          <span className="text-xs rounded-full border border-primary/30 bg-primary/10 text-foreground px-3 py-1 flex items-center gap-1">
            {isListening ? <Loader2 size={12} className="animate-spin text-primary" /> : <Mic size={12} className="text-primary" />}
            {isListening ? `Listening in ${selectedLanguageLabel}` : 'Voice mode active'}
          </span>
        )}
      </div>

      {voiceDraft && voiceConversationActive && (
        <div className="mb-3 text-xs text-center text-muted-foreground">Heard: “{voiceDraft}”</div>
      )}

      <div className="flex justify-center mb-6">
        <div className="bg-secondary rounded-full px-4 py-2 flex items-center gap-2">
          {!usageLoaded ? (
            <span className="text-muted-foreground text-xs flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Loading plan perks…
            </span>
          ) : isUnlimited ? (
            <span className="text-muted-foreground text-xs">Unlimited questions</span>
          ) : (
            <>
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(dailyLimit, 30) }).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < remaining ? 'bg-primary' : 'bg-muted'}`} />
                ))}
              </div>
              <span className="text-muted-foreground text-xs">
                {remaining} of {dailyLimit} questions remaining today
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        <button
          onClick={() => perks.thinking && setThinkingMode((v) => !v)}
          disabled={!perks.thinking}
          className={`text-xs rounded-full px-3 py-1 border transition-colors ${
            thinkingMode
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary text-secondary-foreground border-border disabled:text-muted-foreground'
          }`}
        >
          Deep Thinking
        </button>
        <button
          onClick={() => perks.webSearch && setWebSearchMode((v) => !v)}
          disabled={!perks.webSearch}
          className={`text-xs rounded-full px-3 py-1 border transition-colors ${
            webSearchMode
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary text-secondary-foreground border-border disabled:text-muted-foreground'
          }`}
        >
          Web Search
        </button>
      </div>

      {(messages.length > 0 || isLoading) && (
        <div ref={chatRef} className="bg-card border border-border rounded-xl p-4 mb-4 max-h-[440px] overflow-y-auto space-y-4 shadow-sm">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={14} className="text-primary" />
                </div>
              )}
              <div
                className={`rounded-xl px-4 py-2.5 text-sm max-w-[85%] border ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground border-primary/20'
                    : 'bg-secondary text-secondary-foreground border-border'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
              {msg.role === 'assistant' && perks.tts && (
                <button
                  onClick={() => {
                    void speakText(msg.content, i);
                  }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 transition-colors ${
                    speakingMsgIndex === i
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-muted'
                  }`}
                  title="Read aloud"
                >
                  <Volume2 size={12} />
                </button>
              )}
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                  <User size={14} className="text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && <TypingIndicator />}
        </div>
      )}

      {messages.length === 0 && !isLoading && (
        <div className="mb-4">
          <p className="text-muted-foreground text-xs uppercase tracking-wider text-center mb-3">Suggested Questions</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="bg-card border border-border rounded-xl p-3 text-sm text-foreground text-left hover:border-primary/50 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <button
              key={`${a.name}-${i}`}
              onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
              className="text-xs bg-secondary text-secondary-foreground border border-border rounded-full px-3 py-1"
            >
              {a.name} ✕
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
          <label className={`cursor-pointer ${perks.uploads ? 'text-primary' : 'text-muted-foreground'}`} title="Attach image">
            <Paperclip size={16} />
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={!perks.uploads}
              onChange={(e) => onAttachFiles(e.target.files)}
            />
          </label>

          <button
            type="button"
            onClick={toggleVoiceConversation}
            disabled={!perks.voice}
            title={perks.voice ? 'Continuous voice conversation' : 'Voice conversation is for Imam AI'}
            className={`transition-colors ${
              perks.voice
                ? voiceConversationActive
                  ? 'text-primary'
                  : 'text-foreground hover:text-primary'
                : 'text-muted-foreground'
            }`}
          >
            <Mic size={16} />
          </button>
        </div>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder={
            !usageLoaded
              ? 'Loading your plan...'
              : isUnlimited || remaining > 0
                ? `Ask in ${selectedLanguageLabel}...`
                : 'Daily limit reached. Upgrade for more.'
          }
          disabled={(!isUnlimited && remaining <= 0) || !usageLoaded}
          className="w-full bg-card text-foreground placeholder:text-muted-foreground rounded-xl pl-16 pr-12 py-3.5 text-sm border border-border focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={
            (!input.trim() && attachments.length === 0) || (!isUnlimited && remaining <= 0) || isLoading || !usageLoaded
          }
          className="absolute right-3 top-1/2 -translate-y-1/2 text-primary disabled:text-muted-foreground transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default UstadhAI;
