import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { PORTALS, STORAGE_KEY, type PortalDef, type PortalPermissionKey } from '../lib/config';

interface PlanetSetting {
  url: string;
  videoUrl: string;
}
type PlanetSettings = Record<PortalPermissionKey, PlanetSetting>;

const ARTWORK_SRC = '/assets/portal-solar-system-final.jpg';
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? '';

function buildEmpty(): PlanetSettings {
  return Object.fromEntries(PORTALS.map((p) => [p.id, { url: p.url, videoUrl: p.videoUrl }])) as PlanetSettings;
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

const STARS = Array.from({ length: 320 }, (_, i) => ({
  id: i,
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  size: Math.random() < 0.2 ? Math.random() * 2.5 + 2 : Math.random() * 1.2 + 0.5,
  bright: Math.random() < 0.25,
  duration: `${1.8 + Math.random() * 3}s`,
  delay: `${Math.random() * 5}s`,
}));

type LaunchState = {
  iframeUrl: string;
  videoUrl: string | null;
  label: string;
  glow: string;
  videoOver: boolean;
};

export default function PortalMap() {
  const [settings, setSettings] = useState<PlanetSettings>(loadSettings);
  const [launch, setLaunch] = useState<LaunchState | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [draft, setDraft] = useState<PlanetSettings>(settings);
  const [hoveredId, setHoveredId] = useState<PortalPermissionKey | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const sceneRef = useRef<HTMLDivElement>(null);

  const openAdminPanel = () => {
    setDraft({ ...settings });
    setAdminError('');
    setShowAdmin(true);
  };

  const handlePlanetClick = (planet: PortalDef) => {
    if (planet.id === 'admin') {
      openAdminPanel();
      return;
    }
    const conf = settings[planet.id];
    if (!conf?.url) return;

    setLaunch({
      iframeUrl: conf.url,
      videoUrl: conf.videoUrl || null,
      label: planet.label,
      glow: planet.glow,
      videoOver: !conf.videoUrl,
    });
  };

  const handleVideoEnd = () => {
    if (!launch) return;
    setLaunch((prev) => prev ? { ...prev, videoOver: true } : null);
  };

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

  const handleAdminLogin = () => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      setAdminError('Admin credentials are not configured in Render environment variables.');
      return;
    }
    if (adminEmail.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && adminPassword === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
      setAdminError('');
      setAdminEmail('');
      setAdminPassword('');
      return;
    }
    setAdminError('Incorrect email or password.');
  };

  return (
    <div ref={sceneRef} className="portal-artwork-scene">
      <img src={ARTWORK_SRC} alt="Occu-Med solar system" className="portal-artwork" />

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
            <span
              className="ambient-bloom"
              style={{
                position: 'absolute',
                inset: '-35%',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${planet.glow}88 0%, ${planet.glow}00 70%)`,
                pointerEvents: 'none',
                '--bloom-duration': `${3.5 + (planet.x % 2)}s`,
                '--bloom-delay': `${(planet.y % 3) * 0.4}s`,
              } as React.CSSProperties}
            />
            <span
              className="planet-hotspot-glow"
              style={{
                opacity: isHovered ? 1 : 0,
                boxShadow: `0 0 42px 12px ${planet.glow}dd, 0 0 92px 28px ${planet.glow}77`,
                transition: 'opacity 0.2s ease, box-shadow 0.2s ease',
              }}
            />
            <span
              className="planet-hotspot-label"
              style={{
                opacity: isHovered ? 1 : 0,
                color: '#ffffff',
                textShadow: isHovered
                  ? `0 0 8px #fff, 0 0 18px ${planet.glow}, 0 0 44px ${planet.glow}, 0 0 90px ${planet.glow}`
                  : 'none',
                transition: 'opacity 0.22s ease, text-shadow 0.22s ease',
                fontSize: 'clamp(10px, 1.4vw, 22px)',
                fontWeight: 900,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {planet.label}
            </span>
          </motion.button>
        );
      })}

      {launch && (
        <div className="portal-launch-overlay">
          <iframe
            src={launch.iframeUrl}
            title={launch.label}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', opacity: launch.videoOver ? 1 : 0, transition: 'opacity 0.8s ease', zIndex: 1 }}
            allow="fullscreen"
          />
          {!launch.videoOver && (
            <div className="portal-launch-loading">
              {launch.videoUrl ? (
                <video src={launch.videoUrl} autoPlay playsInline onEnded={handleVideoEnd} className="portal-launch-video" />
              ) : (
                <div style={{ textAlign: 'center', zIndex: 3 }}>
                  <div className="launch-title" style={{ textShadow: `0 0 20px ${launch.glow}, 0 0 70px ${launch.glow}` }}>{launch.label}</div>
                  <div className="launch-subtitle">Portal waking up...</div>
                </div>
              )}
            </div>
          )}
          <button onClick={launch.videoOver ? () => setLaunch(null) : handleVideoEnd} className="portal-close-button">
            {launch.videoOver ? 'Close' : 'Skip'}
          </button>
        </div>
      )}

      {showAdmin && (
        <div className="admin-overlay">
          <div className="admin-panel">
            {!adminUnlocked ? (
              <div className="admin-login-card">
                <p className="admin-kicker">Occu-Med Secure Portal</p>
                <h2>Admin Access Required</h2>
                <p className="admin-login-help">Sign in to configure planet links, transition videos, and portal launch settings.</p>
                <label>Email</label>
                <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()} placeholder="name@occu-med.com" />
                <label>Password</label>
                <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()} placeholder="Password" />
                {adminError && <div className="admin-error">{adminError}</div>}
                <div className="admin-actions">
                  <button className="admin-btn-cancel" onClick={() => setShowAdmin(false)}>Cancel</button>
                  <button className="admin-btn-save" onClick={handleAdminLogin}>Unlock Admin</button>
                </div>
              </div>
            ) : (
              <>
                <div className="admin-panel-header">
                  <h2>Admin Command Center</h2>
                  <p>Configure every planet from this one locked panel. The full admin route is also available at <a href="/admin" style={{ color: '#9ef7ff' }}>Admin Command Center</a>.</p>
                </div>
                <div className="admin-grid">
                  {PORTALS.map((p) => (
                    <div key={p.id} className="admin-card">
                      <strong style={{ color: p.glow }}>{p.label}</strong>
                      <label>Render URL</label>
                      <input type="url" placeholder="https://your-app.onrender.com" value={draft[p.id].url} onChange={(e) => setDraft((prev) => ({ ...prev, [p.id]: { ...prev[p.id], url: e.target.value } }))} />
                      <label>Transition Video URL</label>
                      <input type="url" placeholder="https://...video.mp4" value={draft[p.id].videoUrl.startsWith('data:') ? '' : draft[p.id].videoUrl} onChange={(e) => setDraft((prev) => ({ ...prev, [p.id]: { ...prev[p.id], videoUrl: e.target.value } }))} />
                      <label>Or upload video file</label>
                      <input type="file" accept="video/*" onChange={(e) => handleVideoUpload(p.id, e.target.files?.[0] ?? null)} />
                    </div>
                  ))}
                </div>
                <div className="admin-actions">
                  <button className="admin-btn-cancel" onClick={() => setShowAdmin(false)}>Cancel</button>
                  <button className="admin-btn-save" onClick={handleSave}>Save Changes</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
