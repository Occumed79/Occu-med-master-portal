import { useAuth } from '../hooks/useAuth';
import { useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useEffect, useState } from 'react';

function getNextPath(): string {
  if (typeof window === 'undefined') return '/admin';
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  return next?.startsWith('/') ? next : '/admin';
}

export default function Login() {
  const { user, loginAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) setLocation(getNextPath());
  }, [user, setLocation]);

  const handleAdminLogin = (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    if (loginAdmin(email, password, true)) {
      setLocation(getNextPath());
      return;
    }

    setMessage('Invalid admin email or password.');
    setLoading(false);
  };

  if (user) return null;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black/60 border-white/10 backdrop-blur-xl">
        <CardHeader className="space-y-2">
          <div className="text-2xl font-bold tracking-widest text-center text-white glow-text uppercase mb-4">OCCU-MED</div>
          <CardTitle className="text-center text-xl text-white">Admin Login</CardTitle>
          <CardDescription className="text-center text-white/60">
            Enter the preconfigured Render admin credentials to open the command center.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAdminLogin}>
          <CardContent className="space-y-4">
            <Input type="email" placeholder="Admin Email" value={email} onChange={(event) => setEmail(event.target.value)} className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-white/30" required />
            <Input type="password" placeholder="Admin Password" value={password} onChange={(event) => setPassword(event.target.value)} className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-white/30" required />
            {message && <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">{message}</div>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-white text-black hover:bg-white/90" disabled={loading}>
              {loading ? 'Opening...' : 'Open Admin Panel'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
