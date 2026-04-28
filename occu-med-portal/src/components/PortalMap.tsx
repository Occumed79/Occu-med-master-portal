import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PORTALS, STORAGE_KEY, OPENING_VIDEO_KEY, type PortalDef, type PortalPermissionKey } from '../lib/config';
import { loadPortalState, savePortalState } from '../lib/portalBackend';

interface PlanetSetting { url: string; videoUrl: string; }
type PlanetSettings = Record<PortalPermissionKey, PlanetSetting>;
type AdminTab = 'planets' | 'users' | 'launch';
type ManagedUser = { email: string; role: 'Admin' | 'User'; permissions: PortalPermissionKey[] };
type LaunchState = { iframeUrl: string; videoUrl: string | null; label: string; glow: string; videoOver: boolean; };

const ARTWORK_SRC = '/assets/portal-solar-system-bg.mp4';
const CLICK_SOUND_SRC = '/assets/portal-hover-swoosh.mp3';
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? '';
const USERS_KEY = 'occu_med_portal_users_v1';
const AUDIO_KEY = 'occu-med-startup-audio-url';

function buildEmpty(): PlanetSettings {
  return Object.fromEntries(PORTALS.map((p) => [p.id, { url: p.url, videoUrl: p.videoUrl }])) as PlanetSettings;
}

function loadSettings(): PlanetSettings {
  if (typeof window === 'undefined') return buildEmpty();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return buildEmpty();
  try { return { ...buildEmpty(), ...(JSON.parse(raw) as Partial<PlanetSettings>) }; } catch { return buildEmpty(); }
}
function saveSettings(s: PlanetSettings) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
function loadUsers(): ManagedUser[] {
  const fallback = [{ email: ADMIN_EMAIL || 'admin@occu-med.com', role: 'Admin' as const, permissions: PORTALS.map((p) => p.permissionKey) }];
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return fallback;
  try { return JSON.parse(raw) as ManagedUser[]; } catch { return fallback; }
}
function playClickSound() {
  try {
    const audio = new Audio(CLICK_SOUND_SRC);
    audio.volume = 0.38;
    void audio.play();
  } catch {}
}

