import { Book, MessageCircle, Crown, Heart, LogIn, LogOut, Shield, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type Tab = 'library' | 'ai' | 'pricing' | 'favorites';

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const Header = ({ activeTab, onTabChange }: HeaderProps) => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

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
          Hadiths · Du'as · Khutbas · Seerah · Islamic Guidance
        </p>

        <nav className="flex justify-center gap-2 flex-wrap">
          {([
            { id: 'library' as const, label: 'Library', icon: Book },
            { id: 'ai' as const, label: 'Ask Ustadh AI', icon: MessageCircle },
            { id: 'favorites' as const, label: 'Favorites', icon: Heart },
            { id: 'pricing' as const, label: 'Upgrade', icon: Crown },
          ]).map(({ id, label, icon: Icon }) => (
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

        {/* Auth bar */}
        <div className="flex justify-center gap-2 mt-4">
          {user ? (
            <>
              <span className="text-muted-foreground text-xs flex items-center gap-1">
                <User size={12} /> {user.email}
              </span>
              {isAdmin && (
                <button onClick={() => navigate('/admin')} className="flex items-center gap-1 text-primary text-xs hover:underline">
                  <Shield size={12} /> Admin
                </button>
              )}
              <button onClick={signOut} className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground">
                <LogOut size={12} /> Sign Out
              </button>
            </>
          ) : (
            <button onClick={() => navigate('/auth')} className="flex items-center gap-1 text-primary text-xs hover:underline">
              <LogIn size={12} /> Sign In / Sign Up
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
