import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const STORAGE_KEY = 'occu_med_planet_routes_v1';

type PlanetId =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto';

interface PlanetDef {
  id: PlanetId;
  label: string;
  className: string;
  x: number;
  y: number;
  size: number;
  glow: string;
  textColor: string;
}

interface PlanetSetting {
  url: string;
  videoUrl: string;
}

type PlanetSettings = Record<PlanetId, PlanetSetting>;

const PLANETS: PlanetDef[] = [
  { id: 'sun', label: 'Leadership', className: 'planet-sun', x: 13, y: 50, size: 21, glow: '#ffb339', textColor: '#fff6cf' },
  { id: 'mercury', label: 'ExamQA', className: 'planet-mercury', x: 34, y: 39, size: 10, glow: '#ff9b76', textColor: '#ffe8d9' },
  { id: 'venus', label: 'Scheduling', className: 'planet-venus', x: 52, y: 36, size: 11, glow: '#ff6e4f', textColor: '#ffe0cf' },
  { id: 'earth', label: 'Harvesting', className: 'planet-earth', x: 39, y: 52, size: 11, glow: '#72abff', textColor: '#d7ebff' },
  { id: 'mars', label: 'SME', className: 'planet-mars', x: 35, y: 66, size: 9, glow: '#ca59ff', textColor: '#f5d8ff' },
  { id: 'jupiter', label: 'Operations', className: 'planet-jupiter', x: 54, y: 69, size: 19, glow: '#a968ff', textColor: '#ecdcff' },
  { id: 'saturn', label: 'New', className: 'planet-saturn', x: 68, y: 43, size: 14, glow: '#72a1ff', textColor: '#e1ebff' },
  { id: 'uranus', label: 'Network', className: 'planet-uranus', x: 81, y: 66, size: 14, glow: '#88f6ff', textColor: '#d9ffff' },
  { id: 'neptune', label: 'Shared', className: 'planet-neptune', x: 86, y: 45, size: 10, glow: '#5d95ff', textColor: '#d9ebff' },
  { id: 'pluto', label: 'Admin', className: 'planet-pluto', x: 96, y: 66, size: 9, glow: '#a67cff', textColor: '#ece0ff' },
];

const emptySettings: PlanetSettings = {
  sun: { url: '', videoUrl: '' },
  mercury: { url: '', videoUrl: '' },
  venus: { url: '', videoUrl: '' },
  earth: { url: '', videoUrl: '' },
  mars: { url: '', videoUrl: '' },
  jupiter: { url: '', videoUrl: '' },
  saturn: { url: '', videoUrl: '' },
  uranus: { url: '', videoUrl: '' },
  neptune: { url: '', videoUrl: '' },
  pluto: { url: '', videoUrl: '' },
};

function loadSettings(): PlanetSettings {
  if (typeof window === 'undefined') return emptySettings;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptySettings;
  try {
    return { ...emptySettings, ...(JSON.parse(raw) as Partial<PlanetSettings>) };
  } catch {
    return emptySettings;
  }
}

function saveSettings(settings: PlanetSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export default function PortalMap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [settings, setSettings] = useState<PlanetSettings>(loadSettings);
  const [activeVideo, setActiveVideo] = useState<{ planetId: PlanetId; url: string; targetUrl: string } | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [draft, setDraft] = useState<PlanetSettings>(settings);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const stars = Array.from({ length: 220 }, (_, i) => ({
      x: ((i * 83.1) % 100) / 100,
      y: ((i * 53.7 + i * i) % 100) / 100,
      base: 0.15 + (i % 7) * 0.09,
      pulse: 1.4 + (i % 9) * 0.3,
      phase: (i % 11) * 0.6,
    }));

    const resize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
    };

    resize();
    window.addEventListener('resize', resize);

    const render = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#050a2f';
      ctx.fillRect(0, 0, w, h);

      stars.forEach((s, idx) => {
        const pulse = 0.45 + 0.55 * Math.sin(t / 1000 * s.pulse + s.phase);
        const r = (0.9 + (idx % 3) * 0.8 + pulse * 1.3) * window.devicePixelRatio;
        const x = s.x * w;
        const y = s.y * h;
        const alpha = Math.min(1, s.base + pulse * 0.55);

        ctx.beginPath();
        ctx.fillStyle = `rgba(235,245,255,${alpha})`;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);


  const handlePlanetClick = (planet: PlanetDef) => {
    if (planet.id === 'pluto') {
      setDraft(settings);
      setShowAdmin(true);
      return;
    }

    const conf = settings[planet.id];
    if (!conf?.url) return;
    if (conf.videoUrl) {
      setActiveVideo({ planetId: planet.id, url: conf.videoUrl, targetUrl: conf.url });
      return;
    }
    window.open(conf.url, '_blank', 'noopener,noreferrer');
  };

  const handleVideoEnd = () => {
    if (!activeVideo) return;
    window.open(activeVideo.targetUrl, '_blank', 'noopener,noreferrer');
    setActiveVideo(null);
  };

  const handleVideoUpload = (planetId: PlanetId, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setDraft((prev) => ({ ...prev, [planetId]: { ...prev[planetId], videoUrl: dataUrl } }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="solar-scene">
      <canvas ref={canvasRef} className="solar-star-canvas" />

      {PLANETS.map((planet) => (
        <motion.button
          key={planet.id}
          className={`solar-planet ${planet.className}`}
          style={{ left: `${planet.x}%`, top: `${planet.y}%`, width: `${planet.size}vmin`, height: `${planet.size}vmin`, '--planet-glow': planet.glow } as React.CSSProperties}
          whileHover={{ scale: 1.05 }}
          onClick={() => handlePlanetClick(planet)}
        >
          {planet.id === 'sun' && (
            <div className="sun-logo-wrap">
              <div className="sun-logo-mark">OM</div>
              <div className="sun-logo-text">OCCU-MED</div>
            </div>
          )}

          <span className="planet-hover-label" style={{ color: planet.textColor }}>{planet.label}</span>
        </motion.button>
      ))}

      {activeVideo && (
        <div className="video-overlay">
          <video src={activeVideo.url} controls autoPlay onEnded={handleVideoEnd} className="video-player" />
          <button className="video-close" onClick={() => setActiveVideo(null)}>Close</button>
        </div>
      )}

      {showAdmin && (
        <div className="admin-overlay">
          <div className="admin-panel">
            <h2>Pluto Admin Panel</h2>
            <p>Set video + destination URL for each planet.</p>
            <div className="admin-grid">
              {PLANETS.map((p) => (
                <div key={p.id} className="admin-card">
                  <strong>{p.label}</strong>
                  <input
                    type="url"
                    placeholder="https://portal-url"
                    value={draft[p.id].url}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [p.id]: { ...prev[p.id], url: e.target.value } }))}
                  />
                  <input
                    type="url"
                    placeholder="https://video-url.mp4"
                    value={draft[p.id].videoUrl.startsWith('data:') ? '' : draft[p.id].videoUrl}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [p.id]: { ...prev[p.id], videoUrl: e.target.value } }))}
                  />
                  <input type="file" accept="video/*" onChange={(e) => handleVideoUpload(p.id, e.target.files?.[0] ?? null)} />
                </div>
              ))}
            </div>
            <div className="admin-actions">
              <button onClick={() => setShowAdmin(false)}>Cancel</button>
              <button
                onClick={() => {
                  setSettings(draft);
                  saveSettings(draft);
                  setShowAdmin(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
