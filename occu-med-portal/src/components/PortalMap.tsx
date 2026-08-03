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
  audioUrl: string | null;
  label: string;
  glow: string;
  videoOver: boolean;
};

const ARTWORK_SRC = '/assets/portal-solar-system-bg.mp4';
const AMBIENT_AUDIO_SRC = '/assets/portal-ambient-soundtrack.mp3';
const AMBIENT_VOLUME = 0.035;
const DUCKED_AMBIENT_VOLUME = 0.008;
const ARTWORK_LOOP_START_SECONDS = 0.08;
const ARTWORK_CROSSFADE_SECONDS = 0.9;
const ARTWORK_CROSSFADE_MS = 650;

function SeamlessArtworkLoop() {
  const firstVideoRef = useRef<HTMLVideoElement | null>(null);
  const secondVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeIndexRef = useRef<0 | 1>(0);
  const switchingRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState<0 | 1>(0);

  useEffect(() => {
    const firstVideo = firstVideoRef.current;
    const secondVideo = secondVideoRef.current;
    if (!firstVideo || !secondVideo) return;

    const videos = [firstVideo, secondVideo] as const;
    let cancelled = false;
    let animationFrame = 0;
    let crossfadeTimer = 0;

    const resetToLoopStart = (video: HTMLVideoElement) => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      video.currentTime = Math.min(ARTWORK_LOOP_START_SECONDS, Math.max(0, video.duration - 0.05));
    };

    const switchLayers = async () => {
      if (cancelled || switchingRef.current) return;
      switchingRef.current = true;

      const oldIndex = activeIndexRef.current;
      const nextIndex = (oldIndex === 0 ? 1 : 0) as 0 | 1;
      const currentVideo = videos[oldIndex];
      const nextVideo = videos[nextIndex];

      resetToLoopStart(nextVideo);

      try {
        await nextVideo.play();
        if (cancelled) return;

        activeIndexRef.current = nextIndex;
        setActiveIndex(nextIndex);

        crossfadeTimer = window.setTimeout(() => {
          currentVideo.pause();
          resetToLoopStart(currentVideo);
          switchingRef.current = false;
        }, ARTWORK_CROSSFADE_MS);
      } catch {
        resetToLoopStart(currentVideo);
        void currentVideo.play().catch(() => undefined);
        switchingRef.current = false;
      }
    };

    const monitorLoop = () => {
      const currentVideo = videos[activeIndexRef.current];

      if (Number.isFinite(currentVideo.duration) && currentVideo.duration > 0) {
        const leadTime = Math.min(ARTWORK_CROSSFADE_SECONDS, currentVideo.duration * 0.18);
        if (currentVideo.duration - currentVideo.currentTime <= leadTime) {
          void switchLayers();
        }
      }

      animationFrame = window.requestAnimationFrame(monitorLoop);
    };

    const handleUnexpectedEnd = () => {
      void switchLayers();
    };

    videos.forEach((video) => video.addEventListener('ended', handleUnexpectedEnd));
    resetToLoopStart(firstVideo);
    void firstVideo.play().catch(() => undefined);
    animationFrame = window.requestAnimationFrame(monitorLoop);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(crossfadeTimer);
      videos.forEach((video) => {
        video.removeEventListener('ended', handleUnexpectedEnd);
        video.pause();
      });
    };
  }, []);

  const sharedVideoStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'fill',
    pointerEvents: 'none',
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
    transition: `opacity ${ARTWORK_CROSSFADE_MS}ms ease-in-out`,
  };

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <video
        ref={firstVideoRef}
        src={ARTWORK_SRC}
        muted
        playsInline
        preload="auto"
        style={{ ...sharedVideoStyle, opacity: activeIndex === 0 ? 1 : 0 }}
      />
      <video
        ref={secondVideoRef}
        src={ARTWORK_SRC}
        muted
        playsInline
        preload="auto"
        style={{ ...sharedVideoStyle, opacity: activeIndex === 1 ? 1 : 0 }}
      />
    </div>
  );
}

function buildEmpty(): PlanetSettings {
  return Object.fromEntries(
    PORTALS.map((portal) => [
      portal.id,
      {
        url: portal.url,
        videoUrl: portal.videoUrl,
        audioUrl: '',
      },
    ]),
  ) as PlanetSettings;
}

function mergeSettings(savedSettings?: Partial<PlanetSettings>): PlanetSettings {
  const defaults = buildEmpty();

  return Object.fromEntries(
    PORTALS.map((portal) => [
      portal.id,
      {
        ...defaults[portal.id],
        ...(savedSettings?.[portal.id] ?? {}),
      },
    ]),
  ) as PlanetSettings;
}

