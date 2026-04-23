import { motion } from 'framer-motion';
import { PORTALS } from '../lib/config';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'wouter';
import { useEffect, useState } from 'react';

const INTRO_KEY = 'occu-med-portal-intro-v2';

function checkFirstVisit() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('skipIntro') !== '1' && localStorage.getItem(INTRO_KEY) !== 'true';
}

const stars = Array.from({ length: 220 }, (_, i) => ({
  id: i,
  left: Number(((i * 37.3 + (i % 7) * 13.7) % 100).toFixed(2)),
  top: Number(((i * 61.7 + (i % 5) * 17.3) % 100).toFixed(2)),
  size: 0.8 + (i % 5) * 0.45,
  duration: 2.7 + (i % 9) * 0.52,
  delay: (i % 17) * 0.19,
  bright: i % 9 === 0,
}));

const nebulae = [
  { id: 'n1', x: '16%', y: '24%', size: '34vmin', color: 'rgba(83, 199, 255, 0.16)' },
  { id: 'n2', x: '79%', y: '28%', size: '28vmin', color: 'rgba(129, 114, 255, 0.14)' },
  { id: 'n3', x: '24%', y: '78%', size: '42vmin', color: 'rgba(48, 220, 208, 0.13)' },
  { id: 'n4', x: '84%', y: '76%', size: '38vmin', color: 'rgba(255, 107, 64, 0.12)' },
];

type LogoState = 'hidden' | 'glow' | 'flare' | 'persist';

export default function PortalMap() {
  const { permissions, isLive, isAdmin } = useAuth();

  const [introActive, setIntroActive] = useState(checkFirstVisit);
  const [logoState, setLogoState] = useState<LogoState>(() =>
    checkFirstVisit() ? 'hidden' : 'persist'
  );

  useEffect(() => {
    if (!introActive) return;

    const timers = [
      setTimeout(() => setLogoState('glow'), 900),
      setTimeout(() => setLogoState('flare'), 1250),
      setTimeout(() => setLogoState('persist'), 2200),
      setTimeout(() => {
        localStorage.setItem(INTRO_KEY, 'true');
        setIntroActive(false);
      }, 3400),
    ];

    return () => timers.forEach(clearTimeout);
  }, [introActive]);

  const handlePortalClick = (portal: (typeof PORTALS)[0]) => {
    if (!permissions.includes(portal.permissionKey)) return;
    window.open(portal.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      <img
        src={bgImage}
        alt="Occu-Med galaxy portal"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ imageRendering: 'high-quality', transform: 'translateZ(0)', filter: 'contrast(1.03) saturate(1.04)' }}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.48)_100%)]" />

      <div className="pointer-events-none absolute inset-0 mix-blend-screen">
        {stars.map((star) => (
          <div
            key={star.id}
            className={star.bright ? 'star star-bright' : 'star'}
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              '--duration': `${star.duration}s`,
              '--delay': `${star.delay}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {introActive && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="comet-head" />
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
        <div
          className={`center-logo ${logoState === 'hidden' ? 'logo-hidden' : logoState === 'glow' ? 'logo-glow' : logoState === 'flare' ? 'logo-flare' : 'logo-persist'}`}
        >
          OCCU&#8209;MED
        </div>
      </div>

      <div className="absolute left-0 top-0 z-50 flex w-full items-center justify-between p-5 md:p-7">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="flex items-center gap-4"
        >
          <div className="text-sm font-bold uppercase tracking-[0.34em] text-white/45 md:text-base">
            OCCU-MED
          </div>
          {!isLive && (
            <div className="rounded-full border border-white/20 bg-black/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 backdrop-blur-md">
              Setup Mode
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.15 }}
        >
          <Link
            href={isLive && !isAdmin ? '/login' : '/admin'}
            className="rounded-full border border-white/15 bg-black/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/75 backdrop-blur-md transition hover:border-white/35 hover:text-white"
          >
            Admin
          </Link>
        </motion.div>
      </div>

      {PORTALS.map((portal, idx) => {
        const hasAccess = permissions.includes(portal.permissionKey);
        const bloomDuration = 4 + (idx % 5) * 0.6;
        const bloomDelay = (idx * 0.6) % 3.2;

        return (
          <motion.button
            key={portal.id}
            aria-label={`${portal.label} portal`}
            className={`group absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none ${hasAccess ? 'cursor-pointer' : 'cursor-default'} ${hasAccess ? '' : 'opacity-60'}`}
            style={{
              left: `${portal.x}%`,
              top: `${portal.y}%`,
              width: `${portal.size}vmin`,
              height: `${portal.size}vmin`,
            }}
            onClick={() => handlePortalClick(portal)}
            whileHover={hasAccess ? { scale: 1.08 } : { scale: 1.01 }}
            whileTap={hasAccess ? { scale: 0.97 } : undefined}
          >
            <span
              className="ambient-bloom absolute rounded-full"
              style={{
                inset: '-38%',
                background: `radial-gradient(circle, ${portal.color}42 0%, ${portal.color}15 56%, transparent 82%)`,
                '--bloom-duration': `${bloomDuration}s`,
                '--bloom-delay': `${bloomDelay}s`,
              } as React.CSSProperties}
            />

            <span
              className="absolute inset-0 rounded-full opacity-45 blur-lg transition-opacity duration-500 group-hover:opacity-85"
              style={{ boxShadow: `0 0 35px 12px ${portal.color}` }}
            />

            <span
              className="absolute inset-[2%] rounded-full opacity-75 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                inset: '-16%',
                boxShadow: `0 0 54px 14px ${portal.color}98, inset 0 0 28px ${portal.color}55`,
              }}
            />

            <span
              className="portal-label pointer-events-none absolute left-1/2 -translate-x-1/2 translate-y-2 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"
              style={{
                bottom: '-2.7em',
                color: '#ebf4ff',
                textShadow: `0 0 8px ${portal.color}, 0 0 18px ${portal.color}80, 0 0 36px ${portal.color}45`,
              }}
            >
              {portal.label}
            </span>
          </motion.button>
        );
      })}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_44%,rgba(0,0,0,0.64)_100%)]" />
    </div>
  );
}
