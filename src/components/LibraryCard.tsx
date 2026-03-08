import { useState } from 'react';
import { Copy, Printer, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LibraryCardProps {
  id?: string;
  itemType?: 'hadith' | 'dua' | 'khutbah' | 'seerah';
  arabic: string;
  english: string;
  pashto?: string;
  dari?: string;
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
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}

const LibraryCard = ({
  id,
  itemType,
  arabic,
  english,
  pashto,
  dari,
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
  isFavorited: initialFavorited,
  onToggleFavorite,
}: LibraryCardProps) => {
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(initialFavorited ?? false);
  const [expanded, setExpanded] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);

  const handleCopy = () => {
    const text = `${arabic}\n\n${english}${pashto ? `\n\nPashto: ${pashto}` : ''}${dari ? `\n\nDari: ${dari}` : ''}\n\n— ${source}${number ? ` #${number}` : ''}`;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (w) {
      const isSeerah = itemType === 'seerah';
      const isKhutbah = itemType === 'khutbah';
      w.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>${title || 'Print'} — IAT Islamic Library</title>
          <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Inter', sans-serif;
              color: #1a1a2e;
              padding: 48px 56px;
              max-width: 800px;
              margin: 0 auto;
              line-height: 1.7;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #c8a45a;
              padding-bottom: 20px;
              margin-bottom: 32px;
            }
            .header .bismillah {
              font-family: 'Amiri', serif;
              font-size: 22px;
              color: #c8a45a;
              margin-bottom: 4px;
            }
            .header .org {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 3px;
              color: #888;
              margin-bottom: 8px;
            }
            .header h1 {
              font-size: 20px;
              font-weight: 600;
              color: #1a1a2e;
            }
            .header .meta {
              font-size: 12px;
              color: #666;
              margin-top: 6px;
            }
            .arabic-block {
              background: #faf8f3;
              border: 1px solid #e8e0d0;
              border-radius: 12px;
              padding: 24px 28px;
              margin-bottom: 24px;
              text-align: right;
              direction: rtl;
            }
            .arabic-text {
              font-family: 'Amiri', serif;
              font-size: 26px;
              line-height: 2;
              color: #1a1a2e;
            }
            .english-text {
              font-size: 15px;
              line-height: 1.8;
              color: #2a2a3e;
              margin-bottom: 20px;
              font-style: italic;
            }
            .translation-section {
              border-left: 3px solid #c8a45a;
              padding-left: 16px;
              margin-bottom: 20px;
            }
            .translation-label {
              font-size: 11px;
              font-weight: 600;
              color: #c8a45a;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 4px;
            }
            .translation-text {
              font-size: 14px;
              line-height: 1.7;
              color: #444;
              direction: rtl;
              text-align: right;
              margin-bottom: 12px;
            }
            .source-block {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 16px;
              background: #f5f3ef;
              border-radius: 8px;
              margin-bottom: 24px;
            }
            .source-text {
              font-size: 13px;
              color: #c8a45a;
              font-weight: 600;
            }
            .category-badge {
              font-size: 11px;
              background: #e8e0d0;
              color: #666;
              padding: 4px 12px;
              border-radius: 20px;
            }
            .narrator-text {
              font-size: 12px;
              color: #888;
            }
            .full-text {
              font-size: 14px;
              line-height: 1.9;
              color: #333;
              white-space: pre-line;
              margin-top: 16px;
              padding-top: 16px;
              border-top: 1px solid #e0dcd5;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e0dcd5;
              font-size: 11px;
              color: #aaa;
            }
            @media print {
              body { padding: 32px 40px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
            <div class="org">Islamic Association of Texas</div>
            ${title ? `<h1>${title}</h1>` : ''}
            <div class="meta">
              ${imam ? `🕌 ${imam}` : ''}
              ${date ? ` · 📅 ${date}` : ''}
              ${type ? ` · ${type}` : ''}
              ${narrator ? `Narrated by: ${narrator}` : ''}
            </div>
          </div>

          <div class="arabic-block">
            <div class="arabic-text">${arabic}</div>
          </div>

          <div class="english-text">${english}</div>

          ${pashto ? `
          <div class="translation-section">
            <div class="translation-label">پښتو (Pashto)</div>
            <div class="translation-text">${pashto}</div>
          </div>` : ''}

          ${dari ? `
          <div class="translation-section">
            <div class="translation-label">دری (Dari)</div>
            <div class="translation-text">${dari}</div>
          </div>` : ''}

          <div class="source-block">
            <div>
              <div class="source-text">📖 ${source}${number ? ` #${number}` : ''}</div>
              ${narrator ? `<div class="narrator-text">Narrated by: ${narrator}</div>` : ''}
            </div>
            <span class="category-badge">${category}</span>
          </div>

          ${fullText ? `<div class="full-text">${fullText}</div>` : ''}

          <div class="footer">
            IAT Islamic Library — Printed from the IAT Digital Collection
          </div>
        </body>
        </html>
      `);
      w.document.close();
      setTimeout(() => w.print(), 300);
    }
  };

  const handleFavorite = async () => {
    if (onToggleFavorite) {
      onToggleFavorite();
      return;
    }
    if (!user) {
      toast.error('Sign in to save favorites');
      return;
    }
    if (!id || !itemType) return;

    if (favorited) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('item_id', id).eq('item_type', itemType);
      setFavorited(false);
      toast.success('Removed from favorites');
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, item_id: id, item_type: itemType });
      setFavorited(true);
      toast.success('Added to favorites');
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
          {!imam && date && (
            <p className="text-muted-foreground text-sm mt-1">
              📅 {date}
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

      {(pashto || dari) && (
        <>
          <button
            onClick={() => setShowTranslations(!showTranslations)}
            className="flex items-center gap-1 text-primary text-xs mb-2 hover:underline"
          >
            {showTranslations ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showTranslations ? 'Hide' : 'Show'} Pashto / Dari
          </button>
          {showTranslations && (
            <div className="space-y-2 mb-3 pl-3 border-l-2 border-primary/30">
              {pashto && (
                <div>
                  <span className="text-primary text-xs font-semibold">پښتو (Pashto):</span>
                  <p className="text-foreground/80 text-sm leading-relaxed" dir="rtl">{pashto}</p>
                </div>
              )}
              {dari && (
                <div>
                  <span className="text-primary text-xs font-semibold">دری (Dari):</span>
                  <p className="text-foreground/80 text-sm leading-relaxed" dir="rtl">{dari}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

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
            {expanded ? 'Show less' : itemType === 'seerah' ? 'Read full story' : 'Read full khutba'}
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
          onClick={handleFavorite}
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
