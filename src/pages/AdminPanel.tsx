import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Shield, Users, Tag, Gift, Trash2, Plus, RefreshCw, CreditCard, BookOpen, Save, Key, UserX, ShieldCheck, ShieldOff, Settings } from 'lucide-react';
import SiteSettingsEditor from '@/components/admin/SiteSettingsEditor';
import { useNavigate } from 'react-router-dom';

const PLANS = ['Seeker AI', 'Student AI', 'Scholar AI', 'Imam AI'];
const CONTENT_TYPES = ['hadith', 'dua', 'khutbah', 'seerah'] as const;

const AdminPanel = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'users' | 'discounts' | 'grants' | 'payments' | 'content' | 'site'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [passwordModal, setPasswordModal] = useState<{ userId: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [paymentLinks, setPaymentLinks] = useState<any[]>([]);
  const [libraryContent, setLibraryContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New discount form
  const [newCode, setNewCode] = useState('');
  const [newPercent, setNewPercent] = useState(10);
  const [newPlan, setNewPlan] = useState('');
  const [newMaxUses, setNewMaxUses] = useState<number | ''>('');
  const [newDisplayMode, setNewDisplayMode] = useState('hidden');

  // Grant form
  const [grantEmail, setGrantEmail] = useState('');
  const [grantPlan, setGrantPlan] = useState('Seeker AI');
  const [grantLimit, setGrantLimit] = useState(50);
  const [grantLoading, setGrantLoading] = useState(false);

  // Payment links form
  const [editingLinks, setEditingLinks] = useState<Record<string, { monthly: string; yearly: string; monthlyPriceId: string; yearlyPriceId: string }>>({});

  // Content form
  const [contentType, setContentType] = useState<typeof CONTENT_TYPES[number]>('hadith');
  const [contentForm, setContentForm] = useState({
    title: '', arabic: '', english: '', pashto: '', dari: '',
    source: '', category: 'Faith', narrator: '', hadith_number: '',
    occasion: '', imam: '', event_date: '', content_subtype: '', full_text: '',
  });
  const [contentFilter, setContentFilter] = useState<string>('all');

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    const [profilesRes, discountsRes, subsRes, linksRes, contentRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('discount_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('user_subscriptions').select('*').order('created_at', { ascending: false }),
      supabase.from('payment_links').select('*'),
      supabase.from('library_content').select('*').order('created_at', { ascending: false }),
      supabase.functions.invoke('admin-users', { body: { action: 'list_roles' } }),
    ]);
    setUsers(profilesRes.data || []);
    setUserRoles(rolesRes.data?.roles || []);
    setDiscounts(discountsRes.data || []);
    setSubscriptions(subsRes.data || []);
    const links = linksRes.data || [];
    setPaymentLinks(links);
    setLibraryContent(contentRes.data || []);
    
    const linksMap: Record<string, { monthly: string; yearly: string; monthlyPriceId: string; yearlyPriceId: string }> = {};
    PLANS.forEach(plan => {
      const existing = links.find((l: any) => l.plan === plan);
      linksMap[plan] = {
        monthly: existing?.monthly_link || '',
        yearly: existing?.yearly_link || '',
        monthlyPriceId: (existing as any)?.monthly_price_id || '',
        yearlyPriceId: (existing as any)?.yearly_price_id || '',
      };
    });
    setEditingLinks(linksMap);
    setLoading(false);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-foreground font-medium">Access Denied</p>
          <p className="text-muted-foreground text-sm">You need admin privileges to access this page.</p>
          <button onClick={() => navigate('/')} className="mt-4 text-primary hover:underline text-sm">Go Home</button>
        </div>
      </div>
    );
  }

  const createDiscount = async () => {
    if (!newCode) { toast.error('Enter a code'); return; }
    const { error } = await supabase.from('discount_codes').insert({
      code: newCode.toUpperCase(),
      discount_percent: newPercent,
      plan: newPlan || null,
      max_uses: newMaxUses || null,
      created_by: user!.id,
      display_mode: newDisplayMode,
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Discount created!');
      setNewCode(''); setNewPercent(10); setNewPlan(''); setNewMaxUses(''); setNewDisplayMode('hidden');
      loadData();
    }
  };

  const toggleDiscount = async (id: string, isActive: boolean) => {
    await supabase.from('discount_codes').update({ is_active: !isActive }).eq('id', id);
    loadData();
  };

  const updateDisplayMode = async (id: string, mode: string) => {
    await supabase.from('discount_codes').update({ display_mode: mode }).eq('id', id);
    toast.success('Display mode updated');
    loadData();
  };

  const deleteDiscount = async (id: string) => {
    await supabase.from('discount_codes').delete().eq('id', id);
    toast.success('Deleted');
    loadData();
  };

  const grantFreePlan = async () => {
    const normalizedEmail = grantEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error('Enter user email');
      return;
    }

    const { data: profileMatch, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      toast.error(`Failed to find user: ${profileError.message}`);
      return;
    }

    const targetUser = profileMatch ?? users.find(u => (u.email || '').trim().toLowerCase() === normalizedEmail);
    if (!targetUser) { toast.error('User not found. They must sign up first.'); return; }

    setGrantLoading(true);
    try {
      const { data: existing } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', targetUser.id)
        .maybeSingle();

      let error;
      if (existing) {
        const res = await supabase.from('user_subscriptions').update({
          plan: grantPlan, daily_limit: grantLimit, is_free_grant: true,
          granted_by: user!.id, discount_percent: 100, updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
        error = res.error;
      } else {
        const res = await supabase.from('user_subscriptions').insert({
          user_id: targetUser.id, plan: grantPlan, daily_limit: grantLimit,
          is_free_grant: true, granted_by: user!.id, discount_percent: 100,
        });
        error = res.error;
      }

      if (error) {
        toast.error(`Failed to grant: ${error.message}`);
      } else {
        toast.success(`Granted ${grantPlan} to ${targetUser.email || normalizedEmail}`);
        setGrantEmail('');
        await loadData();
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setGrantLoading(false);
    }
  };

  const revokeGrant = async (subId: string) => {
    const { error } = await supabase.from('user_subscriptions').update({
      plan: 'free', daily_limit: 15, is_free_grant: false, discount_percent: 0,
      granted_by: null, updated_at: new Date().toISOString(),
    }).eq('id', subId);
    if (error) toast.error(`Failed to revoke: ${error.message}`);
  else { toast.success('Revoked'); loadData(); }
  };

  const resetToDefault = async (userId: string, userEmail: string) => {
    const sub = subscriptions.find(s => s.user_id === userId);
    if (!sub) {
      toast.error('No subscription found for this user');
      return;
    }
    const { error } = await supabase.from('user_subscriptions').update({
      plan: 'free',
      daily_limit: 15,
      // Lock as admin-granted so sync doesn't overwrite with old Stripe data
      is_free_grant: true,
      discount_percent: 0,
      granted_by: user!.id,
      expires_at: null,
      updated_at: new Date().toISOString(),
    }).eq('id', sub.id);
    if (error) toast.error(`Failed to reset: ${error.message}`);
    else { toast.success(`Reset ${userEmail} to free plan`); loadData(); }
  };

  const savePaymentLink = async (plan: string) => {
    const link = editingLinks[plan];
    if (!link) return;
    
    const existing = paymentLinks.find(l => l.plan === plan);
    const payload: any = {
      monthly_link: link.monthly || null,
      yearly_link: link.yearly || null,
      monthly_price_id: link.monthlyPriceId || null,
      yearly_price_id: link.yearlyPriceId || null,
      updated_at: new Date().toISOString(),
      updated_by: user!.id,
    };
    if (existing) {
      await supabase.from('payment_links').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('payment_links').insert({ plan, ...payload });
    }
    toast.success(`Settings saved for ${plan}`);
    loadData();
  };

  const saveContent = async () => {
    if (!contentForm.english && !contentForm.arabic) {
      toast.error('Enter at least Arabic or English text');
      return;
    }
    const { error } = await supabase.from('library_content').insert({
      content_type: contentType,
      title: contentForm.title || null,
      arabic: contentForm.arabic,
      english: contentForm.english,
      pashto: contentForm.pashto,
      dari: contentForm.dari,
      source: contentForm.source,
      category: contentForm.category,
      narrator: contentForm.narrator || null,
      hadith_number: contentForm.hadith_number ? parseInt(contentForm.hadith_number) : null,
      occasion: contentForm.occasion || null,
      imam: contentForm.imam || null,
      event_date: contentForm.event_date || null,
      content_subtype: contentForm.content_subtype || null,
      full_text: contentForm.full_text || null,
      created_by: user!.id,
    });
    if (error) {
      toast.error(`Failed: ${error.message}`);
    } else {
      toast.success(`${contentType} added successfully!`);
      setContentForm({
        title: '', arabic: '', english: '', pashto: '', dari: '',
        source: '', category: 'Faith', narrator: '', hadith_number: '',
        occasion: '', imam: '', event_date: '', content_subtype: '', full_text: '',
      });
      loadData();
    }
  };

  const deleteContent = async (id: string) => {
    const { error } = await supabase.from('library_content').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); loadData(); }
  };

  const filteredContent = contentFilter === 'all'
    ? libraryContent
    : libraryContent.filter(c => c.content_type === contentFilter);

  const inputClass = "bg-secondary text-foreground rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none";
  const textareaClass = inputClass + " min-h-[80px] resize-y";

  const categoryOptions = contentType === 'seerah'
    ? ['Makkah Period', 'Madinah Period', 'Key Battles', 'Treaties & Events', 'Final Years']
    : ['Faith', 'Prayer', 'Fasting', 'Charity', 'Manners', 'Knowledge', 'Patience', 'Gratitude', 'Family', 'Other'];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield size={24} className="text-primary" /> Admin Panel
            </h1>
            <p className="text-muted-foreground text-sm">Manage users, payments, discounts, grants, and content</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadData} className="flex items-center gap-1 text-sm bg-secondary text-secondary-foreground px-3 py-2 rounded-lg hover:bg-muted">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={() => navigate('/')} className="text-sm bg-secondary text-secondary-foreground px-3 py-2 rounded-lg hover:bg-muted">
              ← Back
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {([
            { id: 'users' as const, label: 'Users', icon: Users },
            { id: 'payments' as const, label: 'Payment Links', icon: CreditCard },
            { id: 'discounts' as const, label: 'Discount Codes', icon: Tag },
            { id: 'grants' as const, label: 'Free Grants', icon: Gift },
            { id: 'content' as const, label: 'Library Content', icon: BookOpen },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-12">Loading...</p>
        ) : (
          <>
            {/* Users Tab */}
            {tab === 'users' && (
              <div className="space-y-4">
                {/* Password Reset Modal */}
                {passwordModal && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4">
                      <h3 className="text-foreground font-semibold">Reset Password</h3>
                      <p className="text-muted-foreground text-sm">For: {passwordModal.email}</p>
                      <input
                        type="text"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="New password (min 6 chars)"
                        className={inputClass + ' w-full'}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
                            const { data, error } = await supabase.functions.invoke('admin-users', {
                              body: { action: 'reset_password', targetUserId: passwordModal.userId, newPassword },
                            });
                            if (error || data?.error) toast.error(data?.error || error?.message || 'Failed');
                            else { toast.success('Password reset!'); setPasswordModal(null); setNewPassword(''); }
                          }}
                          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
                        >
                          Reset
                        </button>
                        <button onClick={() => { setPasswordModal(null); setNewPassword(''); }} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-card border border-border rounded-xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-muted-foreground font-medium">Name</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Email</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Role</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Plan</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Joined</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => {
                        const sub = subscriptions.find(s => s.user_id === u.id);
                        const isUserAdmin = userRoles.some(r => r.user_id === u.id && r.role === 'admin');
                        const isSelf = u.id === user?.id;

                        return (
                          <tr key={u.id} className="border-b border-border hover:bg-muted/50">
                            <td className="p-3 text-foreground">{u.display_name || '—'}</td>
                            <td className="p-3 text-foreground text-xs">{u.email}</td>
                            <td className="p-3">
                              {isUserAdmin ? (
                                <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary font-medium">Admin</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">User</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${sub?.is_free_grant ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
                                {sub?.plan || 'free'} {sub?.is_free_grant ? '(granted)' : ''}
                              </span>
                            </td>
                            <td className="p-3 text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {/* Toggle admin */}
                                {!isSelf && (
                                  <button
                                    onClick={async () => {
                                      const action = isUserAdmin ? 'remove_role' : 'add_role';
                                      const { data, error } = await supabase.functions.invoke('admin-users', {
                                        body: { action, targetUserId: u.id, role: 'admin' },
                                      });
                                      if (error || data?.error) toast.error(data?.error || 'Failed');
                                      else { toast.success(isUserAdmin ? 'Admin removed' : 'Admin granted'); loadData(); }
                                    }}
                                    className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                                      isUserAdmin ? 'bg-destructive/20 text-destructive hover:bg-destructive/30' : 'bg-primary/20 text-primary hover:bg-primary/30'
                                    }`}
                                    title={isUserAdmin ? 'Remove admin' : 'Make admin'}
                                  >
                                    {isUserAdmin ? <ShieldOff size={12} /> : <ShieldCheck size={12} />}
                                    {isUserAdmin ? 'Remove Admin' : 'Make Admin'}
                                  </button>
                                )}

                                {/* Reset password */}
                                <button
                                  onClick={() => setPasswordModal({ userId: u.id, email: u.email })}
                                  className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground hover:bg-muted flex items-center gap-1"
                                >
                                  <Key size={12} /> Password
                                </button>

                                {/* Reset plan */}
                                {sub && sub.plan !== 'free' && (
                                  <button
                                    onClick={() => resetToDefault(u.id, u.email)}
                                    className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground hover:bg-muted"
                                  >
                                    Reset Plan
                                  </button>
                                )}

                                {/* Delete user */}
                                {!isSelf && (
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return;
                                      const { data, error } = await supabase.functions.invoke('admin-users', {
                                        body: { action: 'delete_user', targetUserId: u.id },
                                      });
                                      if (error || data?.error) toast.error(data?.error || 'Failed');
                                      else { toast.success('User deleted'); loadData(); }
                                    }}
                                    className="text-xs px-2 py-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 flex items-center gap-1"
                                  >
                                    <UserX size={12} /> Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {users.length === 0 && <p className="text-center text-muted-foreground py-8">No users yet.</p>}
                </div>
              </div>
            )}

            {/* Payment Links Tab */}
            {tab === 'payments' && (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Configure Stripe Price IDs and optional Payment Links for each plan.
                </p>
                {PLANS.map(plan => {
                  const existing = paymentLinks.find(l => l.plan === plan);
                  const hasPriceIds = editingLinks[plan]?.monthlyPriceId || editingLinks[plan]?.yearlyPriceId;
                  return (
                    <div key={plan} className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-foreground font-semibold flex items-center gap-2">
                          <CreditCard size={16} className="text-primary" /> {plan}
                        </h3>
                        {hasPriceIds && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Configured</span>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Stripe Price IDs (required for checkout)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Monthly Price ID</label>
                          <input
                            value={editingLinks[plan]?.monthlyPriceId || ''}
                            onChange={e => setEditingLinks(prev => ({ ...prev, [plan]: { ...prev[plan], monthlyPriceId: e.target.value } }))}
                            placeholder="price_..."
                            className={inputClass + ' w-full font-mono text-xs'}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Yearly Price ID</label>
                          <input
                            value={editingLinks[plan]?.yearlyPriceId || ''}
                            onChange={e => setEditingLinks(prev => ({ ...prev, [plan]: { ...prev[plan], yearlyPriceId: e.target.value } }))}
                            placeholder="price_..."
                            className={inputClass + ' w-full font-mono text-xs'}
                          />
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mb-2 font-medium">Payment Links (optional, for external sharing)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Monthly Payment Link</label>
                          <input
                            value={editingLinks[plan]?.monthly || ''}
                            onChange={e => setEditingLinks(prev => ({ ...prev, [plan]: { ...prev[plan], monthly: e.target.value } }))}
                            placeholder="https://buy.stripe.com/..."
                            className={inputClass + ' w-full'}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Yearly Payment Link</label>
                          <input
                            value={editingLinks[plan]?.yearly || ''}
                            onChange={e => setEditingLinks(prev => ({ ...prev, [plan]: { ...prev[plan], yearly: e.target.value } }))}
                            placeholder="https://buy.stripe.com/..."
                            className={inputClass + ' w-full'}
                          />
                        </div>
                      </div>
                      <button onClick={() => savePaymentLink(plan)} className="mt-3 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
                        Save
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Discounts Tab */}
            {tab === 'discounts' && (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2"><Plus size={16} /> Create Discount Code</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Code (e.g. RAMADAN25)" className={inputClass} />
                    <div className="flex items-center gap-2">
                      <input type="number" value={newPercent} onChange={e => setNewPercent(+e.target.value)} min={1} max={100} className={inputClass + ' w-20'} />
                      <span className="text-muted-foreground text-sm">% off</span>
                    </div>
                    <input value={newPlan} onChange={e => setNewPlan(e.target.value)} placeholder="Plan (optional)" className={inputClass} />
                    <input type="number" value={newMaxUses} onChange={e => setNewMaxUses(e.target.value ? +e.target.value : '')} placeholder="Max uses (∞)" className={inputClass} />
                    <select value={newDisplayMode} onChange={e => setNewDisplayMode(e.target.value)} className={inputClass}>
                      <option value="hidden">Hidden (code only)</option>
                      <option value="banner">Public Banner</option>
                      <option value="card">Show on Pricing Card</option>
                    </select>
                  </div>
                  <button onClick={createDiscount} className="mt-3 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
                    Create Code
                  </button>
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-muted-foreground font-medium">Code</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Discount</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Plan</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Uses</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Display</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discounts.map(d => (
                        <tr key={d.id} className="border-b border-border">
                          <td className="p-3 text-foreground font-mono">{d.code}</td>
                          <td className="p-3 text-foreground">{d.discount_percent}%</td>
                          <td className="p-3 text-foreground">{d.plan || 'Any'}</td>
                          <td className="p-3 text-foreground">{d.current_uses}/{d.max_uses || '∞'}</td>
                          <td className="p-3">
                            <select
                              value={d.display_mode || 'hidden'}
                              onChange={e => updateDisplayMode(d.id, e.target.value)}
                              className="bg-secondary text-foreground rounded px-2 py-1 text-xs border border-border"
                            >
                              <option value="hidden">Hidden</option>
                              <option value="banner">Banner</option>
                              <option value="card">Card</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${d.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {d.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-3 flex gap-2">
                            <button onClick={() => toggleDiscount(d.id, d.is_active)} className="text-xs text-primary hover:underline">
                              {d.is_active ? 'Disable' : 'Enable'}
                            </button>
                            <button onClick={() => deleteDiscount(d.id)} className="text-xs text-red-400 hover:underline">
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {discounts.length === 0 && <p className="text-center text-muted-foreground py-8">No discount codes yet.</p>}
                </div>
              </div>
            )}

            {/* Grants Tab */}
            {tab === 'grants' && (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2"><Gift size={16} /> Grant Free Perks</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input value={grantEmail} onChange={e => setGrantEmail(e.target.value)} placeholder="User email" className={inputClass} />
                    <select value={grantPlan} onChange={e => setGrantPlan(e.target.value)} className={inputClass}>
                      {PLANS.map(p => <option key={p}>{p}</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                      <input type="number" value={grantLimit} onChange={e => setGrantLimit(+e.target.value)} className={inputClass + ' w-24'} />
                      <span className="text-muted-foreground text-sm">questions/day</span>
                    </div>
                  </div>
                  <button
                    onClick={grantFreePlan}
                    disabled={grantLoading}
                    className="mt-3 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {grantLoading ? 'Granting...' : 'Grant Free Access'}
                  </button>
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <h3 className="p-3 text-foreground font-semibold text-sm border-b border-border">Active Free Grants</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-muted-foreground font-medium">User</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Plan</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Limit</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.filter(s => s.is_free_grant).map(s => {
                        const u = users.find(u => u.id === s.user_id);
                        return (
                          <tr key={s.id} className="border-b border-border">
                            <td className="p-3 text-foreground">{u?.email || s.user_id}</td>
                            <td className="p-3 text-foreground">{s.plan}</td>
                            <td className="p-3 text-foreground">{s.daily_limit}/day</td>
                            <td className="p-3">
                              <button onClick={() => revokeGrant(s.id)} className="text-xs text-red-400 hover:underline">Revoke</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {subscriptions.filter(s => s.is_free_grant).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No active free grants.</p>
                  )}
                </div>
              </div>
            )}

            {/* Content Management Tab */}
            {tab === 'content' && (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
                    <BookOpen size={16} className="text-primary" /> Add New Content
                  </h3>

                  {/* Content type selector */}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {CONTENT_TYPES.map(t => (
                      <button
                        key={t}
                        onClick={() => setContentType(t)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                          contentType === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'
                        }`}
                      >
                        {t === 'dua' ? "Du'a" : t}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(contentType === 'khutbah' || contentType === 'seerah') && (
                      <div className="md:col-span-2">
                        <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
                        <input value={contentForm.title} onChange={e => setContentForm(p => ({ ...p, title: e.target.value }))} placeholder="Title" className={inputClass + ' w-full'} />
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Arabic</label>
                      <textarea value={contentForm.arabic} onChange={e => setContentForm(p => ({ ...p, arabic: e.target.value }))} placeholder="Arabic text" className={textareaClass + ' w-full'} dir="rtl" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">English *</label>
                      <textarea value={contentForm.english} onChange={e => setContentForm(p => ({ ...p, english: e.target.value }))} placeholder="English translation" className={textareaClass + ' w-full'} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Pashto</label>
                      <textarea value={contentForm.pashto} onChange={e => setContentForm(p => ({ ...p, pashto: e.target.value }))} placeholder="Pashto translation" className={textareaClass + ' w-full'} dir="rtl" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Dari</label>
                      <textarea value={contentForm.dari} onChange={e => setContentForm(p => ({ ...p, dari: e.target.value }))} placeholder="Dari translation" className={textareaClass + ' w-full'} dir="rtl" />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Source *</label>
                      <input value={contentForm.source} onChange={e => setContentForm(p => ({ ...p, source: e.target.value }))} placeholder="e.g. Sahih Bukhari" className={inputClass + ' w-full'} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                      <select value={contentForm.category} onChange={e => setContentForm(p => ({ ...p, category: e.target.value }))} className={inputClass + ' w-full'}>
                        {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {contentType === 'hadith' && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Narrator</label>
                          <input value={contentForm.narrator} onChange={e => setContentForm(p => ({ ...p, narrator: e.target.value }))} placeholder="e.g. Abu Hurairah (RA)" className={inputClass + ' w-full'} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Hadith Number</label>
                          <input type="number" value={contentForm.hadith_number} onChange={e => setContentForm(p => ({ ...p, hadith_number: e.target.value }))} placeholder="e.g. 1" className={inputClass + ' w-full'} />
                        </div>
                      </>
                    )}

                    {contentType === 'dua' && (
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Occasion</label>
                        <input value={contentForm.occasion} onChange={e => setContentForm(p => ({ ...p, occasion: e.target.value }))} placeholder="e.g. Morning & Evening" className={inputClass + ' w-full'} />
                      </div>
                    )}

                    {contentType === 'khutbah' && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Imam</label>
                          <input value={contentForm.imam} onChange={e => setContentForm(p => ({ ...p, imam: e.target.value }))} placeholder="Imam name" className={inputClass + ' w-full'} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                          <select value={contentForm.content_subtype} onChange={e => setContentForm(p => ({ ...p, content_subtype: e.target.value }))} className={inputClass + ' w-full'}>
                            <option value="">Select type</option>
                            <option value="Friday Sermon">Friday Sermon</option>
                            <option value="Eid">Eid</option>
                            <option value="Ramadan">Ramadan</option>
                            <option value="General">General</option>
                            <option value="Special Occasion">Special Occasion</option>
                          </select>
                        </div>
                      </>
                    )}

                    {(contentType === 'seerah' || contentType === 'khutbah') && (
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">{contentType === 'seerah' ? 'Year' : 'Date'}</label>
                        <input value={contentForm.event_date} onChange={e => setContentForm(p => ({ ...p, event_date: e.target.value }))} placeholder={contentType === 'seerah' ? 'e.g. 622 CE' : 'e.g. March 14, 2024'} className={inputClass + ' w-full'} />
                      </div>
                    )}

                    {(contentType === 'khutbah' || contentType === 'seerah') && (
                      <div className="md:col-span-2">
                        <label className="text-xs text-muted-foreground mb-1 block">Full Text / Details</label>
                        <textarea value={contentForm.full_text} onChange={e => setContentForm(p => ({ ...p, full_text: e.target.value }))} placeholder="Full content..." className={textareaClass + ' w-full min-h-[120px]'} />
                      </div>
                    )}
                  </div>

                  <button onClick={saveContent} className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
                    <Save size={14} /> Add {contentType === 'dua' ? "Du'a" : contentType.charAt(0).toUpperCase() + contentType.slice(1)}
                  </button>
                </div>

                {/* Existing content list */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-foreground font-semibold text-sm">Added Content ({filteredContent.length})</h3>
                    <div className="flex gap-2">
                      {['all', ...CONTENT_TYPES].map(f => (
                        <button
                          key={f}
                          onClick={() => setContentFilter(f)}
                          className={`px-2 py-1 rounded text-xs transition-colors capitalize ${
                            contentFilter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'
                          }`}
                        >
                          {f === 'dua' ? "Du'as" : f === 'all' ? 'All' : f + 's'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredContent.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No content added yet. Use the form above to add content.</p>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {filteredContent.map(c => (
                        <div key={c.id} className="flex items-start justify-between gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary capitalize">{c.content_type}</span>
                              <span className="text-xs text-muted-foreground">{c.category}</span>
                            </div>
                            <p className="text-foreground text-sm truncate">{c.title || c.english?.slice(0, 80) || c.arabic?.slice(0, 80)}</p>
                            <p className="text-muted-foreground text-xs">📖 {c.source}</p>
                          </div>
                          <button onClick={() => deleteContent(c.id)} className="shrink-0 text-red-400 hover:text-red-300 p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
