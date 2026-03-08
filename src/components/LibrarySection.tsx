import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { hadiths, duas, khutbahs, seerahEvents, categories, seerahCategories } from '@/data/library';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DailyHadith from './DailyHadith';
import LibraryCard from './LibraryCard';

type LibraryTab = 'hadiths' | 'duas' | 'khutbahs' | 'seerah';

const khutbahTypes = ['All', 'Friday Sermon', 'Eid', 'Ramadan', 'General', 'Special Occasion'] as const;

const LibrarySection = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<LibraryTab>('hadiths');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedKhutbahType, setSelectedKhutbahType] = useState<string>('All');
  const [selectedSeerahCategory, setSelectedSeerahCategory] = useState<string>('All');
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [dbContent, setDbContent] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      supabase.from('favorites').select('item_id').eq('user_id', user.id).then(({ data }) => {
        setFavIds(new Set((data || []).map(f => f.item_id)));
      });
    }
  }, [user]);

  // Load admin-added content from DB
  useEffect(() => {
    supabase.from('library_content').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setDbContent(data || []);
    });
  }, []);

  // Merge static + DB content
  const allHadiths = useMemo(() => {
    const dbH = dbContent.filter(c => c.content_type === 'hadith').map(c => ({
      id: c.id, arabic: c.arabic, english: c.english, pashto: c.pashto, dari: c.dari,
      source: c.source, number: c.hadith_number || 0, narrator: c.narrator || '', category: c.category,
    }));
    return [...hadiths, ...dbH];
  }, [dbContent]);

  const allDuas = useMemo(() => {
    const dbD = dbContent.filter(c => c.content_type === 'dua').map(c => ({
      id: c.id, arabic: c.arabic, english: c.english, pashto: c.pashto, dari: c.dari,
      source: c.source, occasion: c.occasion || '', category: c.category,
    }));
    return [...duas, ...dbD];
  }, [dbContent]);

  const allKhutbahs = useMemo(() => {
    const dbK = dbContent.filter(c => c.content_type === 'khutbah').map(c => ({
      id: c.id, title: c.title || '', arabic: c.arabic, english: c.english, pashto: c.pashto, dari: c.dari,
      imam: c.imam || '', date: c.event_date || '', topic: c.source, category: c.category,
      type: c.content_subtype || 'General', fullText: c.full_text || '',
    }));
    return [...khutbahs, ...dbK];
  }, [dbContent]);

  const allSeerah = useMemo(() => {
    const dbS = dbContent.filter(c => c.content_type === 'seerah').map(c => ({
      id: c.id, title: c.title || '', arabic: c.arabic, english: c.english, pashto: c.pashto, dari: c.dari,
      year: c.event_date || '', source: c.source, category: c.category, details: c.full_text || '',
    }));
    return [...seerahEvents, ...dbS];
  }, [dbContent]);

  const filteredHadiths = useMemo(() => {
    return allHadiths.filter(h => {
      const q = search.toLowerCase();
      const matchesSearch = !search || h.english.toLowerCase().includes(q) || h.arabic.includes(search) || h.pashto.toLowerCase().includes(q) || h.dari.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'All' || h.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [search, selectedCategory, allHadiths]);

  const filteredDuas = useMemo(() => {
    return allDuas.filter(d => {
      const q = search.toLowerCase();
      const matchesSearch = !search || d.english.toLowerCase().includes(q) || d.arabic.includes(search) || d.pashto.toLowerCase().includes(q) || d.dari.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'All' || d.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [search, selectedCategory, allDuas]);

  const filteredKhutbahs = useMemo(() => {
    return allKhutbahs.filter(k => {
      const q = search.toLowerCase();
      const matchesSearch = !search || k.title.toLowerCase().includes(q) || k.english.toLowerCase().includes(q) || k.pashto.toLowerCase().includes(q) || k.dari.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'All' || k.category === selectedCategory;
      const matchesType = selectedKhutbahType === 'All' || k.type === selectedKhutbahType;
      return matchesSearch && matchesCat && matchesType;
    });
  }, [search, selectedCategory, selectedKhutbahType, allKhutbahs]);

  const filteredSeerah = useMemo(() => {
    return allSeerah.filter(s => {
      const q = search.toLowerCase();
      const matchesSearch = !search || s.title.toLowerCase().includes(q) || s.english.toLowerCase().includes(q) || s.pashto.toLowerCase().includes(q) || s.dari.toLowerCase().includes(q);
      const matchesCat = selectedSeerahCategory === 'All' || s.category === selectedSeerahCategory;
      return matchesSearch && matchesCat;
    });
  }, [search, selectedSeerahCategory, allSeerah]);

  return (
    <div className="space-y-6">
      <DailyHadith />

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['hadiths', 'duas', 'khutbahs', 'seerah'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(''); setSelectedCategory('All'); setSelectedSeerahCategory('All'); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
          >
            {t === 'duas' ? "Du'as" : t === 'khutbahs' ? 'Khutbas' : t === 'seerah' ? 'Seerah' : 'Hadiths'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${tab} (English, Pashto, Dari, Arabic)...`}
          className="w-full bg-secondary text-foreground placeholder:text-muted-foreground rounded-lg pl-10 pr-4 py-2.5 text-sm border border-border focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Category Filters for hadiths/duas/khutbahs */}
      {tab !== 'seerah' && (
        <div className="flex gap-2 flex-wrap">
          {['All', ...categories].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Seerah category filters */}
      {tab === 'seerah' && (
        <div className="flex gap-2 flex-wrap">
          {['All', ...seerahCategories].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedSeerahCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedSeerahCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Khutbah type filters */}
      {tab === 'khutbahs' && (
        <div className="flex gap-2 flex-wrap">
          {khutbahTypes.map(t => (
            <button
              key={t}
              onClick={() => setSelectedKhutbahType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedKhutbahType === t ? 'bg-primary/20 text-primary border border-primary' : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Cards Grid */}
      <div className={`grid gap-4 ${(tab === 'khutbahs' || tab === 'seerah') ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {tab === 'hadiths' && filteredHadiths.map(h => (
          <LibraryCard key={h.id} id={h.id} itemType="hadith" arabic={h.arabic} english={h.english} pashto={h.pashto} dari={h.dari} source={h.source} number={h.number} narrator={h.narrator} category={h.category} isFavorited={favIds.has(h.id)} />
        ))}
        {tab === 'duas' && filteredDuas.map(d => (
          <LibraryCard key={d.id} id={d.id} itemType="dua" arabic={d.arabic} english={d.english} pashto={d.pashto} dari={d.dari} source={d.source} category={d.category} occasion={d.occasion} isFavorited={favIds.has(d.id)} />
        ))}
        {tab === 'khutbahs' && filteredKhutbahs.map(k => (
          <LibraryCard key={k.id} id={k.id} itemType="khutbah" arabic={k.arabic} english={k.english} pashto={k.pashto} dari={k.dari} source={k.topic} category={k.category} title={k.title} imam={k.imam} date={k.date} type={k.type} fullText={k.fullText} isFavorited={favIds.has(k.id)} />
        ))}
        {tab === 'seerah' && filteredSeerah.map(s => (
          <LibraryCard key={s.id} id={s.id} itemType="seerah" arabic={s.arabic} english={s.english} pashto={s.pashto} dari={s.dari} source={s.source} category={s.category} title={s.title} date={s.year} fullText={s.details} isFavorited={favIds.has(s.id)} />
        ))}
      </div>

      {((tab === 'hadiths' && !filteredHadiths.length) || (tab === 'duas' && !filteredDuas.length) || (tab === 'khutbahs' && !filteredKhutbahs.length) || (tab === 'seerah' && !filteredSeerah.length)) && (
        <p className="text-center text-muted-foreground py-12">No results found.</p>
      )}
    </div>
  );
};

export default LibrarySection;
