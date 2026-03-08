import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else {
      toast.success('Password updated!');
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <form onSubmit={handleReset} className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-foreground text-xl font-bold text-center">Set New Password</h2>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full bg-secondary text-foreground rounded-lg px-4 py-2.5 text-sm border border-border focus:outline-none focus:border-primary"
          placeholder="New password"
          required
          minLength={6}
        />
        <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
