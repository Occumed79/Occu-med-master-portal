import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useAuth } from '../hooks/useAuth';

export default function SetupAccount() {
  const { user, loading, isLive } = useAuth();
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState('Finishing account setup...');

  useEffect(() => {
    if (loading) return;

    if (!isLive) {
      setMessage('Supabase is not configured yet.');
      return;
    }

    if (!user) {
      setMessage('Open the secure invite link from your email to finish setup.');
      return;
    }

    setMessage('Account setup complete. Redirecting to the portal...');
    const timer = window.setTimeout(() => setLocation('/'), 1200);
    return () => window.clearTimeout(timer);
  }, [isLive, loading, setLocation, user]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black/60 border-white/10 backdrop-blur-xl">
        <CardHeader className="space-y-2">
          <div className="text-2xl font-bold tracking-widest text-center text-white glow-text uppercase mb-4">OCCU-MED</div>
          <CardTitle className="text-center text-xl text-white">Account Setup</CardTitle>
          <CardDescription className="text-center text-white/60">
            {message}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => setLocation(user ? '/' : '/login')} className="w-full bg-white text-black hover:bg-white/90">
            {user ? 'Go to Portal' : 'Go to Login'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
