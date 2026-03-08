import { useState } from 'react';
import { Copy, Printer, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface LibraryCardProps {
  arabic: string;
  english: string;
  source: string;
  category: string;
  narrator?: string;
  number?: number;
  occasion?: string;
  title?: string;
  imam?: string;
  date?: string;
  type?: string;
  fullText?: string;
}

const LibraryCard = ({
  arabic,
  english,
  source,
  category,
  narrator,
  number,
  occasion,
  title,
  imam,
  date,
  type,
  fullText,
}: LibraryCardProps) => {
  const [favorited, setFavorited] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = () => {
    const text = `${arabic}\n\n${english}\n\n— ${source}${number ? ` #${number}` : ''}`;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`
        <html><head><title>Print</title>
        <style>body{font-family:serif;padding:40px;direction:ltr}
        .arabic{font-size:24px;text-align:right;direction:rtl;margin-bottom:20px}
        .english{font-style:italic;margin-bottom:10px}
        .source{color:#666}</style></head>
        <body><div class="arabic">${arabic}</div>
        <div class="english">${english}</div>
        <div class="source">— ${source}${number ? ` #${number}` : ''}</div>
        ${fullText ? `<hr><p>${fullText}</p>` : ''}
        </body></html>`);
      w.document.close();
      w.print();
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-gold-dim transition-colors animate-fade-in">
      {title && (
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-foreground font-semibold text-lg">{title}</h3>
            {type && (
              <span className="shrink-0 bg-primary/20 text-primary text-xs px-3 py-1 rounded-full">
                {type}
              </span>
            )}
          </div>
          {imam && (
            <p className="text-muted-foreground text-sm mt-1">
              🕌 {imam} {date && `· 📅 ${date}`}
            </p>
          )}
          {occasion && (
            <p className="text-primary text-sm">{occasion}</p>
          )}
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-4 mb-3">
        <p className="font-arabic text-primary text-lg md:text-xl text-right leading-relaxed">
          {arabic}
        </p>
      </div>

      {!title && occasion && (
        <p className="text-primary text-sm mb-2">{occasion}</p>
      )}

      <p className="text-foreground text-sm leading-relaxed mb-2">
        {english}
      </p>

      {fullText && (
        <>
          {expanded && (
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line mt-2 mb-2">
              {fullText}
            </p>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-primary text-sm mb-3 hover:underline"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Show less' : 'Read full khutba'}
          </button>
        </>
      )}

      <div className="flex items-center justify-between mt-2">
        <div>
          <p className="text-primary text-sm font-medium">
            📖 {source}{number ? ` #${number}` : ''}
          </p>
          {narrator && (
            <p className="text-muted-foreground text-xs">Narrated by: {narrator}</p>
          )}
        </div>
        <span className="bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-full">
          {category}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
        <button onClick={handleCopy} className="flex items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground transition-colors">
          <Copy size={13} /> Copy
        </button>
        <button onClick={handlePrint} className="flex items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground transition-colors">
          <Printer size={13} /> Print
        </button>
        <button
          onClick={() => { setFavorited(!favorited); toast.success(favorited ? 'Removed from favorites' : 'Added to favorites'); }}
          className={`flex items-center gap-1.5 text-xs transition-colors ${favorited ? 'text-red-400' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Heart size={13} fill={favorited ? 'currentColor' : 'none'} />
          {favorited ? 'Saved' : 'Favorite'}
        </button>
      </div>
    </div>
  );
};

export default LibraryCard;
