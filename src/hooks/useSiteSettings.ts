import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NavLink {
  label: string;
  href: string;
  isDonate: boolean;
}

export interface NavbarSettings {
  siteName: string;
  siteTagline: string;
  ribbonText: string;
  logoUrl: string;
  address: string;
  phone: string;
  email: string;
  links: NavLink[];
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterSettings {
  brandName: string;
  brandDescription: string;
  address: string;
  phone: string;
  email: string;
  quickLinks: FooterLink[];
  resourceLinks: FooterLink[];
  developerName: string;
  developerUrl: string;
}

const DEFAULT_NAVBAR: NavbarSettings = {
  siteName: 'Islamic Association of Texas',
  siteTagline: 'Community • Education • Worship',
  ribbonText: 'Ramadan Mubarak — Islamic Association of Texas',
  logoUrl: '',
  address: '132 N Glenville Dr, Richardson, TX 75081',
  phone: '(972) 863-9696',
  email: 'abuhanifahiat@gmail.com',
  links: [
    { label: 'Home', href: '/', isDonate: false },
    { label: 'Quran', href: '/quran/', isDonate: false },
    { label: 'Islam', href: '/islam/', isDonate: false },
    { label: 'Events', href: '/events/', isDonate: false },
    { label: 'Donate', href: '/donate/', isDonate: true },
    { label: 'Contact', href: '/contact/', isDonate: false },
  ],
};

const DEFAULT_FOOTER: FooterSettings = {
  brandName: 'Islamic Association of Texas',
  brandDescription: 'Serving the Richardson community with prayer, education, and unity — grounded in the Qur\'an and Sunnah.',
  address: '132 N Glenville Dr, Richardson, TX 75081',
  phone: '(972) 863-9696',
  email: 'abuhanifahiat@gmail.com',
  quickLinks: [
    { label: 'Home', href: '/' },
    { label: 'Donate', href: '/donate/' },
    { label: 'Events', href: '/events/' },
    { label: 'Community Services', href: '/contact/' },
  ],
  resourceLinks: [
    { label: 'Digital Qur\'an', href: '/quran/' },
    { label: 'AI Memorization Tool', href: '/' },
    { label: 'Islam', href: '/islam/' },
    { label: 'Terms of Use', href: '#' },
  ],
  developerName: 'Numanullah Moosakhail',
  developerUrl: 'https://numanullah.com',
};

export function useSiteSettings() {
  const [navbar, setNavbar] = useState<NavbarSettings>(DEFAULT_NAVBAR);
  const [footer, setFooter] = useState<FooterSettings>(DEFAULT_FOOTER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key, published_value');
      
      if (data) {
        const navRow = data.find(r => r.key === 'navbar');
        const footRow = data.find(r => r.key === 'footer');
        if (navRow?.published_value) setNavbar({ ...DEFAULT_NAVBAR, ...(navRow.published_value as unknown as NavbarSettings) });
        if (footRow?.published_value) setFooter({ ...DEFAULT_FOOTER, ...(footRow.published_value as unknown as FooterSettings) });
      }
      setLoading(false);
    };
    load();
  }, []);

  return { navbar, footer, loading };
}

// Hook for admin to get draft values
export function useSiteSettingsDraft() {
  const [navbarDraft, setNavbarDraft] = useState<NavbarSettings>(DEFAULT_NAVBAR);
  const [footerDraft, setFooterDraft] = useState<FooterSettings>(DEFAULT_FOOTER);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('site_settings')
      .select('key, draft_value, published_value');
    
    if (data) {
      const navRow = data.find(r => r.key === 'navbar');
      const footRow = data.find(r => r.key === 'footer');
      if (navRow?.draft_value) setNavbarDraft({ ...DEFAULT_NAVBAR, ...(navRow.draft_value as unknown as NavbarSettings) });
      if (footRow?.draft_value) setFooterDraft({ ...DEFAULT_FOOTER, ...(footRow.draft_value as unknown as FooterSettings) });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveDraft = async (key: 'navbar' | 'footer', value: NavbarSettings | FooterSettings) => {
    const { error } = await supabase
      .from('site_settings')
      .update({ draft_value: JSON.parse(JSON.stringify(value)), updated_at: new Date().toISOString() })
      .eq('key', key);
    return error;
  };

  const publish = async (key: 'navbar' | 'footer') => {
    // Get current draft
    const { data } = await supabase
      .from('site_settings')
      .select('draft_value')
      .eq('key', key)
      .single();
    
    if (!data) return { error: { message: 'Setting not found' } };

    const { error } = await supabase
      .from('site_settings')
      .update({ published_value: data.draft_value, updated_at: new Date().toISOString() })
      .eq('key', key);
    return { error };
  };

  return { navbarDraft, setNavbarDraft, footerDraft, setFooterDraft, loading, saveDraft, publish, reload: load };
}
