import PortalMap from '../components/PortalMap';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const STARTUP_KEY = 'occu-med-startup-seen';

function shouldShowStartup() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('skipIntro') === '1') return false;
  return localStorage.getItem(STARTUP_KEY) !== 'true';
}

export default function Home() {
  const [showLogo, setShowLogo] = useState(shouldShowStartup);

  useEffect(() => {
    if (!showLogo) return;

    const timer = setTimeout(() => {
      localStorage.setItem(STARTUP_KEY, 'true');
      setShowLogo(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [showLogo]);

  return (
    <>
      {showLogo ? (
        <div className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-black">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 1.1] }}
            transition={{ duration: 2.5, times: [0, 0.4, 0.8, 1] }}
            className="glow-text text-5xl font-bold uppercase tracking-[0.3em] text-white md:text-7xl"
          >
            Occu-Med
          </motion.div>
        </div>
      ) : null}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="h-full w-full"
      >
        <PortalMap />
      </motion.div>
    </>
  );
}
