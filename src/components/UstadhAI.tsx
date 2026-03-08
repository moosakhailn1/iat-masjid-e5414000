import { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const suggestedQuestions = [
  'What are the five pillars of Islam?',
  'How do I perform Salah correctly?',
  'What does the Quran say about patience?',
  'What is the significance of Ramadan?',
];

const FREE_LIMIT = 15;

const UstadhAI = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [questionsUsed, setQuestionsUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const remaining = FREE_LIMIT - questionsUsed;

  const sendMessage = async (text: string) => {
    if (!text.trim() || remaining <= 0 || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setQuestionsUsed(prev => prev + 1);
    setIsLoading(true);

    // Mock AI response for now
    setTimeout(() => {
      const response: Message = {
        role: 'assistant',
        content: getStaticResponse(text),
      };
      setMessages(prev => [...prev, response]);
      setIsLoading(false);
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
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

      {/* Questions remaining */}
      <div className="flex justify-center mb-6">
        <div className="bg-secondary rounded-full px-4 py-2 flex items-center gap-2">
          <div className="flex gap-0.5">
            {Array.from({ length: FREE_LIMIT }).map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < remaining ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
          <span className="text-muted-foreground text-xs">{remaining} of {FREE_LIMIT} questions remaining today</span>
        </div>
      </div>

      {/* Chat area */}
      {messages.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 max-h-[400px] overflow-y-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Bot size={14} className="text-primary" />
                </div>
              )}
              <div className={`rounded-xl px-4 py-2.5 text-sm max-w-[80%] ${
                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
              }`}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User size={14} className="text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-primary" />
              </div>
              <div className="bg-secondary rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suggested questions */}
      {messages.length === 0 && (
        <div className="mb-4">
          <p className="text-muted-foreground text-xs uppercase tracking-wider text-center mb-3">
            Suggested Questions
          </p>
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

      {/* Input */}
      <div className="relative">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          placeholder={remaining > 0 ? 'Ask about Islam...' : 'Daily limit reached. Upgrade for more.'}
          disabled={remaining <= 0}
          className="w-full bg-card text-foreground placeholder:text-muted-foreground rounded-xl pl-4 pr-12 py-3.5 text-sm border border-border focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || remaining <= 0 || isLoading}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-primary disabled:text-muted-foreground transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

function getStaticResponse(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('five pillars') || q.includes('pillars of islam')) {
    return 'The Five Pillars of Islam are:\n\n1. **Shahada** — Testimony of faith\n2. **Salah** — Prayer (five times daily)\n3. **Zakat** — Obligatory charity\n4. **Sawm** — Fasting during Ramadan\n5. **Hajj** — Pilgrimage to Makkah\n\nThese are the foundational acts of worship in Islam, as narrated in Sahih Bukhari and Sahih Muslim.';
  }
  if (q.includes('salah') || q.includes('prayer') || q.includes('pray')) {
    return 'To perform Salah correctly, you should:\n\n1. Make Wudu (ablution)\n2. Face the Qiblah direction\n3. Make the intention (Niyyah)\n4. Say "Allahu Akbar" to begin\n5. Recite Surah Al-Fatiha\n6. Perform Ruku (bowing)\n7. Stand up from Ruku\n8. Perform Sujood (prostration)\n9. Sit between prostrations\n10. Complete with Tashahhud and Salam\n\nThe Prophet ﷺ said: "Pray as you have seen me praying." (Sahih Bukhari)';
  }
  if (q.includes('patience') || q.includes('sabr')) {
    return 'The Quran speaks extensively about patience (Sabr):\n\n"O you who believe, seek help through patience and prayer. Indeed, Allah is with the patient." (2:153)\n\n"And We will surely test you with something of fear and hunger and a loss of wealth and lives and fruits, but give good tidings to the patient." (2:155)\n\nThe Prophet ﷺ said: "Patience is illumination." (Sahih Muslim)';
  }
  if (q.includes('ramadan')) {
    return 'Ramadan is the ninth month of the Islamic calendar, during which Muslims fast from dawn to sunset.\n\nIts significance:\n- The Quran was revealed in Ramadan\n- It contains Laylat al-Qadr (Night of Power)\n- Fasting is one of the Five Pillars\n- It is a month of mercy, forgiveness, and salvation\n\n"Whoever fasts during Ramadan with sincere faith and hoping for a reward from Allah, all his previous sins will be forgiven." (Sahih Bukhari)';
  }
  return 'JazakAllahu Khairan for your question. Based on authentic Islamic sources, I would recommend consulting the Quran and authentic Hadith collections for detailed guidance on this topic. You may also want to speak with a local scholar or imam for personalized advice.\n\nRemember: "Seeking knowledge is an obligation upon every Muslim." (Sunan Ibn Majah)';
}

export default UstadhAI;
