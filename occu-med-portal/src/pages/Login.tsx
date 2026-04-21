import { useAuth } from '../hooks/useAuth';
import { useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const { isLive, user } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isLive) {
    setLocation('/');
    return null;
  }

  if (user) {
    setLocation('/admin');
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
    } else {
      setLocation('/admin');
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
            Enter your credentials to access the command portal.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input 
                type="email" 
                placeholder="Email Address" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-white/30"
                required
              />
            </div>
            <div className="space-y-2">
              <Input 
                type="password" 
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-white/30"
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-white text-black hover:bg-white/90" disabled={loading}>
              {loading ? 'Authenticating...' : 'Engage'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
