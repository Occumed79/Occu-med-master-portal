import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../hooks/useAuth';

const ADMIN_BACKGROUND_PARTS = [
  '/assets/admin-login-video/part-00.b64',
  '/assets/admin-login-video/part-01.b64',
  '/assets/admin-login-video/part-02.b64',
];

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
    let mounted = true;
    let objectUrl = '';

    async function loadBackgroundVideo() {
      try {
        const parts = await Promise.all(
          ADMIN_BACKGROUND_PARTS.map(async (path) => {
            const response = await fetch(path, { cache: 'force-cache' });
            if (!response.ok) {
              throw new Error(`Unable to load admin background asset: ${response.status}`);
            }
            return (await response.text()).trim();
          }),
        );

        objectUrl = createVideoObjectUrl(parts.join(''));
        if (mounted) setBackgroundVideoUrl(objectUrl);
      } catch (error) {
        console.error('Admin login background video failed to load:', error);
      }
    }

    void loadBackgroundVideo();

    return () => {
      mounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  useEffect(() => {
    const video = backgroundVideoRef.current;
    if (!video || !backgroundVideoUrl) return;

    video.defaultPlaybackRate = 0.35;
    video.playbackRate = 0.35;
    void video.play().catch(() => {
      // The login remains fully usable if a browser blocks background autoplay.
    });
  }, [backgroundVideoUrl]);

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
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#020204] p-4 text-white">
      {backgroundVideoUrl && (
        <video
          ref={backgroundVideoRef}
          src={backgroundVideoUrl}
          className="absolute inset-0 -z-30 h-full w-full scale-110 object-cover opacity-90"
          style={{ filter: 'saturate(1.18) contrast(1.08) brightness(0.82)' }}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onLoadedMetadata={(event) => {
            event.currentTarget.defaultPlaybackRate = 0.35;
            event.currentTarget.playbackRate = 0.35;
          }}
        />
      )}

      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_42%,rgba(255,151,62,0.05)_0%,rgba(5,5,10,0.18)_38%,rgba(0,0,0,0.78)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/20 via-transparent to-black/75" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-300/[0.04] blur-3xl" />

      <Card className="relative w-full max-w-md overflow-hidden border border-orange-100/20 bg-black/40 shadow-[0_30px_100px_rgba(0,0,0,0.75),0_0_55px_rgba(255,132,45,0.13)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-orange-100/65 to-transparent" />
        <CardHeader className="space-y-3 pb-5 pt-8">
          <div className="text-center text-xs font-semibold uppercase tracking-[0.38em] text-orange-100/70">
            Occu-Med Secure Access
          </div>
          <div className="text-center text-3xl font-bold uppercase tracking-[0.24em] text-white drop-shadow-[0_0_20px_rgba(255,174,93,0.45)]">
            OCCU-MED
          </div>
          <CardTitle className="text-center text-xl text-white">Admin Command Center</CardTitle>
          <CardDescription className="mx-auto max-w-sm text-center leading-relaxed text-white/65">
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
              className="h-12 border-white/15 bg-black/35 text-white shadow-inner placeholder:text-white/38 focus-visible:border-orange-200/55 focus-visible:ring-orange-200/20"
              required
            />
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="Admin Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 border-white/15 bg-black/35 text-white shadow-inner placeholder:text-white/38 focus-visible:border-orange-200/55 focus-visible:ring-orange-200/20"
              required
            />
            {message && (
              <div className="rounded-xl border border-orange-100/20 bg-black/35 px-3 py-2 text-sm text-orange-50/85">
                {message}
              </div>
            )}
          </CardContent>
          <CardFooter className="pb-8 pt-2">
            <Button
              type="submit"
              className="h-12 w-full bg-white text-black shadow-[0_0_28px_rgba(255,197,139,0.2)] hover:bg-orange-50"
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
