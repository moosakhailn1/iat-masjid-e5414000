import { useState, useRef } from 'react';
import { useSiteSettingsDraft, NavbarSettings, FooterSettings, NavLink, FooterLink } from '@/hooks/useSiteSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Upload, Plus, Trash2, Eye, GripVertical } from 'lucide-react';

const inputClass = "bg-secondary text-foreground rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none w-full";

const SiteSettingsEditor = () => {
  const { navbarDraft, setNavbarDraft, footerDraft, setFooterDraft, loading, saveDraft, publish, reload } = useSiteSettingsDraft();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (loading) return <p className="text-muted-foreground text-center py-8">Loading settings...</p>;

  const handleSaveDraft = async (key: 'navbar' | 'footer') => {
    setSaving(true);
    const value = key === 'navbar' ? navbarDraft : footerDraft;
    const error = await saveDraft(key, value);
    if (error) toast.error(error.message);
    else toast.success(`${key} draft saved`);
    setSaving(false);
  };

  const handlePublish = async (key: 'navbar' | 'footer') => {
    setPublishing(key);
    // Save draft first
    const value = key === 'navbar' ? navbarDraft : footerDraft;
    await saveDraft(key, value);
    const { error } = await publish(key);
    if (error) toast.error(error.message);
    else toast.success(`${key} published! Changes are now live.`);
    setPublishing(null);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    
    const ext = file.name.split('.').pop();
    const path = `logo.${ext}`;
    
    // Remove old logo
    await supabase.storage.from('site-assets').remove([path]);
    
    const { error } = await supabase.storage.from('site-assets').upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    
    const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(path);
    setNavbarDraft(prev => ({ ...prev, logoUrl: urlData.publicUrl }));
    toast.success('Logo uploaded! Save draft to keep.');
    setUploading(false);
  };

  const updateNavLink = (index: number, field: keyof NavLink, value: string | boolean) => {
    setNavbarDraft(prev => {
      const links = [...prev.links];
      links[index] = { ...links[index], [field]: value };
      return { ...prev, links };
    });
  };

  const addNavLink = () => {
    setNavbarDraft(prev => ({
      ...prev,
      links: [...prev.links, { label: 'New Link', href: '/', isDonate: false }],
    }));
  };

  const removeNavLink = (index: number) => {
    setNavbarDraft(prev => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index),
    }));
  };

  const updateFooterLink = (section: 'quickLinks' | 'resourceLinks', index: number, field: keyof FooterLink, value: string) => {
    setFooterDraft(prev => {
      const links = [...prev[section]];
      links[index] = { ...links[index], [field]: value };
      return { ...prev, [section]: links };
    });
  };

  const addFooterLink = (section: 'quickLinks' | 'resourceLinks') => {
    setFooterDraft(prev => ({
      ...prev,
      [section]: [...prev[section], { label: 'New Link', href: '/' }],
    }));
  };

  const removeFooterLink = (section: 'quickLinks' | 'resourceLinks', index: number) => {
    setFooterDraft(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      {/* ===== NAVBAR SETTINGS ===== */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-semibold text-lg">Navbar Settings</h3>
          <div className="flex gap-2">
            <button onClick={() => handleSaveDraft('navbar')} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-muted">
              <Save size={14} /> Save Draft
            </button>
            <button onClick={() => handlePublish('navbar')} disabled={publishing === 'navbar'} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
              <Eye size={14} /> {publishing === 'navbar' ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>

        {/* Logo */}
        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-1 block font-medium">Logo</label>
          <div className="flex items-center gap-3">
            {navbarDraft.logoUrl && (
              <img src={navbarDraft.logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-cover border border-border" />
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-muted">
              <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload Logo'}
            </button>
            {navbarDraft.logoUrl && (
              <button onClick={() => setNavbarDraft(prev => ({ ...prev, logoUrl: '' }))} className="text-xs text-destructive hover:underline">Remove</button>
            )}
          </div>
        </div>

        {/* Site name & tagline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Site Name</label>
            <input value={navbarDraft.siteName} onChange={e => setNavbarDraft(p => ({ ...p, siteName: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tagline</label>
            <input value={navbarDraft.siteTagline} onChange={e => setNavbarDraft(p => ({ ...p, siteTagline: e.target.value }))} className={inputClass} />
          </div>
        </div>

        {/* Ribbon */}
        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-1 block">Ribbon Banner Text</label>
          <input value={navbarDraft.ribbonText} onChange={e => setNavbarDraft(p => ({ ...p, ribbonText: e.target.value }))} className={inputClass} />
        </div>

        {/* Contact info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Address</label>
            <input value={navbarDraft.address} onChange={e => setNavbarDraft(p => ({ ...p, address: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
            <input value={navbarDraft.phone} onChange={e => setNavbarDraft(p => ({ ...p, phone: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <input value={navbarDraft.email} onChange={e => setNavbarDraft(p => ({ ...p, email: e.target.value }))} className={inputClass} />
          </div>
        </div>

        {/* Nav links */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-muted-foreground font-medium">Navigation Links</label>
            <button onClick={addNavLink} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus size={12} /> Add Link
            </button>
          </div>
          <div className="space-y-2">
            {navbarDraft.links.map((link, i) => (
              <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                <GripVertical size={14} className="text-muted-foreground shrink-0" />
                <input value={link.label} onChange={e => updateNavLink(i, 'label', e.target.value)} placeholder="Label" className={inputClass + ' !w-32'} />
                <input value={link.href} onChange={e => updateNavLink(i, 'href', e.target.value)} placeholder="URL" className={inputClass + ' flex-1'} />
                <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  <input type="checkbox" checked={link.isDonate} onChange={e => updateNavLink(i, 'isDonate', e.target.checked)} className="rounded" />
                  Donate style
                </label>
                <button onClick={() => removeNavLink(i)} className="text-destructive hover:text-destructive/80 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== FOOTER SETTINGS ===== */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-semibold text-lg">Footer Settings</h3>
          <div className="flex gap-2">
            <button onClick={() => handleSaveDraft('footer')} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-muted">
              <Save size={14} /> Save Draft
            </button>
            <button onClick={() => handlePublish('footer')} disabled={publishing === 'footer'} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
              <Eye size={14} /> {publishing === 'footer' ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>

        {/* Brand */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Brand Name</label>
            <input value={footerDraft.brandName} onChange={e => setFooterDraft(p => ({ ...p, brandName: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Brand Description</label>
            <input value={footerDraft.brandDescription} onChange={e => setFooterDraft(p => ({ ...p, brandDescription: e.target.value }))} className={inputClass} />
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Address</label>
            <input value={footerDraft.address} onChange={e => setFooterDraft(p => ({ ...p, address: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
            <input value={footerDraft.phone} onChange={e => setFooterDraft(p => ({ ...p, phone: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <input value={footerDraft.email} onChange={e => setFooterDraft(p => ({ ...p, email: e.target.value }))} className={inputClass} />
          </div>
        </div>

        {/* Developer credit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Developer Name</label>
            <input value={footerDraft.developerName} onChange={e => setFooterDraft(p => ({ ...p, developerName: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Developer URL</label>
            <input value={footerDraft.developerUrl} onChange={e => setFooterDraft(p => ({ ...p, developerUrl: e.target.value }))} className={inputClass} />
          </div>
        </div>

        {/* Quick Links */}
        <LinkListEditor
          title="Quick Links"
          links={footerDraft.quickLinks}
          onUpdate={(i, f, v) => updateFooterLink('quickLinks', i, f, v)}
          onAdd={() => addFooterLink('quickLinks')}
          onRemove={(i) => removeFooterLink('quickLinks', i)}
        />

        {/* Resource Links */}
        <div className="mt-4">
          <LinkListEditor
            title="Resource Links"
            links={footerDraft.resourceLinks}
            onUpdate={(i, f, v) => updateFooterLink('resourceLinks', i, f, v)}
            onAdd={() => addFooterLink('resourceLinks')}
            onRemove={(i) => removeFooterLink('resourceLinks', i)}
          />
        </div>
      </div>
    </div>
  );
};

const LinkListEditor = ({
  title, links, onUpdate, onAdd, onRemove,
}: {
  title: string;
  links: FooterLink[];
  onUpdate: (i: number, field: keyof FooterLink, value: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <label className="text-xs text-muted-foreground font-medium">{title}</label>
      <button onClick={onAdd} className="flex items-center gap-1 text-xs text-primary hover:underline">
        <Plus size={12} /> Add Link
      </button>
    </div>
    <div className="space-y-2">
      {links.map((link, i) => (
        <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
          <input value={link.label} onChange={e => onUpdate(i, 'label', e.target.value)} placeholder="Label" className={inputClass + ' !w-32'} />
          <input value={link.href} onChange={e => onUpdate(i, 'href', e.target.value)} placeholder="URL" className={inputClass + ' flex-1'} />
          <button onClick={() => onRemove(i)} className="text-destructive hover:text-destructive/80 shrink-0">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  </div>
);

export default SiteSettingsEditor;
