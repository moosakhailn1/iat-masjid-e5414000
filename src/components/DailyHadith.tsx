import { Sparkles } from 'lucide-react';
import { dailyHadith } from '@/data/library';

const DailyHadith = () => {
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
