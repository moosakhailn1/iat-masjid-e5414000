import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Heart, Trash2 } from 'lucide-react';
import { hadiths, duas, khutbahs } from '@/data/library';
import LibraryCard from './LibraryCard';

const FavoritesSection = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<{ item_id: string; item_type: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadFavorites();
  }, [user]);

  const loadFavorites = async () => {
    const { data } = await supabase
      .from('favorites')
      .select('item_id, item_type')
      .eq('user_id', user!.id);
    setFavorites(data || []);
    setLoading(false);
  };

  const removeFavorite = async (itemId: string, itemType: string) => {
    await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user!.id)
      .eq('item_id', itemId)
      .eq('item_type', itemType);
    setFavorites(prev => prev.filter(f => !(f.item_id === itemId && f.item_type === itemType)));
    toast.success('Removed from favorites');
  };

  if (!user) {
    return (
      <div className="text-center py-16">
        <Heart size={48} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Sign in to view your saved favorites.</p>
      </div>
    );
  }

  if (loading) return <p className="text-center text-muted-foreground py-12">Loading favorites...</p>;

  const favHadiths = hadiths.filter(h => favorites.some(f => f.item_id === h.id && f.item_type === 'hadith'));
  const favDuas = duas.filter(d => favorites.some(f => f.item_id === d.id && f.item_type === 'dua'));
  const favKhutbahs = khutbahs.filter(k => favorites.some(f => f.item_id === k.id && f.item_type === 'khutbah'));
  const total = favHadiths.length + favDuas.length + favKhutbahs.length;

  if (total === 0) {
    return (
      <div className="text-center py-16">
        <Heart size={48} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-foreground font-medium mb-1">No favorites yet</p>
        <p className="text-muted-foreground text-sm">Browse the library and tap the heart to save items.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-bold text-foreground">Your Favorites ({total})</h2>

      {favHadiths.length > 0 && (
        <div>
          <h3 className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Hadiths</h3>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {favHadiths.map(h => (
              <div key={h.id} className="relative">
                <LibraryCard arabic={h.arabic} english={h.english} pashto={h.pashto} dari={h.dari} source={h.source} number={h.number} narrator={h.narrator} category={h.category} isFavorited onToggleFavorite={() => removeFavorite(h.id, 'hadith')} />
              </div>
            ))}
          </div>
        </div>
      )}

      {favDuas.length > 0 && (
        <div>
          <h3 className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Du'as</h3>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {favDuas.map(d => (
              <div key={d.id} className="relative">
                <LibraryCard arabic={d.arabic} english={d.english} pashto={d.pashto} dari={d.dari} source={d.source} category={d.category} occasion={d.occasion} isFavorited onToggleFavorite={() => removeFavorite(d.id, 'dua')} />
              </div>
            ))}
          </div>
        </div>
      )}

      {favKhutbahs.length > 0 && (
        <div>
          <h3 className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Khutbahs</h3>
          <div className="grid gap-4 grid-cols-1">
            {favKhutbahs.map(k => (
              <div key={k.id} className="relative">
                <LibraryCard arabic={k.arabic} english={k.english} pashto={k.pashto} dari={k.dari} source={k.topic} category={k.category} title={k.title} imam={k.imam} date={k.date} type={k.type} fullText={k.fullText} isFavorited onToggleFavorite={() => removeFavorite(k.id, 'khutbah')} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FavoritesSection;
