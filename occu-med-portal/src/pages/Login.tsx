import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../hooks/useAuth';

type Star = {
  id: number;
  left: number;
  top: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  color: string;
};

function getNextPath(): string {
  if (typeof window === 'undefined') return '/admin';
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  return next?.startsWith('/') ? next : '/admin';
}

function makeStars(count: number, seed: number, palette: string[]): Star[] {
  let value = seed >>> 0;
  const random = () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };

  return Array.from({ length: count }, (_, id) => ({
    id,
    left: random() * 100,
    top: random() * 100,
    size: 0.8 + random() * 2.4,
    opacity: 0.28 + random() * 0.7,
    duration: 2.2 + random() * 5.4,
    delay: random() * -8,
    color: palette[Math.floor(random() * palette.length)] ?? '#ffffff',
  }));
}

function StarLayer({ stars, className }: { stars: Star[]; className: string }) {
  return (
    <div className={`admin-star-layer ${className}`} aria-hidden="true">
      {stars.map((star) => (
        <span
          key={star.id}
          className="admin-star"
          style={
            {
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              background: star.color,
              boxShadow: `0 0 ${Math.max(5, star.size * 5)}px ${star.color}`,
              animationDuration: `${star.duration}s`,
              animationDelay: `${star.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default function Login() {
  const { user, loginAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const distantStars = useMemo(
    () => makeStars(110, 9147, ['#ffffff', '#dbeafe', '#bfdbfe']),
    [],
  );
  const middleStars = useMemo(
    () => makeStars(72, 27183, ['#ffffff', '#93c5fd', '#fef3c7']),
    [],
  );
  const nearStars = useMemo(
    () => makeStars(34, 80411, ['#f8fafc', '#60a5fa', '#fde68a']),
    [],
  );

  useEffect(() => {
    if (user) setLocation(getNextPath());
  }, [user, setLocation]);

  const handleAdminLogin = (event: FormEvent) => {
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#02040d] p-4 text-white">
      <style>{`
        .admin-space {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background:
            radial-gradient(circle at 19% 24%, rgba(30, 64, 175, 0.18), transparent 28%),
            radial-gradient(circle at 78% 28%, rgba(217, 119, 6, 0.11), transparent 24%),
            radial-gradient(circle at 70% 79%, rgba(37, 99, 235, 0.16), transparent 30%),
            radial-gradient(circle at 50% 48%, #081127 0%, #030716 46%, #010208 78%, #000 100%);
        }

        .admin-nebula {
          position: absolute;
          width: 55vw;
          height: 55vw;
          border-radius: 999px;
          filter: blur(90px);
          opacity: 0.18;
          mix-blend-mode: screen;
          animation: adminNebulaFloat 22s ease-in-out infinite alternate;
        }

        .admin-nebula-blue {
          left: -18vw;
          top: 18vh;
          background: radial-gradient(circle, rgba(29, 78, 216, 0.8), rgba(30, 64, 175, 0.15) 42%, transparent 70%);
        }

        .admin-nebula-gold {
          right: -20vw;
          top: -12vh;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.52), rgba(180, 83, 9, 0.12) 44%, transparent 72%);
          animation-delay: -9s;
        }

        .admin-star-layer {
          position: absolute;
          inset: -8%;
          pointer-events: none;
          will-change: transform;
        }

        .admin-star-layer-far {
          animation: adminDriftFar 40s ease-in-out infinite alternate;
        }

        .admin-star-layer-mid {
          animation: adminDriftMid 28s ease-in-out infinite alternate;
        }

        .admin-star-layer-near {
          animation: adminDriftNear 20s ease-in-out infinite alternate;
        }

        .admin-star {
          position: absolute;
          display: block;
          border-radius: 999px;
          animation-name: adminTwinkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          transform: translateZ(0);
        }

        .admin-starburst {
          position: absolute;
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: var(--star-color);
          box-shadow:
            0 0 10px var(--star-color),
            0 0 22px var(--star-color),
            0 0 42px var(--star-glow);
          animation: adminBurstPulse var(--pulse-speed) ease-in-out infinite;
        }

        .admin-starburst::before,
        .admin-starburst::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          background: linear-gradient(to right, transparent, var(--star-color), transparent);
          transform: translate(-50%, -50%);
          opacity: 0.8;
        }

        .admin-starburst::before {
          width: 90px;
          height: 1px;
        }

        .admin-starburst::after {
          width: 1px;
          height: 90px;
          background: linear-gradient(to bottom, transparent, var(--star-color), transparent);
        }

        .admin-starburst-blue-one {
          left: 22%;
          top: 31%;
          --star-color: #dbeafe;
          --star-glow: rgba(37, 99, 235, 0.85);
          --pulse-speed: 4.6s;
        }

        .admin-starburst-blue-two {
          right: 16%;
          bottom: 22%;
          --star-color: #eff6ff;
          --star-glow: rgba(59, 130, 246, 0.9);
          --pulse-speed: 5.4s;
          animation-delay: -2.2s;
        }

        .admin-starburst-gold-one {
          right: 20%;
          top: 24%;
          --star-color: #fff7d6;
          --star-glow: rgba(245, 158, 11, 0.72);
          --pulse-speed: 6.2s;
          animation-delay: -1.7s;
        }

        .admin-starburst-gold-two {
          left: 12%;
          bottom: 18%;
          --star-color: #fef3c7;
          --star-glow: rgba(217, 119, 6, 0.68);
          --pulse-speed: 5.8s;
          animation-delay: -3.1s;
        }

        @keyframes adminTwinkle {
          0%, 100% { transform: scale(0.72); opacity: 0.34; }
          45% { transform: scale(1.35); opacity: 1; }
          64% { transform: scale(0.94); opacity: 0.62; }
        }

        @keyframes adminDriftFar {
          from { transform: translate3d(-1.2%, -0.8%, 0) scale(1.02); }
          to { transform: translate3d(1.4%, 1%, 0) scale(1.06); }
        }

        @keyframes adminDriftMid {
          from { transform: translate3d(1.4%, -1.1%, 0) scale(1.03); }
          to { transform: translate3d(-1.7%, 1.3%, 0) scale(1.08); }
        }

        @keyframes adminDriftNear {
          from { transform: translate3d(-1.8%, 1.2%, 0) scale(1.04); }
          to { transform: translate3d(2%, -1.5%, 0) scale(1.1); }
        }

        @keyframes adminNebulaFloat {
          from { transform: translate3d(-3%, -2%, 0) scale(0.92); }
          to { transform: translate3d(5%, 4%, 0) scale(1.08); }
        }

        @keyframes adminBurstPulse {
          0%, 100% { transform: scale(0.78); opacity: 0.58; }
          50% { transform: scale(1.28); opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .admin-star-layer,
          .admin-star,
          .admin-nebula,
          .admin-starburst {
            animation: none !important;
          }
        }
      `}</style>

      <div className="admin-space" aria-hidden="true">
        <div className="admin-nebula admin-nebula-blue" />
        <div className="admin-nebula admin-nebula-gold" />
        <StarLayer stars={distantStars} className="admin-star-layer-far" />
        <StarLayer stars={middleStars} className="admin-star-layer-mid" />
        <StarLayer stars={nearStars} className="admin-star-layer-near" />
        <span className="admin-starburst admin-starburst-blue-one" />
        <span className="admin-starburst admin-starburst-blue-two" />
        <span className="admin-starburst admin-starburst-gold-one" />
        <span className="admin-starburst admin-starburst-gold-two" />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_48%,transparent_0%,rgba(0,0,0,0.05)_54%,rgba(0,0,0,0.42)_100%)]" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/5 via-transparent to-black/35" />

      <Card className="relative z-20 w-full max-w-md overflow-hidden border border-blue-100/25 bg-[#030817]/58 shadow-[0_30px_100px_rgba(0,0,0,0.62),0_0_58px_rgba(59,130,246,0.14),0_0_28px_rgba(245,158,11,0.08)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-blue-100/75 to-transparent" />
        <CardHeader className="space-y-3 pb-5 pt-8">
          <CardTitle className="text-center text-2xl text-white">Admin Command Center</CardTitle>
          <CardDescription className="mx-auto max-w-sm text-center leading-relaxed text-white/72">
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
              className="h-12 border-white/18 bg-black/38 text-white shadow-inner placeholder:text-white/46 focus-visible:border-blue-200/65 focus-visible:ring-blue-200/20"
              required
            />
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="Admin Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 border-white/18 bg-black/38 text-white shadow-inner placeholder:text-white/46 focus-visible:border-blue-200/65 focus-visible:ring-blue-200/20"
              required
            />
            {message && (
              <div className="rounded-xl border border-blue-100/25 bg-black/45 px-3 py-2 text-sm text-blue-50/90">
                {message}
              </div>
            )}
          </CardContent>
          <CardFooter className="pb-8 pt-2">
            <Button
              type="submit"
              className="h-12 w-full bg-white text-black shadow-[0_0_28px_rgba(147,197,253,0.2)] hover:bg-blue-50"
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
