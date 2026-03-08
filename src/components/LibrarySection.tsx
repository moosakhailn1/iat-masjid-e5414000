import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { hadiths, duas, khutbahs, categories } from '@/data/library';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DailyHadith from './DailyHadith';
import LibraryCard from './LibraryCard';

type LibraryTab = 'hadiths' | 'duas' | 'khutbahs';

const khutbahTypes = ['All', 'Friday Sermon', 'Eid', 'Ramadan', 'General', 'Special Occasion'] as const;

const LibrarySection = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<LibraryTab>('hadiths');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedKhutbahType, setSelectedKhutbahType] = useState<string>('All');
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      supabase.from('favorites').select('item_id').eq('user_id', user.id).then(({ data }) => {
        setFavIds(new Set((data || []).map(f => f.item_id)));
      });
    }
  }, [user]);

  const filteredHadiths = useMemo(() => {
    return hadiths.filter(h => {
      const q = search.toLowerCase();
      const matchesSearch = !search || h.english.toLowerCase().includes(q) || h.arabic.includes(search) || h.pashto.toLowerCase().includes(q) || h.dari.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'All' || h.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [search, selectedCategory]);

  const filteredDuas = useMemo(() => {
    return duas.filter(d => {
      const q = search.toLowerCase();
      const matchesSearch = !search || d.english.toLowerCase().includes(q) || d.arabic.includes(search) || d.pashto.toLowerCase().includes(q) || d.dari.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'All' || d.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [search, selectedCategory]);

  const filteredKhutbahs = useMemo(() => {
    return khutbahs.filter(k => {
      const q = search.toLowerCase();
      const matchesSearch = !search || k.title.toLowerCase().includes(q) || k.english.toLowerCase().includes(q) || k.pashto.toLowerCase().includes(q) || k.dari.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'All' || k.category === selectedCategory;
      const matchesType = selectedKhutbahType === 'All' || k.type === selectedKhutbahType;
      return matchesSearch && matchesCat && matchesType;
    });
  }, [search, selectedCategory, selectedKhutbahType]);

  return (
    <div className="space-y-6">
      <DailyHadith />

      {/* Tabs */}
      <div className="flex gap-2">
        {(['hadiths', 'duas', 'khutbahs'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(''); setSelectedCategory('All'); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
          >
            {t === 'duas' ? "Du'as" : t === 'khutbahs' ? 'Khutbas' : 'Hadiths'}
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

      {/* Category Filters */}
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
      <div className={`grid gap-4 ${tab === 'khutbahs' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {tab === 'hadiths' && filteredHadiths.map(h => (
          <LibraryCard key={h.id} id={h.id} itemType="hadith" arabic={h.arabic} english={h.english} pashto={h.pashto} dari={h.dari} source={h.source} number={h.number} narrator={h.narrator} category={h.category} isFavorited={favIds.has(h.id)} />
        ))}
        {tab === 'duas' && filteredDuas.map(d => (
          <LibraryCard key={d.id} id={d.id} itemType="dua" arabic={d.arabic} english={d.english} pashto={d.pashto} dari={d.dari} source={d.source} category={d.category} occasion={d.occasion} isFavorited={favIds.has(d.id)} />
        ))}
        {tab === 'khutbahs' && filteredKhutbahs.map(k => (
          <LibraryCard key={k.id} id={k.id} itemType="khutbah" arabic={k.arabic} english={k.english} pashto={k.pashto} dari={k.dari} source={k.topic} category={k.category} title={k.title} imam={k.imam} date={k.date} type={k.type} fullText={k.fullText} isFavorited={favIds.has(k.id)} />
        ))}
      </div>

      {((tab === 'hadiths' && !filteredHadiths.length) || (tab === 'duas' && !filteredDuas.length) || (tab === 'khutbahs' && !filteredKhutbahs.length)) && (
        <p className="text-center text-muted-foreground py-12">No results found.</p>
      )}
    </div>
  );
};

export default LibrarySection;
