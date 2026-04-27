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

// Artwork served from public/assets/
const ARTWORK_SRC = '/assets/portal-solar-system-final.jpg';

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

// ── Portal launcher state ────────────────────────────────────────────────────
// When a planet is clicked:
//  1. iframeUrl is set  → iframe starts loading the Render app silently in background
//  2. videoUrl is set   → video overlay plays on top
//  3. video ends        → video fades out, iframe becomes fully visible (app is warm)
//  4. if no video       → iframe becomes immediately visible

type LaunchState = {
  iframeUrl: string;       // Render link loading silently
  videoUrl: string | null; // transition video (null = no video, skip straight to iframe)
  label: string;           // planet name for the loading screen
  glow: string;            // planet glow colour
  videoOver: boolean;      // true once video has ended / been skipped
};

// ── Component ────────────────────────────────────────────────────────────────

export default function PortalMap() {
  const [settings, setSettings]       = useState<PlanetSettings>(loadSettings);
  const [launch, setLaunch]           = useState<LaunchState | null>(null);
  const [showAdmin, setShowAdmin]     = useState(false);
  const [draft, setDraft]             = useState<PlanetSettings>(settings);
  const [hoveredId, setHoveredId]     = useState<PortalPermissionKey | null>(null);

  // ── Planet click ─────────────────────────────────────────────────────────
  const handlePlanetClick = (planet: PortalDef) => {
    if (planet.id === 'admin') {
      setDraft({ ...settings });
      setShowAdmin(true);
      return;
    }
    const conf = settings[planet.id];
    if (!conf?.url) return;

    // Start loading the Render app in the background immediately
    setLaunch({
      iframeUrl: conf.url,
      videoUrl: conf.videoUrl || null,
      label: planet.label,
      glow: planet.glow,
      videoOver: !conf.videoUrl, // if no video, go straight to iframe view
    });
  };

  const handleVideoEnd = () => {
    if (!launch) return;
    // Video done — reveal the (now warm) iframe
    setLaunch((prev) => prev ? { ...prev, videoOver: true } : null);
  };

  const handleCloseLaunch = () => setLaunch(null);

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
      <img src={ARTWORK_SRC} alt="Occu-Med solar system" className="portal-artwork" />

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
            {/* Ambient bloom */}
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
            {/* Label */}
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

      {/* ── Launch overlay ────────────────────────────────────────────────── */}
      {launch && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9000,
            background: '#000',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Silent iframe loading Render in background — ALWAYS mounted so it warms up */}
          <iframe
            src={launch.iframeUrl}
            title={launch.label}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              // Visible only after video ends
              opacity: launch.videoOver ? 1 : 0,
              transition: 'opacity 0.8s ease',
              zIndex: 1,
            }}
            allow="fullscreen"
          />

          {/* Loading indicator shown while iframe warms up and video plays */}
          {!launch.videoOver && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#000',
                gap: '1.5rem',
              }}
            >
              {/* Transition video */}
              {launch.videoUrl && (
                <video
                  src={launch.videoUrl}
                  autoPlay
                  playsInline
                  onEnded={handleVideoEnd}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 3,
                  }}
                />
              )}

              {/* Pulsing planet name shown if no video (or behind video as fallback) */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 4,
                  textAlign: 'center',
                  pointerEvents: 'none',
                  opacity: launch.videoUrl ? 0 : 1, // only show text when no video
                }}
              >
                <div
                  style={{
                    fontSize: 'clamp(2rem, 6vw, 5rem)',
                    fontWeight: 900,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#fff',
                    textShadow: `0 0 20px ${launch.glow}, 0 0 60px ${launch.glow}, 0 0 120px ${launch.glow}`,
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                >
                  {launch.label}
                </div>
                <div
                  style={{
                    marginTop: '1rem',
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.45)',
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                  }}
                >
                  Portal waking up...
                </div>
              </div>
            </div>
          )}

          {/* Skip / close button */}
          <button
            onClick={launch.videoOver ? handleCloseLaunch : handleVideoEnd}
            style={{
              position: 'absolute',
              bottom: '1.5rem',
              right: '1.5rem',
              zIndex: 9999,
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff',
              padding: '0.45rem 1.1rem',
              borderRadius: '999px',
              cursor: 'pointer',
              fontSize: '0.82rem',
              backdropFilter: 'blur(8px)',
              letterSpacing: '0.1em',
            }}
          >
            {launch.videoOver ? '✕ Close' : 'Skip ›'}
          </button>
        </div>
      )}

      {/* ── Admin panel (Pluto) ───────────────────────────────────────────── */}
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
