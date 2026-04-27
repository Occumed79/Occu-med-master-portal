import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PORTALS, STORAGE_KEY, OPENING_VIDEO_KEY, type PortalPermissionKey } from '../lib/config';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

type ManagedUser = {
  id?: string;
  email: string;
  role: 'Admin' | 'User';
  permissions: PortalPermissionKey[];
};

const previewUsers: ManagedUser[] = [
  { email: 'admin@occu-med.example', role: 'Admin', permissions: PORTALS.map((p) => p.permissionKey) },
  { email: 'operations@occu-med.example', role: 'User', permissions: ['operations', 'network', 'exam_qa'] },
  { email: 'staff@occu-med.example', role: 'User', permissions: ['scheduling', 'harvesting'] },
];

export default function Admin() {
  const { isLive, user, loading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<ManagedUser[]>(previewUsers);
  const [inviteEmail, setInviteEmail] = useState('');
  const [audioUrl, setAudioUrl] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('occu-med-startup-audio-url') ?? '' : ''
  );
  const [openingVideoUrl, setOpeningVideoUrl] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem(OPENING_VIDEO_KEY) ?? '' : ''
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const canManage = useMemo(() => !isLive || isAdmin, [isLive, isAdmin]);

  useEffect(() => {
    if (loading) return;
    if (isLive && !user) {
      setLocation('/login');
      return;
    }
    if (isLive && user && !isAdmin) {
      setMessage('This account is signed in but does not have Admin role access.');
    }
  }, [isLive, isAdmin, loading, setLocation, user]);

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
          setUsers(
            data.map((row) => ({
              id: row.id,
              email: row.email,
              role: row.role === 'Admin' ? 'Admin' : 'User',
              permissions: Array.isArray(row.permissions) ? row.permissions : [],
            }))
          );
        }
      });
  }, [isLive, isAdmin]);

  const inviteUser = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    const nextUser: ManagedUser = { email, role: 'User', permissions: [] };
    setUsers((cur) => (cur.some((e) => e.email === email) ? cur : [...cur, nextUser]));
    setInviteEmail('');
    setMessage(
      isLive
        ? 'Invitation staged. Save changes to persist, then Supabase will send the sign-in email.'
        : 'Preview invite added locally.'
    );
    if (isLive && supabase) {
      await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    }
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
      setMessage(isLive ? 'Settings saved to Supabase.' : 'Preview settings saved locally.');
    } catch {
      setMessage('Unable to save. Check the Supabase table and row-level security policy setup.');
    } finally {
      setSaving(false);
    }
  };

  // Load opening video from file upload
  const handleOpeningVideoUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setOpeningVideoUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  // Load planet settings from localStorage for display
  const planetSettings = (() => {
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#18244f_0%,#03040a_45%,#000_100%)] p-6 text-white md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/70">Occu-Med Secure Portal</p>
            <h1 className="mt-2 text-3xl font-bold uppercase tracking-[0.18em] md:text-4xl">Admin Command Center</h1>
            <p className="mt-2 text-sm text-white/55">
              Invite users, assign portal access, configure opening video and launch experience.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
              Return to Portal
            </Button>
          </Link>
        </div>

        {!isLive && (
          <Card className="border-amber-300/35 bg-amber-500/10 text-white backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Setup Mode Active</CardTitle>
              <CardDescription className="text-amber-100/75">
                Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable live Supabase Auth. Create a{' '}
                <code>portal_users</code> table with <code>email</code>, <code>role</code>, and{' '}
                <code>permissions</code> columns for live user management.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {message && (
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/75 backdrop-blur-xl">
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

          {/* ── User Access Table ── */}
          <Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl">
            <CardHeader>
              <CardTitle>User Access</CardTitle>
              <CardDescription className="text-white/55">
                All planets remain visible to everyone. These toggles control whether a click opens the destination.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@occu-med.com"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-200/50"
                />
                <Button onClick={inviteUser} disabled={!canManage} className="bg-white text-black hover:bg-cyan-100">
                  Invite by Email
                </Button>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[700px] overflow-hidden rounded-2xl border border-white/10">
                  {/* Column headers */}
                  <div
                    className="grid bg-white/10 px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55"
                    style={{ gridTemplateColumns: `minmax(180px,1.2fr) 90px repeat(${PORTALS.length}, minmax(60px,1fr))` }}
                  >
                    <span>User</span>
                    <span>Role</span>
                    {PORTALS.map((portal) => (
                      <span key={portal.id} className="text-center" style={{ color: portal.glow }}>
                        {portal.label}
                      </span>
                    ))}
                  </div>
                  {/* User rows */}
                  {users.map((mu) => (
                    <div
                      key={mu.email}
                      className="grid items-center border-t border-white/10 px-3 py-3 text-sm"
                      style={{ gridTemplateColumns: `minmax(180px,1.2fr) 90px repeat(${PORTALS.length}, minmax(60px,1fr))` }}
                    >
                      <span className="truncate text-white/85">{mu.email}</span>
                      <button
                        onClick={() => toggleRole(mu.email)}
                        className="mr-3 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/75 transition hover:bg-white/10"
                        disabled={!canManage}
                      >
                        {mu.role}
                      </button>
                      {PORTALS.map((portal) => {
                        const checked = mu.permissions.includes(portal.permissionKey);
                        return (
                          <button
                            key={portal.id}
                            onClick={() => togglePermission(mu.email, portal.permissionKey)}
                            disabled={!canManage}
                            className={`mx-auto h-5 w-10 rounded-full border transition ${
                              checked
                                ? 'border-cyan-200/60 bg-cyan-300/65 shadow-[0_0_18px_rgba(103,232,249,0.55)]'
                                : 'border-white/15 bg-white/5'
                            }`}
                            aria-label={`${mu.email} ${portal.label} access`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Right column ── */}
          <div className="space-y-6">

            {/* Opening Theme Video */}
            <Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl">
              <CardHeader>
                <CardTitle>🎬 Opening Theme Video</CardTitle>
                <CardDescription className="text-white/55">
                  This video plays full-screen when someone first visits the portal. It plays once per session, then the solar system appears.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  value={openingVideoUrl.startsWith('data:') ? '' : openingVideoUrl}
                  onChange={(e) => setOpeningVideoUrl(e.target.value)}
                  placeholder="https://.../opening-theme.mp4"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-200/50"
                />
                <p className="text-xs text-white/40">Or upload a video file:</p>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleOpeningVideoUpload(e.target.files?.[0] ?? null)}
                  className="text-xs text-white/60"
                />
                {openingVideoUrl && (
                  <button
                    onClick={() => setOpeningVideoUrl('')}
                    className="text-xs text-red-400/70 hover:text-red-400"
                  >
                    ✕ Remove opening video
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Planet Render URLs (read-only summary of what's saved in localStorage) */}
            <Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl">
              <CardHeader>
                <CardTitle>🌍 Planet Portal URLs</CardTitle>
                <CardDescription className="text-white/55">
                  Click on <strong>Pluto (Admin)</strong> on the solar system map to configure Render links and transition videos per planet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {PORTALS.map((portal) => {
                  const saved = planetSettings?.[portal.id];
                  return (
                    <div
                      key={portal.id}
                      className="flex items-center justify-between gap-4 rounded-xl bg-white/5 px-3 py-2"
                    >
                      <span className="text-sm font-semibold" style={{ color: portal.glow }}>
                        {portal.label}
                      </span>
                      <span className="truncate text-xs text-white/40">
                        {saved?.url || 'Not configured'}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Startup Audio */}
            <Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl">
              <CardHeader>
                <CardTitle>🔊 Startup Audio</CardTitle>
                <CardDescription className="text-white/55">
                  Optional background audio URL that plays on portal load.
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

            {/* Save */}
            <Button
              onClick={saveChanges}
              disabled={saving || !canManage}
              className="w-full bg-white text-black hover:bg-cyan-100"
            >
              {saving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
