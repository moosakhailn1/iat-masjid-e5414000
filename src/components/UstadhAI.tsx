import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Crown, Paperclip } from 'lucide-react';
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

const suggestedQuestions = [
  'What are the five pillars of Islam?',
  'How do I perform Salah correctly?',
  'What does the Quran say about patience?',
  'What is the significance of Ramadan?',
];

const DEFAULT_LIMIT = 15;
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ustadh-ai`;

const planPerks: Record<string, { uploads: boolean; thinking: boolean; webSearch: boolean }> = {
  free: { uploads: false, thinking: false, webSearch: false },
  'Seeker AI': { uploads: true, thinking: false, webSearch: false },
  'Student AI': { uploads: true, thinking: true, webSearch: true },
  'Scholar AI': { uploads: true, thinking: true, webSearch: true },
  'Imam AI': { uploads: true, thinking: true, webSearch: true },
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });

const UstadhAI = () => {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [dailyLimit, setDailyLimit] = useState(DEFAULT_LIMIT);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [thinkingMode, setThinkingMode] = useState(false);
  const [webSearchMode, setWebSearchMode] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [questionsUsed, setQuestionsUsed] = useState(() => {
    const stored = localStorage.getItem('ustadh_ai_usage');
    if (stored) {
      const { count, date } = JSON.parse(stored);
      if (date === new Date().toDateString()) return count;
    }
    return 0;
  });
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const perks = planPerks[currentPlan] || planPerks.free;
  const isUnlimited = currentPlan === 'Imam AI';
  const remaining = isUnlimited ? Infinity : Math.max(0, dailyLimit - questionsUsed);

  useEffect(() => {
    if (!user) {
      setDailyLimit(DEFAULT_LIMIT);
      setCurrentPlan('free');
      setThinkingMode(false);
      setWebSearchMode(false);
      return;
    }

    const fetchSub = async () => {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('plan, daily_limit')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setDailyLimit(data.daily_limit);
        setCurrentPlan(data.plan);
      }
    };

    fetchSub();

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
            setDailyLimit(payload.new.daily_limit);
            setCurrentPlan(payload.new.plan);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!perks.thinking) setThinkingMode(false);
    if (!perks.webSearch) setWebSearchMode(false);
    if (!perks.uploads) setAttachments([]);
  }, [perks]);

  useEffect(() => {
    localStorage.setItem(
      'ustadh_ai_usage',
      JSON.stringify({ count: questionsUsed, date: new Date().toDateString() })
    );
  }, [questionsUsed]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const onAttachFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!perks.uploads) {
      toast.error('Uploads are available on paid plans.');
      return;
    }

    const selected = Array.from(files).slice(0, 3);
    const validImages = selected.filter((file) => file.type.startsWith('image/') && file.size <= 4 * 1024 * 1024);

    if (validImages.length === 0) {
      toast.error('Please select image files up to 4MB each.');
      return;
    }

    try {
      const prepared = await Promise.all(
        validImages.map(async (file) => ({
          name: file.name,
          type: file.type,
          dataUrl: await fileToDataUrl(file),
        }))
      );
      setAttachments((prev) => [...prev, ...prepared].slice(0, 3));
    } catch (error: any) {
      toast.error(error.message || 'Failed to attach files');
    }
  };

  const sendMessage = async (text: string) => {
    if ((!text.trim() && attachments.length === 0) || (!isUnlimited && remaining <= 0) || isLoading) return;

    const attachmentNote = attachments.length
      ? `\n\n[Attached images: ${attachments.map((a) => a.name).join(', ')}]`
      : '';

    const userMsg: Message = { role: 'user', content: `${text.trim()}${attachmentNote}`.trim() };
    const newMessages = [...messages, userMsg];

    setMessages(newMessages);
    setInput('');
    setQuestionsUsed((prev) => prev + 1);
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
          options: {
            thinking: thinkingMode,
            webSearch: webSearchMode,
          },
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
        { role: 'assistant', content: 'I apologize, I was unable to process your question. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-6">
        <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-secondary border-2 border-primary flex items-center justify-center">
          <Bot size={32} className="text-primary" />
        </div>
        <p className="font-arabic text-primary text-sm mb-1">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
        <h2 className="text-2xl font-bold text-foreground mb-1">As-salamu alaykum 👋</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          I'm Ustadh AI — your Islamic knowledge companion. Ask me anything about Islam, the Quran, Hadith, and Fiqh.
        </p>
      </div>

      <div className="flex flex-wrap justify-center items-center gap-2 mb-4 text-xs">
        <span className="bg-card border border-border rounded-full px-3 py-1 text-foreground flex items-center gap-1">
          <Crown size={12} className="text-primary" /> {currentPlan}
        </span>
        <span className={`rounded-full px-3 py-1 border ${perks.uploads ? 'bg-primary/10 border-primary/30 text-foreground' : 'bg-secondary border-border text-muted-foreground'}`}>
          Uploads
        </span>
        <span className={`rounded-full px-3 py-1 border ${perks.thinking ? 'bg-primary/10 border-primary/30 text-foreground' : 'bg-secondary border-border text-muted-foreground'}`}>
          Thinking
        </span>
        <span className={`rounded-full px-3 py-1 border ${perks.webSearch ? 'bg-primary/10 border-primary/30 text-foreground' : 'bg-secondary border-border text-muted-foreground'}`}>
          Web Search
        </span>
      </div>

      <div className="flex justify-center mb-6">
        <div className="bg-secondary rounded-full px-4 py-2 flex items-center gap-2">
          {isUnlimited ? (
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

      {messages.length > 0 && (
        <div ref={chatRef} className="bg-card border border-border rounded-xl p-4 mb-4 max-h-[400px] overflow-y-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={14} className="text-primary" />
                </div>
              )}
              <div
                className={`rounded-xl px-4 py-2.5 text-sm max-w-[80%] ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
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
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                  <User size={14} className="text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {messages.length === 0 && (
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
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          <label className={`cursor-pointer ${perks.uploads ? 'text-primary' : 'text-muted-foreground'}`}>
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
        </div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder={isUnlimited || remaining > 0 ? 'Ask about Islam...' : 'Daily limit reached. Upgrade for more.'}
          disabled={!isUnlimited && remaining <= 0}
          className="w-full bg-card text-foreground placeholder:text-muted-foreground rounded-xl pl-10 pr-12 py-3.5 text-sm border border-border focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={(!input.trim() && attachments.length === 0) || (!isUnlimited && remaining <= 0) || isLoading}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-primary disabled:text-muted-foreground transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default UstadhAI;