export default function PortalMap() {
  const [settings, setSettings] = useState<PlanetSettings>(loadSettings);
  const [launch, setLaunch] = useState<LaunchState | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [draft, setDraft] = useState<PlanetSettings>(settings);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminTab, setAdminTab] = useState<AdminTab>('planets');
  const [users, setUsers] = useState<ManagedUser[]>(loadUsers);
  const [inviteEmail, setInviteEmail] = useState('');
  const [openingVideoUrl, setOpeningVideoUrl] = useState(() => typeof window !== 'undefined' ? localStorage.getItem(OPENING_VIDEO_KEY) ?? '' : '');
  const [audioUrl, setAudioUrl] = useState(() => typeof window !== 'undefined' ? localStorage.getItem(AUDIO_KEY) ?? '' : '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    async function hydrateFromBackend() {
      const backendState = await loadPortalState();
      if (!mounted || !backendState) return;

      if (backendState.settings) {
        setSettings((prev) => ({ ...prev, ...backendState.settings }));
        setDraft((prev) => ({ ...prev, ...backendState.settings }));
      }

      if (backendState.users) {
        setUsers(backendState.users);
      }

      if (typeof backendState.openingVideoUrl === 'string') {
        setOpeningVideoUrl(backendState.openingVideoUrl);
      }

      if (typeof backendState.audioUrl === 'string') {
        setAudioUrl(backendState.audioUrl);
      }
    }

    void hydrateFromBackend();

    return () => {
      mounted = false;
    };
  }, []);

  const handlePlanetClick = (planet: PortalDef) => {
    playClickSound();
    if (planet.id === 'admin') { setDraft({ ...settings }); setAdminError(''); setShowAdmin(true); return; }
    const conf = settings[planet.id];
    if (!conf?.url) return;
    setLaunch({ iframeUrl: conf.url, videoUrl: conf.videoUrl || null, label: planet.label, glow: planet.glow, videoOver: !conf.videoUrl });
  };
  const handleVideoEnd = () => { if (launch) setLaunch((prev) => prev ? { ...prev, videoOver: true } : null); };
  const handleVideoUpload = (id: PortalPermissionKey, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraft((prev) => ({ ...prev, [id]: { ...prev[id], videoUrl: String(reader.result || '') } }));
    reader.readAsDataURL(file);
  };
  const handleOpeningVideoUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setOpeningVideoUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      const payload = {
        settings: draft,
        users,
        openingVideoUrl,
        audioUrl,
      };

      await savePortalState(payload);
      setSettings(draft);
      saveSettings(draft);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      localStorage.setItem(OPENING_VIDEO_KEY, openingVideoUrl);
      localStorage.setItem(AUDIO_KEY, audioUrl);
      setSaveMessage('Saved successfully.');
      setShowAdmin(false);
    } catch (error) {
      console.error(error);
      setSettings(draft);
      saveSettings(draft);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      localStorage.setItem(OPENING_VIDEO_KEY, openingVideoUrl);
      localStorage.setItem(AUDIO_KEY, audioUrl);
      setSaveMessage('Backend save failed. Saved locally only.');
      alert('Backend save failed. Saved locally only.');
    } finally {
      setIsSaving(false);
    }
  };
  const handleAdminLogin = () => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) { setAdminError('Admin credentials are not configured in Render environment variables.'); return; }
    if (adminEmail.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && adminPassword === ADMIN_PASSWORD) { setAdminUnlocked(true); setAdminError(''); setAdminEmail(''); setAdminPassword(''); return; }
    setAdminError('Incorrect email or password.');
  };
  const addUser = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setUsers((cur) => cur.some((u) => u.email === email) ? cur : [...cur, { email, role: 'User', permissions: [] }]);
    setInviteEmail('');
  };
  const togglePermission = (email: string, permission: PortalPermissionKey) => setUsers((cur) => cur.map((u) => u.email !== email ? u : { ...u, permissions: u.permissions.includes(permission) ? u.permissions.filter((p) => p !== permission) : [...u.permissions, permission] }));
  const toggleRole = (email: string) => setUsers((cur) => cur.map((u) => u.email === email ? { ...u, role: u.role === 'Admin' ? 'User' : 'Admin' } : u));

  return (
    <div className="portal-artwork-scene">
      <video src={ARTWORK_SRC} className="portal-artwork" autoPlay muted loop playsInline preload="auto" />
      {PORTALS.map((planet) => (
        <motion.button key={planet.id} className="planet-hotspot" style={{ left: `${planet.x}%`, top: `${planet.y}%`, width: `${planet.size}vmin`, height: `${planet.size}vmin` } as React.CSSProperties} whileHover={{ scale: 1.01 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} onClick={() => handlePlanetClick(planet)} aria-label={planet.label} title={planet.label} />
      ))}
      {launch && <div className="portal-launch-overlay"><iframe src={launch.iframeUrl} title={launch.label} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', opacity: launch.videoOver ? 1 : 0, transition: 'opacity 0.8s ease', zIndex: 1 }} allow="fullscreen" />{!launch.videoOver && <div className="portal-launch-loading">{launch.videoUrl ? <video src={launch.videoUrl} autoPlay playsInline onEnded={handleVideoEnd} className="portal-launch-video" /> : <div style={{ textAlign: 'center', zIndex: 3 }}><div className="launch-title" style={{ textShadow: `0 0 20px ${launch.glow}, 0 0 70px ${launch.glow}` }}>{launch.label}</div><div className="launch-subtitle">Portal waking up...</div></div>}</div>}<button onClick={launch.videoOver ? () => setLaunch(null) : handleVideoEnd} className="portal-close-button">{launch.videoOver ? 'Close' : 'Skip'}</button></div>}
      {showAdmin && <div className="admin-overlay"><div className="admin-panel admin-panel-wide">{!adminUnlocked ? <div className="admin-login-card"><p className="admin-kicker">Occu-Med Secure Portal</p><h2>Admin Access Required</h2><p className="admin-login-help">Sign in to configure the full portal command center.</p><label>Email</label><input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()} placeholder="name@occu-med.com" /><label>Password</label><input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()} placeholder="Password" />{adminError && <div className="admin-error">{adminError}</div>}<div className="admin-actions"><button className="admin-btn-cancel" onClick={() => setShowAdmin(false)}>Cancel</button><button className="admin-btn-save" onClick={handleAdminLogin}>Unlock Admin</button></div></div> : <><div className="admin-panel-header"><h2>Admin Command Center</h2><p>One locked panel for planet links, users, permissions, and launch settings.</p>{saveMessage && <div className="admin-save-message">{saveMessage}</div>}</div><div className="admin-tabs"><button className={adminTab === 'planets' ? 'active' : ''} onClick={() => setAdminTab('planets')}>Planet Portals</button><button className={adminTab === 'users' ? 'active' : ''} onClick={() => setAdminTab('users')}>Users & Permissions</button><button className={adminTab === 'launch' ? 'active' : ''} onClick={() => setAdminTab('launch')}>Launch Experience</button></div>{adminTab === 'planets' && <div className="admin-grid admin-grid-wide">{PORTALS.map((p) => <div key={p.id} className="admin-card"><strong style={{ color: p.glow }}>{p.label}</strong><label>Render URL</label><input type="url" placeholder="https://your-app.onrender.com" value={draft[p.id].url} onChange={(e) => setDraft((prev) => ({ ...prev, [p.id]: { ...prev[p.id], url: e.target.value } }))} /><label>Transition Video URL</label><input type="url" placeholder="https://...video.mp4" value={draft[p.id].videoUrl.startsWith('data:') ? '' : draft[p.id].videoUrl} onChange={(e) => setDraft((prev) => ({ ...prev, [p.id]: { ...prev[p.id], videoUrl: e.target.value } }))} /><label>Or upload video file</label><input type="file" accept="video/*" onChange={(e) => handleVideoUpload(p.id, e.target.files?.[0] ?? null)} /></div>)}</div>}{adminTab === 'users' && <div className="admin-users"><div className="admin-invite"><input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addUser()} placeholder="name@occu-med.com" /><button className="admin-btn-save" onClick={addUser}>Add User</button></div>{users.map((u) => <div className="admin-user-row" key={u.email}><div><strong>{u.email}</strong><button onClick={() => toggleRole(u.email)}>{u.role}</button></div><div className="admin-permission-grid">{PORTALS.map((p) => <button key={p.id} className={u.permissions.includes(p.permissionKey) ? 'enabled' : ''} onClick={() => togglePermission(u.email, p.permissionKey)} style={{ '--portal-color': p.glow } as React.CSSProperties}>{p.label}</button>)}</div></div>)}</div>}{adminTab === 'launch' && <div className="admin-launch"><label>Opening Video URL</label><input value={openingVideoUrl.startsWith('data:') ? '' : openingVideoUrl} onChange={(e) => setOpeningVideoUrl(e.target.value)} placeholder="https://...opening.mp4" /><label>Or upload opening video</label><input type="file" accept="video/*" onChange={(e) => handleOpeningVideoUpload(e.target.files?.[0] ?? null)} /><label>Startup Audio URL</label><input value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://...ambient.mp3" /></div>}<div className="admin-actions"><button className="admin-btn-cancel" onClick={() => setShowAdmin(false)}>Cancel</button><button className="admin-btn-save" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button></div></>}</div></div>}
    </div>
  );
}
