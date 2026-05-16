import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useAuth } from '../hooks/useAuth';

export default function SetupAccount() {
  const { user, loading, isLive } = useAuth();
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState('Finishing your secure portal setup...');

  useEffect(() => {
    if (loading) return;

    if (!isLive) {
      setMessage('Supabase is not configured yet, so account setup cannot be completed.');
      return;
    }

    if (!user) {
      setMessage('Open the secure invite link from your email to finish account setup.');
      return;
    }

    setMessage('Account setup complete. Redirecting you to the portal...');
    const timer = window.setTimeout(() => setLocation('/'), 1400);
    return () => window.clearTimeout(timer);
  }, [isLive, loading, setLocation, user]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(103,232,249,0.22),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.24),transparent_34%),radial-gradient(circle_at_50%_90%,rgba(59,130,246,0.22),transparent_38%)]" />
      <div className="absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10 shadow-[0_0_90px_rgba(103,232,249,0.12)]" />
      <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-200/10" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px] opacity-30" />

      <main className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-xl overflow-hidden border-white/15 bg-black/35 text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <div className="h-1 w-full bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400" />
          <CardHeader className="space-y-6 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-200/25 bg-cyan-200/10 text-3xl shadow-[0_0_40px_rgba(103,232,249,0.22)]">
              {user ? '✓' : '◎'}
            </div>

            <div>
              <div className="mb-3 text-sm font-bold uppercase tracking-[0.45em] text-cyan-100/80">Occu-Med</div>
              <CardTitle className="text-3xl font-black uppercase tracking-[0.18em] text-white">
                Account Setup
              </CardTitle>
              <CardDescription className="mx-auto mt-4 max-w-md text-base leading-7 text-white/65">
                {message}
              </CardDescription>
            </div>

            {user && (
              <div className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
                <span className="text-cyan-200">✦</span>
                <span className="truncate">Signed in as {user.email}</span>
              </div>
            )}
          </CardHeader>

          <CardFooter className="flex flex-col gap-3 px-8 pb-8">
            <Button onClick={() => setLocation(user ? '/' : '/login')} className="group w-full bg-white text-black hover:bg-cyan-100">
              {user ? 'Enter Portal' : 'Go to Login'} <span className="ml-2 transition group-hover:translate-x-1">→</span>
            </Button>
            <p className="text-center text-xs leading-5 text-white/35">
              Access is controlled by your assigned portal permissions. Contact an admin if a planet is visible but does not open for your account.
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
