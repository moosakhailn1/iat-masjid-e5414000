import { Book, MessageCircle, Crown } from 'lucide-react';

interface HeaderProps {
  activeTab: 'library' | 'ai' | 'pricing';
  onTabChange: (tab: 'library' | 'ai' | 'pricing') => void;
}

const Header = ({ activeTab, onTabChange }: HeaderProps) => {
  return (
    <header className="border-b border-border py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <p className="text-center font-arabic text-primary text-lg mb-1">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
        <p className="text-center text-muted-foreground text-xs uppercase tracking-[0.3em] mb-2">
          Islamic Association of Texas
        </p>
        <h1 className="text-center text-3xl md:text-5xl font-bold mb-1">
          <span className="gold-gradient">IAT</span>{' '}
          <span className="text-foreground">Islamic Library</span>
        </h1>
        <p className="text-center text-muted-foreground text-sm mb-6">
          Hadiths · Du'as · Khutbas · Islamic Guidance
        </p>

        <nav className="flex justify-center gap-2 flex-wrap">
          {[
            { id: 'library' as const, label: 'Library', icon: Book },
            { id: 'ai' as const, label: 'Ask Ustadh AI', icon: MessageCircle },
            { id: 'pricing' as const, label: 'Upgrade', icon: Crown },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;
