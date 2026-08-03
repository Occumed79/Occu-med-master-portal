import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../hooks/useAuth';

declare const __ADMIN_LOGIN_VIDEO_BASE64__: string;

function getNextPath(): string {
  if (typeof window === 'undefined') return '/admin';
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  return next?.startsWith('/') ? next : '/admin';
}

function createVideoObjectUrl(base64: string): string {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
}

export default function Login() {
  const { user, loginAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  const [backgroundVideoUrl, setBackgroundVideoUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) setLocation(getNextPath());
  }, [user, setLocation]);

  useEffect(() => {
    let objectUrl = '';

    try {
      objectUrl = createVideoObjectUrl(__ADMIN_LOGIN_VIDEO_BASE64__);
      setBackgroundVideoUrl(objectUrl);
    } catch (error) {
      console.error('Admin login background video could not be decoded:', error);
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  useEffect(() => {
    const video = backgroundVideoRef.current;
    if (!video || !backgroundVideoUrl) return;

    video.defaultPlaybackRate = 0.35;
    video.playbackRate = 0.35;
    void video.play().catch(() => undefined);
  }, [backgroundVideoUrl]);

  const startBackgroundVideo = (video: HTMLVideoElement) => {
    video.defaultPlaybackRate = 0.35;
    video.playbackRate = 0.35;

    if (video.currentTime < 0.65 && video.duration > 1) {
      video.currentTime = 0.65;
    }

    void video.play().catch(() => undefined);
  };

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,#7c2d12_0%,#1c0a05_38%,#000_78%)] p-4 text-white">
      {backgroundVideoUrl && (
        <video
          ref={backgroundVideoRef}
          src={backgroundVideoUrl}
          className="absolute inset-0 z-0 h-full w-full object-cover opacity-100"
          style={{ filter: 'saturate(1.28) contrast(1.08) brightness(1.15)' }}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onLoadedMetadata={(event) => startBackgroundVideo(event.currentTarget)}
          onCanPlay={(event) => startBackgroundVideo(event.currentTarget)}
        />
      )}

      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_48%,transparent_0%,rgba(0,0,0,0.03)_52%,rgba(0,0,0,0.35)_100%)]" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/0 via-transparent to-black/20" />

      <Card className="relative z-20 w-full max-w-md overflow-hidden border border-orange-100/30 bg-black/28 shadow-[0_30px_100px_rgba(0,0,0,0.55),0_0_55px_rgba(255,132,45,0.18)] backdrop-blur-xl">
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
