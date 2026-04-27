import { useState } from 'react';
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
  x: number;
  y: number;
  size: number;
  glow: string;
}

interface PlanetSetting {
  url: string;
  videoUrl: string;
}

type PlanetSettings = Record<PlanetId, PlanetSetting>;

const PLANETS: PlanetDef[] = [
  { id: 'sun', label: 'Leadership', x: 12, y: 49, size: 22.5, glow: '#ffb54b' },
  { id: 'mercury', label: 'ExamQA', x: 34.5, y: 38.5, size: 10, glow: '#ffad8d' },
  { id: 'venus', label: 'Scheduling', x: 52, y: 35.6, size: 11, glow: '#ff6e4f' },
  { id: 'earth', label: 'Harvesting', x: 39.8, y: 52.7, size: 10.8, glow: '#74a9ff' },
  { id: 'mars', label: 'SME', x: 34.3, y: 67.5, size: 9.1, glow: '#c86cff' },
  { id: 'jupiter', label: 'Operations', x: 53.5, y: 70.3, size: 19, glow: '#a56dff' },
  { id: 'saturn', label: 'New', x: 68.7, y: 44, size: 14.5, glow: '#7ea2ff' },
  { id: 'uranus', label: 'Network', x: 81.5, y: 66.8, size: 14, glow: '#9ef7ff' },
  { id: 'neptune', label: 'Shared', x: 86.4, y: 44.5, size: 10.8, glow: '#5d93ff' },
  { id: 'pluto', label: 'Admin', x: 96, y: 66.2, size: 9.3, glow: '#ad86ff' },
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
  const [settings, setSettings] = useState<PlanetSettings>(loadSettings);
  const [activeVideo, setActiveVideo] = useState<{ url: string; targetUrl: string } | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [draft, setDraft] = useState<PlanetSettings>(settings);

  const handlePlanetClick = (planet: PlanetDef) => {
    if (planet.id === 'pluto') {
      setDraft(settings);
      setShowAdmin(true);
      return;
    }

    const conf = settings[planet.id];
    if (!conf?.url) return;
    if (conf.videoUrl) {
      setActiveVideo({ url: conf.videoUrl, targetUrl: conf.url });
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
    <div className="portal-artwork-scene">
      <div className="portal-artwork" aria-hidden="true" />

      {PLANETS.map((planet) => (
        <motion.button
          key={planet.id}
          className="planet-hotspot"
          style={{ left: `${planet.x}%`, top: `${planet.y}%`, width: `${planet.size}vmin`, height: `${planet.size}vmin`, '--planet-glow': planet.glow } as React.CSSProperties}
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          onClick={() => handlePlanetClick(planet)}
          aria-label={planet.label}
        >
          <span className="planet-hotspot-glow" />
          <span className="planet-hotspot-label">{planet.label}</span>
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
