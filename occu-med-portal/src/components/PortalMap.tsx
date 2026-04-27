import { useState } from 'react';
import { motion } from 'framer-motion';
import { PORTALS, STORAGE_KEY, type PortalDef, type PortalPermissionKey } from '../lib/config';

// ── Types ────────────────────────────────────────────────────────────────────

interface PlanetSetting {
  url: string;
  videoUrl: string;
}
type PlanetSettings = Record<PortalPermissionKey, PlanetSetting>;

// ── Background artwork (SVG) ─────────────────────────────────────────────────

const artworkDataUri =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'>
      <defs>
        <radialGradient id='bg' cx='50%' cy='50%' r='75%'>
          <stop offset='0%' stop-color='#0a1b5a'/>
          <stop offset='55%' stop-color='#071237'/>
          <stop offset='100%' stop-color='#040818'/>
        </radialGradient>
      </defs>
      <rect width='1600' height='900' fill='url(#bg)' />
      <circle cx='200'  cy='440' r='140' fill='rgba(255,182,72,0.24)' />
      <circle cx='560'  cy='345' r='65'  fill='rgba(255,155,120,0.20)' />
      <circle cx='830'  cy='320' r='75'  fill='rgba(255,90,64,0.20)' />
      <circle cx='640'  cy='475' r='72'  fill='rgba(112,162,255,0.22)' />
      <circle cx='550'  cy='610' r='58'  fill='rgba(186,120,255,0.22)' />
      <circle cx='860'  cy='635' r='120' fill='rgba(132,90,255,0.18)' />
      <circle cx='1090' cy='395' r='90'  fill='rgba(126,162,255,0.20)' />
      <circle cx='1300' cy='600' r='88'  fill='rgba(153,243,255,0.20)' />
      <circle cx='1380' cy='402' r='70'  fill='rgba(88,145,255,0.22)' />
      <circle cx='1535' cy='595' r='55'  fill='rgba(176,135,255,0.24)' />
    </svg>
  `);

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildEmpty(): PlanetSettings {
  return Object.fromEntries(
    PORTALS.map((p) => [p.id, { url: p.url, videoUrl: p.videoUrl }])
  ) as PlanetSettings;
}

function loadSettings(): PlanetSettings {
  if (typeof window === 'undefined') return buildEmpty();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return buildEmpty();
  try {
    return { ...buildEmpty(), ...(JSON.parse(raw) as Partial<PlanetSettings>) };
  } catch {
    return buildEmpty();
  }
}

function saveSettings(s: PlanetSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ── Twinkling star layer ──────────────────────────────────────────────────────

const STARS = Array.from({ length: 140 }, (_, i) => ({
  id: i,
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  size: Math.random() < 0.12 ? Math.random() * 2 + 2 : Math.random() * 1.4 + 0.6,
  bright: Math.random() < 0.12,
  duration: `${2.8 + Math.random() * 4}s`,
  delay: `${Math.random() * 6}s`,
}));

// ── Component ────────────────────────────────────────────────────────────────

export default function PortalMap() {
  const [settings, setSettings]     = useState<PlanetSettings>(loadSettings);
  const [activeVideo, setActiveVideo] = useState<{ url: string; targetUrl: string } | null>(null);
  const [showAdmin, setShowAdmin]   = useState(false);
  const [draft, setDraft]           = useState<PlanetSettings>(settings);
  const [hoveredId, setHoveredId]   = useState<PortalPermissionKey | null>(null);

  // ── Planet click ────────────────────────────────────────────────────────
  const handlePlanetClick = (planet: PortalDef) => {
    if (planet.id === 'admin') {
      setDraft({ ...settings });
      setShowAdmin(true);
      return;
    }
    const conf = settings[planet.id];
    if (!conf?.url) return;
    if (conf.videoUrl) {
      setActiveVideo({ url: conf.videoUrl, targetUrl: conf.url });
    } else {
      window.open(conf.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleVideoEnd = () => {
    if (!activeVideo) return;
    window.open(activeVideo.targetUrl, '_blank', 'noopener,noreferrer');
    setActiveVideo(null);
  };

  // ── Admin helpers ────────────────────────────────────────────────────────
  const handleVideoUpload = (id: PortalPermissionKey, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((prev) => ({ ...prev, [id]: { ...prev[id], videoUrl: String(reader.result || '') } }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setSettings(draft);
    saveSettings(draft);
    setShowAdmin(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="portal-artwork-scene">
      {/* Background artwork */}
      <img src={artworkDataUri} alt="Occu-Med solar system" className="portal-artwork" />

      {/* Star field */}
      {STARS.map((s) => (
        <span
          key={s.id}
          className={`star${s.bright ? ' star-bright' : ''}`}
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            '--duration': s.duration,
            '--delay': s.delay,
          } as React.CSSProperties}
        />
      ))}

      {/* Planet hotspots */}
      {PORTALS.map((planet) => {
        const isHovered = hoveredId === planet.id;
        return (
          <motion.button
            key={planet.id}
            className="planet-hotspot"
            style={{
              left: `${planet.x}%`,
              top: `${planet.y}%`,
              width: `${planet.size}vmin`,
              height: `${planet.size}vmin`,
              '--planet-glow': planet.glow,
            } as React.CSSProperties}
            whileHover={{ scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            onClick={() => handlePlanetClick(planet)}
            onHoverStart={() => setHoveredId(planet.id)}
            onHoverEnd={() => setHoveredId(null)}
            aria-label={planet.label}
          >
            {/* Ambient bloom — always visible, pulses */}
            <span
              className="ambient-bloom"
              style={{
                position: 'absolute',
                inset: '-18%',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${planet.glow}55 0%, ${planet.glow}00 70%)`,
                pointerEvents: 'none',
                '--bloom-duration': `${3.5 + Math.random() * 2}s`,
                '--bloom-delay': `${Math.random() * 3}s`,
              } as React.CSSProperties}
            />

            {/* Hover glow ring */}
            <span
              className="planet-hotspot-glow"
              style={{ opacity: isHovered ? 1 : 0 }}
            />

            {/* Label — appears on hover with luminous text */}
            <span
              className="planet-hotspot-label"
              style={{
                opacity: isHovered ? 1 : 0,
                textShadow: isHovered
                  ? `0 0 8px #fff, 0 0 18px ${planet.glow}, 0 0 40px ${planet.glow}`
                  : 'none',
                transition: 'opacity 0.25s ease, text-shadow 0.25s ease',
              }}
            >
              {planet.label}
            </span>
          </motion.button>
        );
      })}

      {/* Transition video overlay */}
      {activeVideo && (
        <div className="video-overlay">
          <video
            src={activeVideo.url}
            controls
            autoPlay
            onEnded={handleVideoEnd}
            className="video-player"
          />
          <button className="video-close" onClick={() => setActiveVideo(null)}>✕ Close</button>
        </div>
      )}

      {/* Admin panel (opened by clicking Pluto/Admin) */}
      {showAdmin && (
        <div className="admin-overlay">
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2>🪐 Admin Panel</h2>
              <p>Configure the Render link and transition video for each planet.</p>
            </div>
            <div className="admin-grid">
              {PORTALS.map((p) => (
                <div key={p.id} className="admin-card">
                  <strong style={{ color: p.glow }}>{p.label}</strong>
                  <label>Render URL</label>
                  <input
                    type="url"
                    placeholder="https://your-app.onrender.com"
                    value={draft[p.id].url}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [p.id]: { ...prev[p.id], url: e.target.value } }))
                    }
                  />
                  <label>Transition Video URL</label>
                  <input
                    type="url"
                    placeholder="https://...video.mp4"
                    value={draft[p.id].videoUrl.startsWith('data:') ? '' : draft[p.id].videoUrl}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [p.id]: { ...prev[p.id], videoUrl: e.target.value } }))
                    }
                  />
                  <label>Or upload video file</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleVideoUpload(p.id, e.target.files?.[0] ?? null)}
                  />
                </div>
              ))}
            </div>
            <div className="admin-actions">
              <button className="admin-btn-cancel" onClick={() => setShowAdmin(false)}>Cancel</button>
              <button className="admin-btn-save" onClick={handleSave}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
