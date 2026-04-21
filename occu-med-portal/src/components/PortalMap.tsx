import { motion } from 'framer-motion';
import { PORTALS } from '../lib/config';
import bgImage from '@assets/ChatGPT_Image_Apr_19,_2026,_07_56_01_PM_copy_2_1776690199128.png';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'wouter';

const stars = Array.from({ length: 64 }, (_, index) => ({
  id: index,
  left: (index * 37) % 100,
  top: (index * 61) % 100,
  size: 1 + (index % 3),
  duration: 2 + (index % 4) * 0.8,
  delay: (index % 7) * 0.28,
}));

export default function PortalMap() {
  const { permissions, isLive, isAdmin } = useAuth();

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
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.18)_100%)]" />
      <div className="absolute inset-0 bg-black/5" />

      <div className="pointer-events-none absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="star"
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

      <div className="absolute left-0 top-0 z-50 flex w-full items-center justify-between p-5 md:p-7">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="flex items-center gap-4"
        >
          <div className="glow-text text-xl font-bold uppercase tracking-[0.34em] text-white md:text-2xl">OCCU-MED</div>
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

      {PORTALS.map((portal) => {
        const hasAccess = permissions.includes(portal.permissionKey);
        return (
          <motion.button
            key={portal.id}
            aria-label={`${portal.label} portal`}
            className={`group absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none ${hasAccess ? 'cursor-pointer' : 'cursor-default'}`}
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
              className="absolute inset-0 rounded-full opacity-35 blur-md transition duration-500 group-hover:opacity-80"
              style={{ boxShadow: `0 0 34px 8px ${portal.color}` }}
            />
            <span
              className="absolute inset-[-12%] rounded-full opacity-0 transition duration-500 group-hover:opacity-100"
              style={{ boxShadow: `0 0 48px 8px ${portal.color}, inset 0 0 22px ${portal.color}` }}
            />
            <span
              className="relative rounded-full border border-white/15 bg-black/15 px-3 py-1 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/90 shadow-black/30 backdrop-blur-[1px] transition duration-300 group-hover:border-white/35 group-hover:text-white md:text-xs"
              style={{ textShadow: `0 0 8px ${portal.color}, 0 0 18px ${portal.color}` }}
            >
              {portal.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