export default function PortalMap() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [settings, setSettings] = useState<PlanetSettings>(() => buildEmpty());
  const [fallbackAudioUrl, setFallbackAudioUrl] = useState('');
  const [launch, setLaunch] = useState<LaunchState | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [accessPlanet, setAccessPlanet] = useState<PortalDef | null>(null);
  const [accessUsername, setAccessUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const launchVideoRef = useRef<HTMLVideoElement | null>(null);
  const launchAudioRef = useRef<HTMLAudioElement | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

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
          setSettings(mergeSettings(backendState.settings));
        } else {
          setNotice('Portal links are not configured yet. An admin needs to save them in the Admin Command Center.');
        }

        setUsers(Array.isArray(backendState?.users) ? backendState.users : []);
        setFallbackAudioUrl(typeof backendState?.audioUrl === 'string' ? backendState.audioUrl : '');
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

  useEffect(() => {
    const audio = ambientAudioRef.current;
    if (!audio) return;

    let hasStarted = false;
    audio.volume = AMBIENT_VOLUME;

    function removeGestureListeners() {
      document.removeEventListener('pointerdown', startFromGesture, true);
      document.removeEventListener('keydown', startFromGesture, true);
    }

    async function tryStart() {
      if (hasStarted) return;
      try {
        await audio.play();
        hasStarted = true;
        removeGestureListeners();
      } catch {
        // Audible autoplay is commonly blocked until the first user interaction.
      }
    }

    function startFromGesture() {
      void tryStart();
    }

    document.addEventListener('pointerdown', startFromGesture, true);
    document.addEventListener('keydown', startFromGesture, true);
    void tryStart();

    return () => {
      removeGestureListeners();
      audio.pause();
    };
  }, []);

  useEffect(() => {
    const audio = ambientAudioRef.current;
    if (!audio) return;
    audio.volume = launch && !launch.videoOver ? DUCKED_AMBIENT_VOLUME : AMBIENT_VOLUME;
  }, [launch]);

  const openPortal = (planet: PortalDef) => {
    const conf = settings[planet.id as PortalPermissionKey];
    const url = conf?.url?.trim();

    if (!url) {
      setNotice(`${planet.label} does not have a link configured yet.`);
      return;
    }

    const transitionVideo = conf.videoUrl?.trim() || null;
    const transitionAudio = conf.audioUrl?.trim() || fallbackAudioUrl.trim() || null;

    if (!transitionVideo) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    setLaunch({
      targetUrl: url,
      videoUrl: transitionVideo,
      audioUrl: transitionAudio,
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

  const stopLaunchAudio = () => {
    if (!launchAudioRef.current) return;
    launchAudioRef.current.pause();
    launchAudioRef.current.currentTime = 0;
  };

  const handleVideoEnd = () => {
    stopLaunchAudio();
    setLaunch((previousLaunch) => {
      if (!previousLaunch) return null;
      window.open(previousLaunch.targetUrl, '_blank', 'noopener,noreferrer');
      return { ...previousLaunch, videoOver: true };
    });
  };

  const handleLaunchClose = () => {
    stopLaunchAudio();
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
      <audio ref={ambientAudioRef} src={AMBIENT_AUDIO_SRC} loop preload="auto" aria-hidden="true" />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 'max(100vw, 177.7778vh)',
          height: 'max(100vh, 56.25vw)',
          transform: 'translate(-50%, -50%)',
          zIndex: 1,
        }}
      >
        <SeamlessArtworkLoop />

        {PORTALS.map((planet) => {
          const hitWidth = `max(${(planet.size * 0.72).toFixed(2)}%, 72px)`;
          const hitHeight = `max(${(planet.size * 1.28).toFixed(2)}%, 72px)`;

          return (
            <div
              key={planet.id}
              style={{
                position: 'absolute',
                left: `${planet.x}%`,
                top: `${planet.y}%`,
                width: hitWidth,
                height: hitHeight,
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
                pointerEvents: 'auto',
              }}
            >
              <motion.button
                type="button"
                className="block h-full w-full rounded-full border-0 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                style={{ cursor: 'pointer', touchAction: 'manipulation', pointerEvents: 'auto' }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                onClick={() => handlePlanetClick(planet)}
                aria-label={`Open ${planet.label}`}
                title={planet.label}
              />
            </div>
          );
        })}
      </div>

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
              <button type="submit" className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100">
                Open Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccessPlanet(null);
                  setAccessUsername('');
                  setAccessCode('');
                }}
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
              {launch.audioUrl && <audio ref={launchAudioRef} src={launch.audioUrl} autoPlay />}
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
