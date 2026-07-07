import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { PORTALS, type PortalDef, type PortalPermissionKey } from '@/lib/config';
import { loadPortalState, type ManagedUser, type PlanetSettings } from '@/lib/portalBackend';
import { digestAccessCode, normalizeUsername } from '@/lib/accessControl';
import { useAuth } from '../hooks/useAuth';

type LaunchState = {
  targetUrl: string;
  videoUrl: string | null;
  label: string;
  glow: string;
  videoOver: boolean;
};

const ARTWORK_SRC = '/assets/portal-solar-system-bg.mp4';

function buildEmpty(): PlanetSettings {
  return Object.fromEntries(
    PORTALS.map((portal) => [portal.id, { url: portal.url, videoUrl: portal.videoUrl }]),
  ) as PlanetSettings;
}

export default function PortalMap() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [settings, setSettings] = useState<PlanetSettings>(() => buildEmpty());
  const [audioUrl, setAudioUrl] = useState('');
  const [launch, setLaunch] = useState<LaunchState | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [accessPlanet, setAccessPlanet] = useState<PortalDef | null>(null);
  const [accessUsername, setAccessUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const launchVideoRef = useRef<HTMLVideoElement | null>(null);
  const launchAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSharedPortalConfig() {
      if (authLoading) return;
      setIsLoadingConfig(true);
      setNotice('');

      try {
        const backendState = await loadPortalState();
        if (!mounted) return;

        if (backendState?.settings) {
          setSettings({ ...buildEmpty(), ...backendState.settings });
        } else {
          setNotice('Portal links are not configured yet. An admin needs to save them in the Admin Command Center.');
        }

        setUsers(Array.isArray(backendState?.users) ? backendState.users : []);

        if (typeof backendState?.audioUrl === 'string') {
          setAudioUrl(backendState.audioUrl);
        }
      } catch (error: unknown) {
        if (!mounted) return;
        const message = error instanceof Error ? error.message : 'Unknown backend error';
        setNotice(`Portal backend could not be loaded: ${message}`);
      } finally {
        if (mounted) setIsLoadingConfig(false);
      }
    }

    void loadSharedPortalConfig();

    return () => {
      mounted = false;
    };
  }, [authLoading]);

  const openPortal = (planet: PortalDef) => {
    const conf = settings[planet.id as PortalPermissionKey];
    const url = conf?.url?.trim();

    if (!url) {
      setNotice(`${planet.label} does not have a link configured yet.`);
      return;
    }

    const transitionVideo = conf.videoUrl?.trim() || null;
    if (!transitionVideo) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    setLaunch({
      targetUrl: url,
      videoUrl: transitionVideo,
      label: planet.label,
      glow: planet.glow,
      videoOver: false,
    });
  };

  const submitPortalAccess = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accessPlanet) return;

    const username = normalizeUsername(accessUsername);
    const codeDigest = await digestAccessCode(accessCode);
    const matchedUser = users.find((entry) => entry.username === username && entry.codeDigest === codeDigest);

    if (!matchedUser) {
      setNotice('Invalid username or password.');
      return;
    }

    if (!matchedUser.permissions.includes(accessPlanet.permissionKey)) {
      setNotice(`This user does not have access to ${accessPlanet.label}.`);
      return;
    }

    const planet = accessPlanet;
    setAccessPlanet(null);
    setAccessUsername('');
    setAccessCode('');
    openPortal(planet);
  };

  const handlePlanetClick = (planet: PortalDef) => {
    setNotice('');

    if (planet.id === 'admin') {
      if (authLoading) {
        setNotice('Checking admin access...');
        return;
      }

      if (!user) {
        setLocation('/login?next=/admin');
        return;
      }

      if (!isAdmin) {
        setNotice('Your account is signed in, but it does not have Admin access.');
        return;
      }

      setLocation('/admin');
      return;
    }

    setAccessPlanet(planet);
  };

  const handleVideoEnd = () => {
    if (launchAudioRef.current) {
      launchAudioRef.current.pause();
      launchAudioRef.current.currentTime = 0;
    }
    setLaunch((prev: LaunchState | null) => {
      if (prev) {
        window.open(prev.targetUrl, '_blank', 'noopener,noreferrer');
        return { ...prev, videoOver: true };
      }
      return null;
    });
  };

  const handleLaunchClose = () => {
    if (launchAudioRef.current) {
      launchAudioRef.current.pause();
      launchAudioRef.current.currentTime = 0;
    }
    setLaunch(null);
  };

  useEffect(() => {
    if (!launch || launch.videoOver) return;

    const video = launchVideoRef.current;
    if (video) {
      video.currentTime = 0;
      void video.play().catch(() => {
        setNotice('Video autoplay was blocked by the browser. Tap Skip to continue.');
      });
    }

    const audio = launchAudioRef.current;
    if (audio?.src) {
      audio.currentTime = 0;
      void audio.play().catch(() => {
        setNotice('Audio autoplay was blocked by the browser.');
      });
    }
  }, [launch]);

  return (
    <div className="portal-artwork-scene">
      <video src={ARTWORK_SRC} className="portal-artwork" autoPlay muted loop playsInline preload="auto" />

      {PORTALS.map((planet) => (
        <motion.button
          key={planet.id}
          className="planet-hotspot"
          style={{
            left: `${planet.x}%`,
            top: `${planet.y}%`,
            width: `${planet.size}vmin`,
            height: `${planet.size}vmin`,
          }}
          whileHover={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          onClick={() => handlePlanetClick(planet)}
          aria-label={planet.label}
          title={planet.label}
        />
      ))}

      {(notice || isLoadingConfig) && (
        <div className="portal-status-message">
          {notice || 'Loading secure portal configuration...'}
        </div>
      )}

      {accessPlanet && (
        <div className="portal-launch-overlay">
          <form
            onSubmit={submitPortalAccess}
            className="w-[min(92vw,420px)] rounded-3xl border border-white/15 bg-black/80 p-6 text-white shadow-2xl backdrop-blur-xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-100/70">Portal Access</p>
            <h2 className="mt-2 text-2xl font-bold">{accessPlanet.label}</h2>
            <p className="mt-2 text-sm text-white/55">Enter the username and PIN/password provided by an admin.</p>
            <div className="mt-5 space-y-3">
              <input
                value={accessUsername}
                onChange={(event) => setAccessUsername(event.target.value)}
                placeholder="Username"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-200/50"
                autoFocus
                required
              />
              <input
                type="password"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                placeholder="Password/PIN"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-200/50"
                required
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button type="submit" className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100">Open Portal</button>
              <button
                type="button"
                onClick={() => { setAccessPlanet(null); setAccessUsername(''); setAccessCode(''); }}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/75 hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {launch && (
        <div className="portal-launch-overlay">
          {!launch.videoOver && (
            <div className="portal-launch-loading">
              <div className="portal-launch-media">
                <video
                  ref={launchVideoRef}
                  src={launch.videoUrl ?? undefined}
                  autoPlay
                  playsInline
                  onEnded={handleVideoEnd}
                  className="portal-launch-video"
                />
              </div>
              {audioUrl && <audio ref={launchAudioRef} src={audioUrl} autoPlay />}
            </div>
          )}
          <button onClick={launch.videoOver ? handleLaunchClose : handleVideoEnd} className="portal-close-button">
            {launch.videoOver ? 'Close' : 'Skip'}
          </button>
        </div>
      )}
    </div>
  );
}
