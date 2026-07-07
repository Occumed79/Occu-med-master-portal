import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { PORTALS, type PortalDef, type PortalPermissionKey } from '@/lib/config';
import { loadPortalState, type PlanetSettings } from '@/lib/portalBackend';
import { useAuth } from '../hooks/useAuth';

type LaunchState = {
  targetUrl: string;
  videoUrl: string | null;
  label: string;
  glow: string;
  videoOver: boolean;
};

type ManagedPortalUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  codeDigest: string;
  permissions: PortalPermissionKey[];
};

type AccessPrompt = {
  planet: PortalDef;
  username: string;
  code: string;
  error: string;
};

const ARTWORK_SRC = '/assets/portal-solar-system-bg.mp4';

function buildEmpty(): PlanetSettings {
  return Object.fromEntries(
    PORTALS.map((portal) => [portal.id, { url: portal.url, videoUrl: portal.videoUrl }]),
  ) as PlanetSettings;
}

async function digestCode(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default function PortalMap() {
  const { loading: authLoading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [settings, setSettings] = useState<PlanetSettings>(() => buildEmpty());
  const [users, setUsers] = useState<ManagedPortalUser[]>([]);
  const [audioUrl, setAudioUrl] = useState('');
  const [launch, setLaunch] = useState<LaunchState | null>(null);
  const [notice, setNotice] = useState('');
  const [accessPrompt, setAccessPrompt] = useState<AccessPrompt | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const launchVideoRef = useRef<HTMLVideoElement | null>(null);
  const launchAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSharedPortalConfig() {
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

        if (typeof backendState?.audioUrl === 'string') {
          setAudioUrl(backendState.audioUrl);
        }

        const stateWithUsers = backendState as { users?: ManagedPortalUser[] } | null;
        if (Array.isArray(stateWithUsers?.users)) {
          setUsers(stateWithUsers.users);
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
  }, []);

  const startLaunch = (planet: PortalDef) => {
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

  const handlePlanetClick = (planet: PortalDef) => {
    setNotice('');

    if (planet.id === 'admin') {
      if (authLoading) {
        setNotice('Checking admin access...');
        return;
      }

      setLocation(isAdmin ? '/admin' : '/login?next=/admin');
      return;
    }

    setAccessPrompt({ planet, username: '', code: '', error: '' });
  };

  const handleAccessSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accessPrompt) return;

    const username = accessPrompt.username.trim().toLowerCase();
    const enteredDigest = await digestCode(accessPrompt.code);
    const matchedUser = users.find((entry) => entry.username.toLowerCase() === username && entry.codeDigest === enteredDigest);

    if (!matchedUser) {
      setAccessPrompt((current) => current ? { ...current, error: 'Invalid username or code.' } : current);
      return;
    }

    if (!matchedUser.permissions.includes(accessPrompt.planet.permissionKey)) {
      setAccessPrompt((current) => current ? { ...current, error: `This user does not have access to ${current.planet.label}.` } : current);
      return;
    }

    const planet = accessPrompt.planet;
    setAccessPrompt(null);
    startLaunch(planet);
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
          {notice || 'Loading portal configuration...'}
        </div>
      )}

      {accessPrompt && (
        <div className="portal-launch-overlay">
          <form
            onSubmit={handleAccessSubmit}
            className="rounded-3xl border border-white/15 bg-black/80 p-6 text-white shadow-2xl backdrop-blur-xl"
            style={{ width: 'min(420px, calc(100vw - 2rem))' }}
          >
            <div className="mb-4 text-center">
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-white/45">Portal Access</div>
              <div className="mt-2 text-2xl font-bold" style={{ color: accessPrompt.planet.glow }}>{accessPrompt.planet.label}</div>
            </div>
            <div className="space-y-3">
              <input
                value={accessPrompt.username}
                onChange={(event) => setAccessPrompt((current) => current ? { ...current, username: event.target.value, error: '' } : current)}
                placeholder="Username"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/35"
                autoFocus
                required
              />
              <input
                value={accessPrompt.code}
                onChange={(event) => setAccessPrompt((current) => current ? { ...current, code: event.target.value, error: '' } : current)}
                placeholder="Access code"
                type="password"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/35"
                required
              />
              {accessPrompt.error && <div className="rounded-xl border border-red-300/30 bg-red-500/15 px-3 py-2 text-sm text-red-100">{accessPrompt.error}</div>}
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setAccessPrompt(null)} className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70">Cancel</button>
              <button type="submit" className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black">Enter Portal</button>
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
