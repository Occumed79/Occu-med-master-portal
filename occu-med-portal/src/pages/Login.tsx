import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../hooks/useAuth';

const ADMIN_BACKGROUND_SRC = '/assets/admin-login-background.mp4';

function getNextPath(): string {
  if (typeof window === 'undefined') return '/admin';
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  return next?.startsWith('/') ? next : '/admin';
}

export default function Login() {
  const { user, loginAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) setLocation(getNextPath());
  }, [user, setLocation]);

  const startBackgroundVideo = (video: HTMLVideoElement) => {
    video.defaultPlaybackRate = 0.35;
    video.playbackRate = 0.35;

    if (video.currentTime < 0.2 && video.duration > 1) {
      video.currentTime = 0.2;
    }

    setVideoReady(true);
    void video.play().catch(() => undefined);
  };

  useEffect(() => {
    const resumeVideo = () => {
      const video = backgroundVideoRef.current;
      if (!video) return;
      video.playbackRate = 0.35;
      void video.play().catch(() => undefined);
    };

    document.addEventListener('pointerdown', resumeVideo, { once: true, capture: true });
    document.addEventListener('keydown', resumeVideo, { once: true, capture: true });

    return () => {
      document.removeEventListener('pointerdown', resumeVideo, true);
      document.removeEventListener('keydown', resumeVideo, true);
    };
  }, []);

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-4 text-white">
      <video
        ref={backgroundVideoRef}
        src={ADMIN_BACKGROUND_SRC}
        className={`absolute inset-0 z-0 h-full w-full scale-[1.08] object-cover transition-opacity duration-700 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
        style={{ filter: 'saturate(1.18) contrast(1.04) brightness(1.12)' }}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        onLoadedMetadata={(event) => startBackgroundVideo(event.currentTarget)}
        onCanPlay={(event) => startBackgroundVideo(event.currentTarget)}
        onPlaying={() => setVideoReady(true)}
        onError={(event) => {
          console.error('Admin login background video failed to load:', event.currentTarget.error);
          setVideoReady(false);
        }}
      />

      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_48%,transparent_0%,rgba(0,0,0,0.05)_55%,rgba(0,0,0,0.44)_100%)]" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/5 via-transparent to-black/30" />
      {!videoReady && <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,#7c2d12_0%,#1c0a05_38%,#000_78%)]" />}

      <Card className="relative z-20 w-full max-w-md overflow-hidden border border-orange-100/30 bg-black/35 shadow-[0_30px_100px_rgba(0,0,0,0.55),0_0_55px_rgba(255,132,45,0.18)] backdrop-blur-lg">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-orange-100/75 to-transparent" />
        <CardHeader className="space-y-3 pb-5 pt-8">
          <CardTitle className="text-center text-2xl text-white">Admin Command Center</CardTitle>
          <CardDescription className="mx-auto max-w-sm text-center leading-relaxed text-white/75">
            Enter the administrator credentials to manage portal access and launch settings.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleAdminLogin}>
          <CardContent className="space-y-4">
            <Input
              type="email"
              autoComplete="username"
              placeholder="Admin Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 border-white/20 bg-black/45 text-white shadow-inner placeholder:text-white/50 focus-visible:border-orange-200/65 focus-visible:ring-orange-200/20"
              required
            />
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="Admin Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 border-white/20 bg-black/45 text-white shadow-inner placeholder:text-white/50 focus-visible:border-orange-200/65 focus-visible:ring-orange-200/20"
              required
            />
            {message && (
              <div className="rounded-xl border border-orange-100/25 bg-black/45 px-3 py-2 text-sm text-orange-50/90">
                {message}
              </div>
            )}
          </CardContent>
          <CardFooter className="pb-8 pt-2">
            <Button
              type="submit"
              className="h-12 w-full bg-white text-black shadow-[0_0_28px_rgba(255,197,139,0.22)] hover:bg-orange-50"
              disabled={loading}
            >
              {loading ? 'Opening...' : 'Open Admin Panel'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
