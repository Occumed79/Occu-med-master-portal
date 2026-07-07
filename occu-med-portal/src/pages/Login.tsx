import { useAuth } from '../hooks/useAuth';
import { useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useEffect, useState } from 'react';

function getNextPath(): string {
  if (typeof window === 'undefined') return '/';
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  return next?.startsWith('/') ? next : '/';
}

export default function Login() {
  const { user, signIn } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setLocation(getNextPath());
    }
  }, [user, setLocation]);

  if (user) {
    return null;
  }

  const handlePasswordLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    setLoading(true);
    setMessage('');

    const result = await signIn(email, password);

    if (result.error) {
      setMessage(result.error);
      setLoading(false);
      return;
    }

    setLocation(getNextPath());
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black/60 border-white/10 backdrop-blur-xl">
        <CardHeader className="space-y-2">
          <div className="text-2xl font-bold tracking-widest text-center text-white glow-text uppercase mb-4">OCCU-MED</div>
          <CardTitle className="text-center text-xl text-white">Secure Access</CardTitle>
          <CardDescription className="text-center text-white/60">
            Enter your email and portal password to continue.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordLogin}>
          <CardContent className="space-y-4">
            <Input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-white/30"
              required
            />

            <Input
              type="password"
              placeholder="Portal Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-white/30"
              required
            />

            {message && (
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                {message}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-white text-black hover:bg-white/90" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
