import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Welcome back!');
        navigate('/');
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Check your email to verify your account!');
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) { toast.error('Enter your email first'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success('Password reset email sent!');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="font-arabic text-primary text-lg mb-1">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
          <h1 className="text-3xl font-bold">
            <span className="gold-gradient">IAT</span>{' '}
            <span className="text-foreground">Islamic Library</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            {isLogin ? 'Sign in to access your account' : 'Create an account to get started'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
          {!isLogin && (
            <div>
              <label className="text-foreground text-sm font-medium block mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-secondary text-foreground rounded-lg px-4 py-2.5 text-sm border border-border focus:outline-none focus:border-primary transition-colors"
                placeholder="Your name"
                required
              />
            </div>
          )}
          <div>
            <label className="text-foreground text-sm font-medium block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-secondary text-foreground rounded-lg px-4 py-2.5 text-sm border border-border focus:outline-none focus:border-primary transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="text-foreground text-sm font-medium block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-secondary text-foreground rounded-lg px-4 py-2.5 text-sm border border-border focus:outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {isLogin && (
            <button type="button" onClick={handleForgotPassword} className="text-primary text-xs hover:underline">
              Forgot password?
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>

          <p className="text-center text-muted-foreground text-sm">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline">
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
