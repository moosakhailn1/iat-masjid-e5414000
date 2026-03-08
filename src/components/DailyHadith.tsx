import { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { dailyHadith } from '@/data/library';

const DailyHadith = () => {
  const [showTranslations, setShowTranslations] = useState(false);
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-card border border-border rounded-xl p-6 md:p-8 card-glow animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <span className="text-primary text-xs font-semibold uppercase tracking-wider">
            Daily Hadith
          </span>
        </div>
        <span className="text-muted-foreground text-sm">{today}</span>
      </div>

      <p className="font-arabic text-primary text-xl md:text-2xl text-right leading-relaxed mb-4">
        {dailyHadith.arabic}
      </p>

      <p className="text-foreground italic mb-3">{dailyHadith.english}</p>

      {/* Pashto/Dari toggle */}
      <button
        onClick={() => setShowTranslations(!showTranslations)}
        className="flex items-center gap-1 text-primary text-xs mb-3 hover:underline"
      >
        {showTranslations ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {showTranslations ? 'Hide' : 'Show'} Pashto / Dari
      </button>
      {showTranslations && (
        <div className="space-y-2 mb-3 pl-3 border-l-2 border-primary/30">
          <div>
            <span className="text-primary text-xs font-semibold">پښتو (Pashto):</span>
            <p className="text-foreground/80 text-sm leading-relaxed" dir="rtl">{dailyHadith.pashto}</p>
          </div>
          <div>
            <span className="text-primary text-xs font-semibold">دری (Dari):</span>
            <p className="text-foreground/80 text-sm leading-relaxed" dir="rtl">{dailyHadith.dari}</p>
          </div>
        </div>
      )}

      <p className="text-primary text-sm font-medium">
        — {dailyHadith.source} #{dailyHadith.number}
      </p>
      <p className="text-muted-foreground text-xs">
        Narrated by: {dailyHadith.narrator}
      </p>
    </div>
  );
};

export default DailyHadith;
