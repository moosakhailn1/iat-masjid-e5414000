import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Copy, ShieldCheck } from 'lucide-react';

type Mode = 'login' | 'signup' | 'recover';

interface Challenge {
  challengeId: string;
  prompt: string;
  options: string[];
}

const AuthPage = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !issuedCode) navigate('/');
  }, [user, issuedCode, navigate]);

  const loadChallenge = useCallback(async () => {
    setPicked(null);
    setChallenge(null);
    const { data, error } = await supabase.functions.invoke('account-recovery', {
      body: { action: 'challenge' },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Could not load the puzzle. Try again.');
      return;
    }
    setChallenge(data);
  }, []);

  useEffect(() => {
    if (mode === 'signup') loadChallenge();
  }, [mode, loadChallenge]);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) toast.error(error.message);
    else {
      toast.success('Welcome back!');
      navigate('/');
    }
  };

  const handleSignup = async () => {
    if (!challenge || !picked) {
      toast.error('Please solve the puzzle first');
      return;
    }
    const { data, error } = await supabase.functions.invoke('account-recovery', {
      body: {
        action: 'signup',
        challengeId: challenge.challengeId,
        answer: picked,
        email: email.trim(),
        password,
        displayName,
      },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Could not create the account');
      await loadChallenge();
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) toast.error(signInError.message);
    setIssuedCode(data.recoveryCode);
    toast.success('Account created! Save your recovery code.');
  };

  const handleRecover = async () => {
    const { data, error } = await supabase.functions.invoke('account-recovery', {
      body: {
        action: 'recover',
        email: email.trim(),
        code: recoveryInput.trim(),
        newPassword: password,
      },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Could not recover the account');
      return;
    }
    await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setIssuedCode(data.recoveryCode);
    toast.success('Password updated! Here is your new recovery code.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') await handleLogin();
      else if (mode === 'signup') await handleSignup();
      else await handleRecover();
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-secondary text-foreground rounded-lg px-4 py-2.5 text-sm border border-border focus:outline-none focus:border-primary transition-colors';

  if (issuedCode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 space-y-4 text-center">
          <ShieldCheck className="mx-auto text-primary" size={40} />
          <h2 className="text-foreground text-xl font-bold">Save your recovery code</h2>
          <p className="text-muted-foreground text-sm">
            This is the only way to reset your password. Write it down or store it somewhere safe — it is shown once.
          </p>
          <div className="bg-secondary border border-border rounded-lg px-4 py-3 font-mono text-primary text-lg tracking-wider">
            {issuedCode}
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(issuedCode);
              toast.success('Copied');
            }}
            className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm hover:bg-muted"
          >
            <Copy size={14} /> Copy code
          </button>
          <button
            type="button"
            onClick={() => {
              setIssuedCode(null);
              navigate('/');
            }}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            I saved it — continue
          </button>
        </div>
      </div>
    );
  }

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
            {mode === 'login'
              ? 'Sign in to access your account'
              : mode === 'signup'
              ? 'Create an account to get started'
              : 'Reset your password with your recovery code'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="text-foreground text-sm font-medium block mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className={inputClass}
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
              className={inputClass}
              placeholder="you@example.com"
              required
            />
          </div>

          {mode === 'recover' && (
            <div>
              <label className="text-foreground text-sm font-medium block mb-1">Recovery Code</label>
              <input
                type="text"
                value={recoveryInput}
                onChange={e => setRecoveryInput(e.target.value.toUpperCase())}
                className={`${inputClass} font-mono tracking-wider`}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                required
              />
            </div>
          )}

          <div>
            <label className="text-foreground text-sm font-medium block mb-1">
              {mode === 'recover' ? 'New Password' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="text-foreground text-sm font-medium block mb-2">
                {challenge ? challenge.prompt : 'Loading puzzle...'}
              </label>
              <div className="flex gap-2 flex-wrap">
                {(challenge?.options || []).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPicked(opt)}
                    className={`text-2xl w-12 h-12 rounded-lg border transition-colors ${
                      picked === opt ? 'border-primary bg-primary/10' : 'border-border bg-secondary hover:bg-muted'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <button type="button" onClick={loadChallenge} className="text-muted-foreground text-xs mt-2 hover:text-foreground">
                New puzzle
              </button>
            </div>
          )}

          {mode === 'login' && (
            <button type="button" onClick={() => setMode('recover')} className="text-primary text-xs hover:underline">
              Use recovery code
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : mode === 'signup'
              ? 'Create Account'
              : 'Reset Password'}
          </button>

          <p className="text-center text-muted-foreground text-sm">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button type="button" onClick={() => setMode('signup')} className="text-primary hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" onClick={() => setMode('login')} className="text-primary hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
