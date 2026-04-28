import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PORTALS, STORAGE_KEY, OPENING_VIDEO_KEY, type PortalPermissionKey } from '../lib/config';
import { supabase } from '../lib/supabase';
import { uploadPortalAsset } from '../lib/portalBackend';
import { useAuth } from '../hooks/useAuth';

type ManagedUser = {
  id?: string;
  email: string;
  role: 'Admin' | 'User';
  permissions: PortalPermissionKey[];
};

const previewUsers: ManagedUser[] = [
  { email: 'admin@occu-med.example',         role: 'Admin', permissions: PORTALS.map((p) => p.permissionKey) },
  { email: 'operations@occu-med.example',    role: 'User',  permissions: ['operations', 'network', 'exam_qa'] },
  { email: 'staff@occu-med.example',         role: 'User',  permissions: ['scheduling', 'harvesting'] },
];

export default function Admin() {
  const { isLive, user, loading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  // ── State ──────────────────────────────────────────────────────────────
  const [users, setUsers]           = useState<ManagedUser[]>(previewUsers);
  const [inviteEmail, setInviteEmail] = useState('');
  const [audioUrl, setAudioUrl]     = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('occu-med-startup-audio-url') ?? '' : ''
  );
  const [openingVideoUrl, setOpeningVideoUrl] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem(OPENING_VIDEO_KEY) ?? '' : ''
  );
  const [saving, setSaving]         = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage]       = useState('');
  const [activeTab, setActiveTab]   = useState<'users' | 'portals' | 'launch'>('users');

  const canManage = useMemo(() => !isLive || isAdmin, [isLive, isAdmin]);

  // ── Auth guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    if (isLive && !user) { setLocation('/login'); return; }
    if (isLive && user && !isAdmin) {
      setMessage('This account is signed in but does not have Admin role access.');
    }
  }, [isLive, isAdmin, loading, setLocation, user]);

  // ── Load users from Supabase ───────────────────────────────────────────
  useEffect(() => {
    if (!isLive || !supabase || !isAdmin) return;
    supabase
      .from('portal_users')
      .select('id, email, role, permissions')
      .order('email')
      .then(({ data, error }) => {
        if (error) {
          setMessage('Create the portal_users table in Supabase to enable live user management.');
          return;
        }
        if (data) {
          setUsers(data.map((row) => ({
            id:          row.id,
            email:       row.email,
            role:        row.role === 'Admin' ? 'Admin' : 'User',
            permissions: Array.isArray(row.permissions) ? row.permissions : [],
          })));
        }
      });
  }, [isLive, isAdmin]);

  // ── Actions ────────────────────────────────────────────────────────────
  const inviteUser = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    const next: ManagedUser = { email, role: 'User', permissions: [] };
    setUsers((cur) => (cur.some((e) => e.email === email) ? cur : [...cur, next]));
    setInviteEmail('');
    setMessage(
      isLive
        ? 'Invitation staged — save to persist, then Supabase will send the sign-in email.'
        : 'Preview invite added locally.'
    );
    if (isLive && supabase) {
      await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    }
  };

  const removeUser = (email: string) => {
    if (!canManage) return;
    setUsers((cur) => cur.filter((e) => e.email !== email));
  };

  const togglePermission = (email: string, permission: PortalPermissionKey) => {
    if (!canManage) return;
    setUsers((cur) =>
      cur.map((entry) => {
        if (entry.email !== email) return entry;
        const has = entry.permissions.includes(permission);
        return {
          ...entry,
          permissions: has
            ? entry.permissions.filter((item) => item !== permission)
            : [...entry.permissions, permission],
        };
      })
    );
  };

  const toggleRole = (email: string) => {
    if (!canManage) return;
    setUsers((cur) =>
      cur.map((entry) =>
        entry.email === email
          ? { ...entry, role: entry.role === 'Admin' ? 'User' : 'Admin' }
          : entry
      )
    );
  };

  const grantAll = (email: string) => {
    if (!canManage) return;
    setUsers((cur) =>
      cur.map((e) => e.email === email ? { ...e, permissions: PORTALS.map((p) => p.permissionKey) } : e)
    );
  };

  const revokeAll = (email: string) => {
    if (!canManage) return;
    setUsers((cur) =>
      cur.map((e) => e.email === email ? { ...e, permissions: [] } : e)
    );
  };

  const saveChanges = async () => {
    setSaving(true);
    setMessage('');
    try {
      if (isLive && supabase) {
        const { error } = await supabase.from('portal_users').upsert(users, { onConflict: 'email' });
        if (error) throw error;
      }
      localStorage.setItem('occu-med-startup-audio-url', audioUrl);
      localStorage.setItem(OPENING_VIDEO_KEY, openingVideoUrl);
      setMessage(isLive ? '✅ Settings saved to Supabase.' : '✅ Preview settings saved locally.');
    } catch {
      setMessage('❌ Unable to save. Check Supabase table and RLS policy setup.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpeningVideoUpload = async (file: File | null) => {
    if (!file) return;
    setMessage('');
    setIsUploading(true);
    try {
      const publicUrl = await uploadPortalAsset(file, 'opening');
      setOpeningVideoUrl(publicUrl);
      setMessage('✅ Opening video uploaded successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setMessage(`Opening video upload failed: ${msg}. Make sure the "portal-assets" bucket exists in Supabase Storage with public access enabled.`);
    } finally {
      setIsUploading(false);
    }
  };

  // Planet settings from localStorage
  const planetSettings: Record<string, { url: string; videoUrl: string }> | null = (() => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  })();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading command center...
      </div>
    );
  }

  // ── Tab styles ─────────────────────────────────────────────────────────
  const tabStyle = (t: typeof activeTab) => ({
    padding: '0.5rem 1.25rem',
    borderRadius: '999px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    transition: 'all 0.2s ease',
    background: activeTab === t ? 'rgba(103,232,249,0.2)' : 'rgba(255,255,255,0.05)',
    color: activeTab === t ? '#67e8f9' : 'rgba(255,255,255,0.55)',
    boxShadow: activeTab === t ? '0 0 16px rgba(103,232,249,0.25)' : 'none',
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#18244f_0%,#03040a_45%,#000_100%)] p-6 text-white md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/70">Occu-Med Secure Portal</p>
            <h1 className="mt-2 text-3xl font-bold uppercase tracking-[0.18em] md:text-4xl">Admin Command Center</h1>
            <p className="mt-2 text-sm text-white/55">
              Manage users, configure planet portals, and control the launch experience.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
              ← Return to Portal
            </Button>
          </Link>
        </div>

        {/* ── Setup mode banner ── */}
        {!isLive && (
          <Card className="border-amber-300/35 bg-amber-500/10 text-white backdrop-blur-xl">
            <CardHeader>
              <CardTitle>⚠️ Setup Mode Active</CardTitle>
              <CardDescription className="text-amber-100/75">
                Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable live Supabase Auth.
                Create a <code>portal_users</code> table with <code>email</code>, <code>role</code>, and <code>permissions</code> columns.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* ── Message ── */}
        {message && (
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/80 backdrop-blur-xl">
            {message}
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button style={tabStyle('users')}   onClick={() => setActiveTab('users')}>👥 User Management</button>
          <button style={tabStyle('portals')} onClick={() => setActiveTab('portals')}>🌍 Planet Portals</button>
          <button style={tabStyle('launch')}  onClick={() => setActiveTab('launch')}>🎬 Launch Experience</button>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            TAB: USER MANAGEMENT
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl">
              <CardHeader>
                <CardTitle>Invite User</CardTitle>
                <CardDescription className="text-white/55">
                  Invite someone by email. They'll get a magic sign-in link via Supabase.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 md:flex-row">
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && inviteUser()}
                    placeholder="name@occu-med.com"
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-200/50"
                  />
                  <Button onClick={inviteUser} disabled={!canManage} className="bg-white text-black hover:bg-cyan-100">
                    Invite by Email
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl">
              <CardHeader>
                <CardTitle>User Permissions</CardTitle>
                <CardDescription className="text-white/55">
                  All planets are always visible. These toggles control whether clicking a planet works for each user.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
                          User
                        </th>
                        <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
                          Role
                        </th>
                        {PORTALS.map((portal) => (
                          <th key={portal.id} style={{ padding: '0.75rem 0.25rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', color: portal.glow }}>
                            {portal.label}
                          </th>
                        ))}
                        <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((mu) => (
                        <tr key={mu.email} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {mu.email}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                            <button
                              onClick={() => toggleRole(mu.email)}
                              disabled={!canManage}
                              style={{
                                borderRadius: '999px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: mu.role === 'Admin' ? 'rgba(103,232,249,0.15)' : 'rgba(255,255,255,0.05)',
                                color: mu.role === 'Admin' ? '#67e8f9' : 'rgba(255,255,255,0.6)',
                                padding: '0.2rem 0.6rem',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              {mu.role}
                            </button>
                          </td>
                          {PORTALS.map((portal) => {
                            const checked = mu.permissions.includes(portal.permissionKey);
                            return (
                              <td key={portal.id} style={{ padding: '0.75rem 0.25rem', textAlign: 'center' }}>
                                <button
                                  onClick={() => togglePermission(mu.email, portal.permissionKey)}
                                  disabled={!canManage}
                                  style={{
                                    width: '36px',
                                    height: '20px',
                                    borderRadius: '999px',
                                    border: checked ? `1px solid ${portal.glow}88` : '1px solid rgba(255,255,255,0.15)',
                                    background: checked ? `${portal.glow}44` : 'rgba(255,255,255,0.05)',
                                    boxShadow: checked ? `0 0 10px ${portal.glow}55` : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'block',
                                    margin: '0 auto',
                                  }}
                                  aria-label={`${mu.email} ${portal.label} access`}
                                />
                              </td>
                            );
                          })}
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                              <button
                                onClick={() => grantAll(mu.email)}
                                disabled={!canManage}
                                title="Grant all access"
                                style={{ background: 'rgba(103,232,249,0.1)', border: '1px solid rgba(103,232,249,0.3)', color: '#67e8f9', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.65rem', cursor: 'pointer' }}
                              >All ✓</button>
                              <button
                                onClick={() => revokeAll(mu.email)}
                                disabled={!canManage}
                                title="Revoke all access"
                                style={{ background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.3)', color: '#f87171', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.65rem', cursor: 'pointer' }}
                              >None ✗</button>
                              <button
                                onClick={() => removeUser(mu.email)}
                                disabled={!canManage}
                                title="Remove user"
                                style={{ background: 'rgba(255,100,100,0.08)', border: '1px solid rgba(255,100,100,0.2)', color: 'rgba(248,113,113,0.7)', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.65rem', cursor: 'pointer' }}
                              >🗑</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button onClick={saveChanges} disabled={saving || isUploading || !canManage} className="bg-white text-black hover:bg-cyan-100">
                    {saving ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB: PLANET PORTALS
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'portals' && (
          <Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl">
            <CardHeader>
              <CardTitle>🌍 Planet Portal Configuration</CardTitle>
              <CardDescription className="text-white/55">
                These are the Render links and transition videos configured per planet.
                To edit them, click <strong>Pluto (Admin)</strong> on the solar system map —
                or update them here and save.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {PORTALS.map((portal) => {
                  const saved = planetSettings?.[portal.id];
                  return (
                    <div
                      key={portal.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            background: portal.glow,
                            boxShadow: `0 0 8px ${portal.glow}`,
                            flexShrink: 0,
                          }}
                        />
                        <span className="font-bold text-sm" style={{ color: portal.glow }}>
                          {portal.label}
                        </span>
                      </div>
                      <div className="grid gap-1 text-xs text-white/50">
                        <div className="flex gap-2">
                          <span className="text-white/30 w-20 flex-shrink-0">Render URL:</span>
                          <span className="truncate text-white/70">
                            {saved?.url || <span className="text-red-400/60 italic">Not configured</span>}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-white/30 w-20 flex-shrink-0">Video:</span>
                          <span className="truncate text-white/70">
                            {saved?.videoUrl
                              ? (saved.videoUrl.startsWith('data:')
                                  ? <span className="text-amber-400/70 italic">⚠️ Stored as data URL — re-upload to fix</span>
                                  : <a href={saved.videoUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400/80 hover:text-cyan-300 underline truncate">{saved.videoUrl}</a>
                                )
                              : <span className="italic">None (goes direct to portal)</span>
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-white/30">
                💡 To configure URLs and videos, click the <strong>Pluto (Admin)</strong> planet on the map.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB: LAUNCH EXPERIENCE
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'launch' && (
          <div className="space-y-6">
            <Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl">
              <CardHeader>
                <CardTitle>🎬 Opening Theme Video</CardTitle>
                <CardDescription className="text-white/55">
                  Plays full-screen when someone first opens the portal. Once it ends (or they skip it), the solar system appears.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs text-white/40 mb-2">Video URL (YouTube, CDN, etc.)</label>
                  <input
                    value={openingVideoUrl.startsWith('data:') ? '' : openingVideoUrl}
                    placeholder="https://...opening.mp4"
                    onChange={(e) => setOpeningVideoUrl(e.target.value)}
                    placeholder="https://.../opening-theme.mp4"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-200/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-2">Or upload a video file</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => void handleOpeningVideoUpload(e.target.files?.[0] ?? null)}
                    disabled={isUploading}
                    className="text-xs text-white/60"
                  />
                </div>
                {openingVideoUrl && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-green-400/80">
                      {isUploading ? '⏳ Uploading...' : openingVideoUrl.startsWith('data:') ? '⚠️ Data URL — re-upload to use Supabase Storage' : '✅ Video ready'}
                    </span>
                    <button
                      onClick={() => setOpeningVideoUrl('')}
                      className="text-xs text-red-400/60 hover:text-red-400"
                    >
                      Remove ✕
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl">
              <CardHeader>
                <CardTitle>🔊 Startup Audio</CardTitle>
                <CardDescription className="text-white/55">
                  Optional ambient audio that plays when the portal loads.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://.../startup.mp3"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-200/50"
                />
              </CardContent>
            </Card>

            <Button onClick={saveChanges} disabled={saving || !canManage} className="w-full bg-white text-black hover:bg-cyan-100">
              {saving ? 'Saving...' : 'Save Launch Settings'}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}

