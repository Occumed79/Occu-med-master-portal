import { useEffect, useRef, useState } from 'react';
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
};

type SoundCloudProgress = {
  relativePosition?: number;
};

type SoundCloudWidget = {
  bind: (eventName: string, listener: (event?: SoundCloudProgress) => void) => void;
  unbind: (eventName: string) => void;
  play: () => void;
  pause: () => void;
  seekTo: (milliseconds: number) => void;
  setVolume: (volume: number) => void;
};

type SoundCloudApi = {
  Widget: ((iframe: HTMLIFrameElement) => SoundCloudWidget) & {
    Events: {
      READY: string;
      FINISH: string;
      PLAY_PROGRESS: string;
    };
  };
};

declare global {
  interface Window {
    SC?: SoundCloudApi;
  }
}

const ARTWORK_SRC = '/assets/portal-solar-system-bg.mp4';
const SOUNDTRACK_URL = 'https://soundcloud.com/epicmountain/how-to-kurzgesagt';
const AMBIENT_VOLUME = 3;
const DUCKED_AMBIENT_VOLUME = 1;
const ARTWORK_LOOP_START_SECONDS = 0.08;
const ARTWORK_CROSSFADE_SECONDS = 0.9;
const ARTWORK_CROSSFADE_MS = 650;
const AUDIO_FADE_MS = 900;

function loadSoundCloudWidgetApi(): Promise<SoundCloudApi> {
  if (window.SC) return Promise.resolve(window.SC);

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-soundcloud-widget-api]');

    const handleReady = () => {
      if (window.SC) resolve(window.SC);
      else reject(new Error('SoundCloud Widget API did not initialize.'));
    };

    if (existingScript) {
      existingScript.addEventListener('load', handleReady, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('SoundCloud Widget API failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.async = true;
    script.dataset.soundcloudWidgetApi = 'true';
    script.addEventListener('load', handleReady, { once: true });
    script.addEventListener('error', () => reject(new Error('SoundCloud Widget API failed to load.')), { once: true });
    document.head.appendChild(script);
  });
}

