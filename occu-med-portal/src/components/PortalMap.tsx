import { motion } from 'framer-motion';
import { PORTALS } from '../lib/config';
import bgImage from '@assets/ChatGPT_Image_Apr_19,_2026,_07_56_01_PM_copy_2_1776690199128.png';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'wouter';
import { useEffect, useState } from 'react';

const INTRO_KEY = 'occu-med-portal-intro-v2';

function checkFirstVisit() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('skipIntro') !== '1' && localStorage.getItem(INTRO_KEY) !== 'true';
}

// 220 stars distributed across the canvas
const stars = Array.from({ length: 220 }, (_, i) => ({
  id: i,
  left: Number(((i * 37.3 + (i % 7) * 13.7) % 100).toFixed(2)),
  top:  Number(((i * 61.7 + (i % 5) * 17.3) % 100).toFixed(2)),
  size: 0.8 + (i % 5) * 0.45,
  duration: 2.5 + (i % 9) * 0.55,
  delay: (i % 17) * 0.19,
  bright: i % 9 === 0, // every 9th star gets cross-sparkle
}));

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
      setTimeout(() => setLogoState('glow'),    950),
      setTimeout(() => setLogoState('flare'),  1200),
      setTimeout(() => setLogoState('persist'), 2100),
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

      {/* Background — no extra filters that soften the image */}
      <img
        src={bgImage}
        alt="Occu-Med galaxy portal"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ imageRendering: 'auto', transform: 'translateZ(0)' }}
      />

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.5)_100%)]" />

      {/* Stars */}
      <div className="pointer-events-none absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className={star.bright ? 'star star-bright' : 'star'}
            style={{
              left: `${star.left}%`,
              top:  `${star.top}%`,
              width:  `${star.size}px`,
              height: `${star.size}px`,
              '--duration': `${star.duration}s`,
              '--delay':    `${star.delay}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Comet intro — only rendered on first visit */}
      {introActive && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="comet-head" />
        </div>
      )}

      {/* Center OCCU-MED logo */}
      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
        <div className={`center-logo ${logoState === 'hidden' ? 'logo-hidden' : logoState === 'glow' ? 'logo-glow' : logoState === 'flare' ? 'logo-flare' : 'logo-persist'}`}>
          OCCU&#8209;MED
        </div>
      </div>

      {/* Top bar */}
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

      {/* Portal planets */}
      {PORTALS.map((portal, idx) => {
        const hasAccess = permissions.includes(portal.permissionKey);
        const bloomDuration = 3.8 + (idx % 5) * 0.7;
        const bloomDelay    = (idx * 0.65) % 3.5;

        return (
          <motion.button
            key={portal.id}
            aria-label={`${portal.label} portal`}
            className={`group absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none ${hasAccess ? 'cursor-pointer' : 'cursor-default'}`}
            style={{
              left:   `${portal.x}%`,
              top:    `${portal.y}%`,
              width:  `${portal.size}vmin`,
              height: `${portal.size}vmin`,
            }}
            onClick={() => handlePortalClick(portal)}
            whileHover={hasAccess ? { scale: 1.08 } : { scale: 1.01 }}
            whileTap={hasAccess ? { scale: 0.97 } : undefined}
          >
            {/* Ambient bloom — always pulsing */}
            <span
              className="ambient-bloom absolute rounded-full"
              style={{
                inset: '-40%',
                background: `radial-gradient(circle, ${portal.color}2a 0%, ${portal.color}0c 55%, transparent 80%)`,
                '--bloom-duration': `${bloomDuration}s`,
                '--bloom-delay':    `${bloomDelay}s`,
              } as React.CSSProperties}
            />

            {/* Static base glow ring */}
            <span
              className="absolute inset-0 rounded-full opacity-40 blur-lg transition-opacity duration-500 group-hover:opacity-80"
              style={{ boxShadow: `0 0 32px 10px ${portal.color}` }}
            />

            {/* Hover bloom burst */}
            <span
              className="absolute rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                inset: '-18%',
                boxShadow: `0 0 55px 14px ${portal.color}90, inset 0 0 28px ${portal.color}55`,
              }}
            />

            {/* Label — invisible by default, floats up on hover */}
            <span
              className="portal-label pointer-events-none absolute left-1/2 -translate-x-1/2 translate-y-1.5 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"
              style={{
                bottom: '-2.4em',
                color: portal.color,
                textShadow: `0 0 8px ${portal.color}, 0 0 18px ${portal.color}80, 0 0 36px ${portal.color}40`,
              }}
            >
              {portal.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
