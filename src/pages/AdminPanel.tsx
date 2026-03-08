import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Shield, Users, Tag, Gift, Trash2, Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminPanel = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'users' | 'discounts' | 'grants'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New discount form
  const [newCode, setNewCode] = useState('');
  const [newPercent, setNewPercent] = useState(10);
  const [newPlan, setNewPlan] = useState('');
  const [newMaxUses, setNewMaxUses] = useState<number | ''>('');

  // Grant form
  const [grantEmail, setGrantEmail] = useState('');
  const [grantPlan, setGrantPlan] = useState('Seeker AI');
  const [grantLimit, setGrantLimit] = useState(50);

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    const [profilesRes, discountsRes, subsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('discount_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('user_subscriptions').select('*').order('created_at', { ascending: false }),
    ]);
    setUsers(profilesRes.data || []);
    setDiscounts(discountsRes.data || []);
    setSubscriptions(subsRes.data || []);
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
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Discount created!');
      setNewCode(''); setNewPercent(10); setNewPlan(''); setNewMaxUses('');
      loadData();
    }
  };

  const toggleDiscount = async (id: string, isActive: boolean) => {
    await supabase.from('discount_codes').update({ is_active: !isActive }).eq('id', id);
    loadData();
  };

  const deleteDiscount = async (id: string) => {
    await supabase.from('discount_codes').delete().eq('id', id);
    toast.success('Deleted');
    loadData();
  };

  const grantFreePlan = async () => {
    // Find user by email
    const targetUser = users.find(u => u.email === grantEmail);
    if (!targetUser) { toast.error('User not found. They must sign up first.'); return; }

    // Upsert subscription
    const { data: existing } = await supabase.from('user_subscriptions').select('id').eq('user_id', targetUser.id).maybeSingle();
    if (existing) {
      await supabase.from('user_subscriptions').update({
        plan: grantPlan,
        daily_limit: grantLimit,
        is_free_grant: true,
        granted_by: user!.id,
        discount_percent: 100,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('user_subscriptions').insert({
        user_id: targetUser.id,
        plan: grantPlan,
        daily_limit: grantLimit,
        is_free_grant: true,
        granted_by: user!.id,
        discount_percent: 100,
      });
    }
    toast.success(`Granted ${grantPlan} to ${grantEmail}`);
    setGrantEmail('');
    loadData();
  };

  const revokeGrant = async (subId: string) => {
    await supabase.from('user_subscriptions').update({
      plan: 'free',
      daily_limit: 15,
      is_free_grant: false,
      discount_percent: 0,
      granted_by: null,
      updated_at: new Date().toISOString(),
    }).eq('id', subId);
    toast.success('Revoked');
    loadData();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield size={24} className="text-primary" /> Admin Panel
            </h1>
            <p className="text-muted-foreground text-sm">Manage users, discounts, and free grants</p>
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
        <div className="flex gap-2 mb-6">
          {([
            { id: 'users' as const, label: 'Users', icon: Users },
            { id: 'discounts' as const, label: 'Discount Codes', icon: Tag },
            { id: 'grants' as const, label: 'Free Grants', icon: Gift },
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
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-muted-foreground font-medium">Name</th>
                      <th className="text-left p-3 text-muted-foreground font-medium">Email</th>
                      <th className="text-left p-3 text-muted-foreground font-medium">Plan</th>
                      <th className="text-left p-3 text-muted-foreground font-medium">Daily Limit</th>
                      <th className="text-left p-3 text-muted-foreground font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const sub = subscriptions.find(s => s.user_id === u.id);
                      return (
                        <tr key={u.id} className="border-b border-border hover:bg-muted/50">
                          <td className="p-3 text-foreground">{u.display_name || '—'}</td>
                          <td className="p-3 text-foreground">{u.email}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${sub?.is_free_grant ? 'bg-green-500/20 text-green-400' : 'bg-secondary text-secondary-foreground'}`}>
                              {sub?.plan || 'free'} {sub?.is_free_grant ? '(free)' : ''}
                            </span>
                          </td>
                          <td className="p-3 text-foreground">{sub?.daily_limit || 15}</td>
                          <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {users.length === 0 && <p className="text-center text-muted-foreground py-8">No users yet.</p>}
              </div>
            )}

            {/* Discounts Tab */}
            {tab === 'discounts' && (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2"><Plus size={16} /> Create Discount Code</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Code (e.g. RAMADAN25)" className="bg-secondary text-foreground rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none" />
                    <div className="flex items-center gap-2">
                      <input type="number" value={newPercent} onChange={e => setNewPercent(+e.target.value)} min={1} max={100} className="bg-secondary text-foreground rounded-lg px-3 py-2 text-sm border border-border w-20 focus:border-primary focus:outline-none" />
                      <span className="text-muted-foreground text-sm">% off</span>
                    </div>
                    <input value={newPlan} onChange={e => setNewPlan(e.target.value)} placeholder="Plan (optional)" className="bg-secondary text-foreground rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none" />
                    <input type="number" value={newMaxUses} onChange={e => setNewMaxUses(e.target.value ? +e.target.value : '')} placeholder="Max uses (unlimited)" className="bg-secondary text-foreground rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none" />
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
                    <input value={grantEmail} onChange={e => setGrantEmail(e.target.value)} placeholder="User email" className="bg-secondary text-foreground rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none" />
                    <select value={grantPlan} onChange={e => setGrantPlan(e.target.value)} className="bg-secondary text-foreground rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none">
                      <option>Seeker AI</option>
                      <option>Student AI</option>
                      <option>Scholar AI</option>
                      <option>Imam AI</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <input type="number" value={grantLimit} onChange={e => setGrantLimit(+e.target.value)} className="bg-secondary text-foreground rounded-lg px-3 py-2 text-sm border border-border w-24 focus:border-primary focus:outline-none" />
                      <span className="text-muted-foreground text-sm">questions/day</span>
                    </div>
                  </div>
                  <button onClick={grantFreePlan} className="mt-3 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
                    Grant Free Access
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
                              <button onClick={() => revokeGrant(s.id)} className="text-xs text-red-400 hover:underline">
                                Revoke
                              </button>
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
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