function AmbientSoundtrack({ ducked }: { ducked: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const widgetRef = useRef<SoundCloudWidget | null>(null);
  const currentVolumeRef = useRef(0);
  const targetVolumeRef = useRef(AMBIENT_VOLUME);
  const fadeFrameRef = useRef(0);
  const fadingForEndRef = useRef(false);

  const fadeTo = (target: number, duration = AUDIO_FADE_MS) => {
    const widget = widgetRef.current;
    if (!widget) return;

    window.cancelAnimationFrame(fadeFrameRef.current);
    const startVolume = currentVolumeRef.current;
    const startedAt = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = progress * progress * (3 - 2 * progress);
      const nextVolume = startVolume + (target - startVolume) * eased;
      currentVolumeRef.current = nextVolume;
      widget.setVolume(Math.max(0, Math.min(100, nextVolume)));

      if (progress < 1) fadeFrameRef.current = window.requestAnimationFrame(step);
    };

    fadeFrameRef.current = window.requestAnimationFrame(step);
  };

  useEffect(() => {
    targetVolumeRef.current = ducked ? DUCKED_AMBIENT_VOLUME : AMBIENT_VOLUME;
    if (!fadingForEndRef.current) fadeTo(targetVolumeRef.current);
  }, [ducked]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let disposed = false;
    let widget: SoundCloudWidget | null = null;

    const startPlayback = () => {
      widget?.play();
      if (!fadingForEndRef.current) fadeTo(targetVolumeRef.current, 1200);
    };

    const removeGestureListeners = () => {
      document.removeEventListener('pointerdown', startPlayback, true);
      document.removeEventListener('keydown', startPlayback, true);
    };

    void loadSoundCloudWidgetApi()
      .then((api) => {
        if (disposed) return;
        widget = api.Widget(iframe);
        widgetRef.current = widget;

        widget.bind(api.Widget.Events.READY, () => {
          currentVolumeRef.current = 0;
          widget?.setVolume(0);
          widget?.play();
          fadeTo(targetVolumeRef.current, 1600);
        });

        widget.bind(api.Widget.Events.PLAY_PROGRESS, (event) => {
          const relativePosition = event?.relativePosition ?? 0;
          if (relativePosition > 0.985 && !fadingForEndRef.current) {
            fadingForEndRef.current = true;
            fadeTo(0, 2200);
          }
        });

        widget.bind(api.Widget.Events.FINISH, () => {
          widget?.seekTo(0);
          widget?.play();
          currentVolumeRef.current = 0;
          widget?.setVolume(0);
          fadingForEndRef.current = false;
          fadeTo(targetVolumeRef.current, 2200);
        });

        document.addEventListener('pointerdown', startPlayback, true);
        document.addEventListener('keydown', startPlayback, true);
      })
      .catch((error) => {
        console.error('Ambient soundtrack could not initialize:', error);
      });

    return () => {
      disposed = true;
      removeGestureListeners();
      window.cancelAnimationFrame(fadeFrameRef.current);
      if (widget && window.SC) {
        widget.unbind(window.SC.Widget.Events.READY);
        widget.unbind(window.SC.Widget.Events.FINISH);
        widget.unbind(window.SC.Widget.Events.PLAY_PROGRESS);
      }
      widget?.pause();
      widgetRef.current = null;
    };
  }, []);

  const widgetUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(SOUNDTRACK_URL)}&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false&single_active=false`;

  return (
    <>
      <iframe
        ref={iframeRef}
        src={widgetUrl}
        title="How To Kurzgesagt by Epic Mountain"
        allow="autoplay"
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: 'fixed',
          width: 1,
          height: 1,
          left: -9999,
          top: -9999,
          border: 0,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
      <a
        href={SOUNDTRACK_URL}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-2 right-3 z-30 text-[10px] text-white/25 transition-colors hover:text-white/55"
      >
        Music: Epic Mountain
      </a>
    </>
  );
}

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
  const [settings, setSettings] = useState<PlanetSettings>(() => buildEmpty());
  const [fallbackAudioUrl, setFallbackAudioUrl] = useState('');
  const [launch, setLaunch] = useState<LaunchState | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [accessPlanet, setAccessPlanet] = useState<PortalDef | null>(null);
  const [accessUsername, setAccessUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [notice, setNotice] = useState('');
  const [configError, setConfigError] = useState('');
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const launchVideoRef = useRef<HTMLVideoElement | null>(null);
  const launchAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSharedPortalConfig() {
      if (authLoading) return;
      setIsLoadingConfig(true);
      setNotice('');
      setConfigError('');

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
        const nextError = `Portal backend could not be loaded: ${message}`;
        setConfigError(nextError);
        setNotice(nextError);
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
    const transitionAudio = conf.audioUrl?.trim() || fallbackAudioUrl.trim() || null;

    if (!transitionVideo) {
      window.location.assign(url);
      return;
    }

    setLaunch({
      targetUrl: url,
      videoUrl: transitionVideo,
      audioUrl: transitionAudio,
      label: planet.label,
      glow: planet.glow,
    });
  };

  const submitPortalAccess = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accessPlanet) return;

    if (configError) {
      setNotice(configError);
      return;
    }

    setIsCheckingAccess(true);
    setNotice('');

    try {
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown access error';
      setNotice(`Unable to verify portal access: ${message}`);
    } finally {
      setIsCheckingAccess(false);
    }
  };

  const handlePlanetClick = (planet: PortalDef) => {
    setNotice('');

    if (planet.id === 'admin') {
      if (authLoading) {
        setNotice('Checking admin access...');
        return;
      }

      if (!user) {
        // Leave the animated portal page completely before rendering the login
        // screen. Safari can otherwise retain the portal's video/compositing
        // layers during an SPA route change and paint the next view black.
        window.location.assign('/login?next=/admin');
        return;
      }

      if (!isAdmin) {
        setNotice('Your account is signed in, but it does not have Admin access.');
        return;
      }

      window.location.assign('/admin');
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
    const targetUrl = launch?.targetUrl;
    if (!targetUrl) return;

    stopLaunchAudio();
    window.location.assign(targetUrl);
  };

  useEffect(() => {
    if (!launch) return;

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
      <AmbientSoundtrack ducked={Boolean(launch)} />

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
                onChange={(event) => {
                  setAccessUsername(event.target.value);
                  if (!configError) setNotice('');
                }}
                placeholder="Username"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-200/50"
                autoFocus
                required
              />
              <input
                type="password"
                value={accessCode}
                onChange={(event) => {
                  setAccessCode(event.target.value);
                  if (!configError) setNotice('');
                }}
                placeholder="Password/PIN"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-200/50"
                required
              />
            </div>
            {(configError || notice) && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-300/30 bg-red-500/15 px-3 py-2 text-sm text-red-100"
              >
                {configError || notice}
              </div>
            )}
            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={isLoadingConfig || isCheckingAccess || Boolean(configError)}
                className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isCheckingAccess ? 'Checking...' : 'Open Portal'}
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
          <div className="portal-launch-loading">
            <div className="portal-launch-media">
              <video
                ref={launchVideoRef}
                src={launch.videoUrl ?? undefined}
                autoPlay
                playsInline
                onEnded={handleVideoEnd}
                onError={handleVideoEnd}
                className="portal-launch-video"
              />
            </div>
            {launch.audioUrl && <audio ref={launchAudioRef} src={launch.audioUrl} autoPlay />}
          </div>
          <button onClick={handleVideoEnd} className="portal-close-button">
            Skip
          </button>
        </div>
      )}
    </div>
  );
}
