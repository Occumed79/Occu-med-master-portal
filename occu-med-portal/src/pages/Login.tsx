import { useAuth } from '../hooks/useAuth';
import { useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

function getNextPath(): string {
  if (typeof window === 'undefined') return '/';
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  return next?.startsWith('/') ? next : '/';
}

export default function Login() {
  const { isLive, user } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'magic' | 'password'>('magic');

  if (!isLive) {
    setLocation('/');
    return null;
  }

  if (user) {
    setLocation(getNextPath());
    return null;
  }

  const sendMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}${getNextPath()}`,
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Check your email for the secure sign-in link.');
    }

    setLoading(false);
  };

  const handlePasswordLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setLocation(getNextPath());
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black/60 border-white/10 backdrop-blur-xl">
        <CardHeader className="space-y-2">
          <div className="text-2xl font-bold tracking-widest text-center text-white glow-text uppercase mb-4">OCCU-MED</div>
          <CardTitle className="text-center text-xl text-white">Secure Access</CardTitle>
          <CardDescription className="text-center text-white/60">
            Enter your email to receive a secure portal sign-in link.
          </CardDescription>
        </CardHeader>
        <form onSubmit={mode === 'magic' ? sendMagicLink : handlePasswordLogin}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setMode('magic')}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${mode === 'magic' ? 'bg-white text-black' : 'text-white/60'}`}
              >
                Email Link
              </button>
              <button
                type="button"
                onClick={() => setMode('password')}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${mode === 'password' ? 'bg-white text-black' : 'text-white/60'}`}
              >
                Password
              </button>
            </div>

            <Input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-white/30"
              required
            />

            {mode === 'password' && (
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-white/30"
                required
              />
            )}

            {message && (
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                {message}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-white text-black hover:bg-white/90" disabled={loading}>
              {loading ? 'Authenticating...' : mode === 'magic' ? 'Send Secure Link' : 'Sign In'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
