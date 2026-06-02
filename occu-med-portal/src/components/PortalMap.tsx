import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { PORTALS, type PortalDef, type PortalPermissionKey } from '@/lib/config';
import { loadPortalState, type PlanetSettings } from '@/lib/portalBackend';

type LaunchState = {
  iframeUrl: string;
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
  const [, setLocation] = useLocation();
  const [settings, setSettings] = useState<PlanetSettings>(() => buildEmpty());
  const [audioUrl, setAudioUrl] = useState('');
  const [launch, setLaunch] = useState<LaunchState | null>(null);
  const [notice, setNotice] = useState('');
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

  const handlePlanetClick = (planet: PortalDef) => {
    setNotice('');

    if (planet.id === 'admin') {
      setLocation('/admin');
      return;
    }

    const conf = settings[planet.id as PortalPermissionKey];
    const url = conf?.url?.trim();

    if (!url) {
      setNotice(`${planet.label} does not have a Render URL configured yet.`);
      return;
    }

    const transitionVideo = conf.videoUrl?.trim() || null;
    setLaunch({
      iframeUrl: url,
      videoUrl: transitionVideo,
      label: planet.label,
      glow: planet.glow,
      videoOver: !transitionVideo,
    });
  };

  const handleVideoEnd = () => {
    if (launchAudioRef.current) {
      launchAudioRef.current.pause();
      launchAudioRef.current.currentTime = 0;
    }
    setLaunch((prev) => (prev ? { ...prev, videoOver: true } : null));
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

      {launch && (
        <div className="portal-launch-overlay">
          <iframe
            src={launch.iframeUrl}
            title={launch.label}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              opacity: launch.videoOver ? 1 : 0,
              transition: 'opacity 0.8s ease',
              zIndex: 1,
            }}
            allow="fullscreen"
          />
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
