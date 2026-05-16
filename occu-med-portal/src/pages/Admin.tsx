import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PORTALS, type PortalPermissionKey } from '../lib/config';
import { supabase } from '../lib/supabase';
import {
  loadPortalState,
  savePortalState,
  uploadPortalAsset,
  type ManagedUser,
  type PlanetSettings,
} from '../lib/portalBackend';
import { useAuth } from '../hooks/useAuth';

type AdminTab = 'users' | 'portals' | 'launch';

type PortalUserRow = {
  id?: string;
  email: string;
  role: string;
  permissions: unknown;
};

const INVITABLE_PORTALS = PORTALS.filter((portal) => portal.id !== 'admin');

function buildEmptySettings(): PlanetSettings {
  return Object.fromEntries(
    PORTALS.map((portal) => [portal.id, { url: portal.url, videoUrl: portal.videoUrl }]),
  ) as PlanetSettings;
}

function normalizeUser(row: PortalUserRow): ManagedUser {
  return {
    id: row.id,
    email: row.email.toLowerCase(),
    role: row.role === 'Admin' ? 'Admin' : 'User',
    permissions: Array.isArray(row.permissions) ? (row.permissions as PortalPermissionKey[]) : [],
  };
}

function buildUser(email: string, permissions: PortalPermissionKey[] = []): ManagedUser {
  return { email: email.toLowerCase(), role: 'User', permissions };
}

export default function Admin() {
  const { isLive, user, loading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermissions, setInvitePermissions] = useState<PortalPermissionKey[]>([]);
  const [draftSettings, setDraftSettings] = useState<PlanetSettings>(() => buildEmptySettings());
  const [openingVideoUrl, setOpeningVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');

  const canManage = useMemo(() => !isLive || isAdmin, [isLive, isAdmin]);

  useEffect(() => {
    if (loading) return;
    if (isLive && !user) {
      setLocation('/login?next=/admin');
      return;
    }
    if (isLive && user && !isAdmin) {
      setMessage('This account is signed in, but it does not have Admin role access.');
    }
  }, [isLive, isAdmin, loading, setLocation, user]);

  useEffect(() => {
    let mounted = true;

    async function loadSharedSettings() {
      if (isLive && loading) return;

      try {
        const backendState = await loadPortalState();
        if (!mounted) return;

        if (backendState?.settings) {
          setDraftSettings({ ...buildEmptySettings(), ...backendState.settings });
        }

        if (typeof backendState?.openingVideoUrl === 'string') {
          setOpeningVideoUrl(backendState.openingVideoUrl);
        }

        if (typeof backendState?.audioUrl === 'string') {
          setAudioUrl(backendState.audioUrl);
        }
      } catch (error: unknown) {
        if (!mounted) return;
        const detail = error instanceof Error ? error.message : 'Unknown backend error';
        setMessage(`Unable to load portal settings from Supabase: ${detail}`);
      }
    }

    void loadSharedSettings();

    return () => {
      mounted = false;
    };
  }, [isLive, loading]);

  useEffect(() => {
    if (!isLive || !supabase || !isAdmin) return;

    supabase
      .from('portal_users')
      .select('id, email, role, permissions')
      .order('email')
      .then(({ data, error }) => {
        if (error) {
          setMessage(`Unable to load portal users. Check the portal_users table and RLS policies. ${error.message}`);
          return;
        }

        const rows = (data ?? []) as PortalUserRow[];
        setUsers(rows.map(normalizeUser));
      });
  }, [isLive, isAdmin]);

  const toggleInvitePermission = (permission: PortalPermissionKey) => {
    setInvitePermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  };

  const inviteUser = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !canManage) return;

    setSaving(true);
    setMessage('');

    try {
      const nextUser = buildUser(email, invitePermissions);

      if (isLive) {
        if (!supabase) throw new Error('Supabase is not configured.');

        const { error: upsertError } = await supabase
          .from('portal_users')
          .upsert(nextUser, { onConflict: 'email' });

        if (upsertError) throw upsertError;

        const { error: inviteError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: `${window.location.origin}/setup-account`,
          },
        });

        if (inviteError) throw inviteError;
      }

      setUsers((current) => {
        const existing = current.some((entry) => entry.email === email);
        return existing
          ? current.map((entry) => (entry.email === email ? { ...entry, permissions: invitePermissions } : entry))
          : [...current, nextUser];
      });
      setInviteEmail('');
      setInvitePermissions([]);
      setMessage(
        isLive
          ? `Invitation sent to ${email} with ${invitePermissions.length} portal${invitePermissions.length === 1 ? '' : 's'} assigned.`
          : `Preview user added: ${email}`,
      );
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'Unknown invite error';
      setMessage(`Unable to invite user: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (email: string) => {
    if (!canManage) return;

    setSaving(true);
    setMessage('');

    try {
      if (isLive) {
        if (!supabase) throw new Error('Supabase is not configured.');
        const { error } = await supabase.from('portal_users').delete().eq('email', email);
        if (error) throw error;
      }

      setUsers((current) => current.filter((entry) => entry.email !== email));
      setMessage(`Removed ${email}.`);
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'Unknown delete error';
      setMessage(`Unable to remove user: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (email: string, permission: PortalPermissionKey) => {
    if (!canManage) return;
    setUsers((current) =>
      current.map((entry) => {
        if (entry.email !== email) return entry;
        const hasPermission = entry.permissions.includes(permission);
        return {
          ...entry,
          permissions: hasPermission
            ? entry.permissions.filter((item) => item !== permission)
            : [...entry.permissions, permission],
        };
      }),
    );
  };

  const toggleRole = (email: string) => {
    if (!canManage) return;
    setUsers((current) =>
      current.map((entry) =>
        entry.email === email
          ? { ...entry, role: entry.role === 'Admin' ? 'User' : 'Admin' }
          : entry,
      ),
    );
  };

  const grantAll = (email: string) => {
    if (!canManage) return;
    setUsers((current) =>
      current.map((entry) =>
        entry.email === email
          ? { ...entry, permissions: INVITABLE_PORTALS.map((portal) => portal.permissionKey) }
          : entry,
      ),
    );
  };

  const revokeAll = (email: string) => {
    if (!canManage) return;
    setUsers((current) =>
      current.map((entry) => (entry.email === email ? { ...entry, permissions: [] } : entry)),
    );
  };

  const saveChanges = async () => {
    if (!canManage) return;

    setSaving(true);
    setMessage('');

    try {
      if (isLive) {
        if (!supabase) throw new Error('Supabase is not configured.');

        const { error: usersError } = await supabase
          .from('portal_users')
          .upsert(users, { onConflict: 'email' });

        if (usersError) throw usersError;
      }

      await savePortalState({
        settings: draftSettings,
        openingVideoUrl,
        audioUrl,
      });

      setMessage(isLive ? 'Portal settings and user permissions saved to Supabase.' : 'Preview settings saved for this session.');
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'Unknown save error';
      setMessage(`Unable to save. Check Supabase tables and RLS policies. ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const handleVideoUpload = async (portalId: PortalPermissionKey, file: File | null) => {
    if (!file || !canManage) return;

    setIsUploading(true);
    setMessage('');

    try {
      const publicUrl = await uploadPortalAsset(file, 'transitions');
      setDraftSettings((current) => ({
        ...current,
        [portalId]: { ...current[portalId], videoUrl: publicUrl },
      }));
      setMessage('Transition video uploaded. Click Save Changes to publish.');
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'Unknown upload error';
      setMessage(`Video upload failed. Check the portal-assets bucket. ${detail}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpeningVideoUpload = async (file: File | null) => {
    if (!file || !canManage) return;

    setIsUploading(true);
    setMessage('');

    try {
      const publicUrl = await uploadPortalAsset(file, 'opening');
      setOpeningVideoUrl(publicUrl);
      setMessage('Opening video uploaded. Click Save Changes to publish.');
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'Unknown upload error';
      setMessage(`Opening video upload failed. Check the portal-assets bucket. ${detail}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading command center...
      </div>
    );
  }

  const tabStyle = (tab: AdminTab) => ({
    padding: '0.5rem 1.25rem',
    borderRadius: '999px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    transition: 'all 0.2s ease',
    background: activeTab === tab ? 'rgba(103,232,249,0.2)' : 'rgba(255,255,255,0.05)',
    color: activeTab === tab ? '#67e8f9' : 'rgba(255,255,255,0.55)',
    boxShadow: activeTab === tab ? '0 0 16px rgba(103,232,249,0.25)' : 'none',
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#18244f_0%,#03040a_45%,#000_100%)] p-6 text-white md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/70">Occu-Med Secure Portal</p>
            <h1 className="mt-2 text-3xl font-bold uppercase tracking-[0.18em] md:text-4xl">Admin Command Center</h1>
            <p className="mt-2 text-sm text-white/55">
              Invite users by email, assign portal access, and publish planet links from one central backend.
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
                Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Render, then create the portal_users and portal_settings tables in Supabase.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {isLive && user && !isAdmin && (
          <Card className="border-red-300/35 bg-red-500/10 text-white backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Admin Access Required</CardTitle>
              <CardDescription className="text-red-100/75">
                This signed-in account does not have Admin role access in portal_users.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {message && (
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/80 backdrop-blur-xl">
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button style={tabStyle('users')} onClick={() => setActiveTab('users')}>User Management</button>
          <button style={tabStyle('portals')} onClick={() => setActiveTab('portals')}>Planet Portals</button>
          <button style={tabStyle('launch')} onClick={() => setActiveTab('launch')}>Launch Experience</button>
        </div>

        {activeTab === 'users' && (
          <div className="space-y-6">
            <Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl">
              <CardHeader>
                <CardTitle>Invite User</CardTitle>
                <CardDescription className="text-white/55">
                  Enter the person’s email, select the exact portals they should access, then send the invite.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 md:flex-row">
                  <input
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && inviteUser()}
                    placeholder="name@occu-med.com"
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-200/50"
                  />
                  <Button onClick={inviteUser} disabled={!canManage || saving} className="bg-white text-black hover:bg-cyan-100">
                    {saving ? 'Working...' : 'Send Invite'}
                  </Button>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/80">Portal Access</p>
                      <p className="text-xs text-white/45">Selected access is saved before the invite email is sent.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setInvitePermissions(INVITABLE_PORTALS.map((portal) => portal.permissionKey))}
                        className="rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1 text-xs text-cyan-100"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvitePermissions([])}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {INVITABLE_PORTALS.map((portal) => {
                      const selected = invitePermissions.includes(portal.permissionKey);
                      return (
                        <button
                          key={portal.id}
                          type="button"
                          onClick={() => toggleInvitePermission(portal.permissionKey)}
                          className="rounded-xl border px-3 py-2 text-left text-sm transition"
                          style={{
                            borderColor: selected ? `${portal.glow}aa` : 'rgba(255,255,255,0.12)',
                            background: selected ? `${portal.glow}24` : 'rgba(255,255,255,0.04)',
                            color: selected ? '#fff' : 'rgba(255,255,255,0.62)',
                            boxShadow: selected ? `0 0 18px ${portal.glow}33` : 'none',
                          }}
                        >
                          {portal.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl">
              <CardHeader>
                <CardTitle>User Permissions</CardTitle>
                <CardDescription className="text-white/55">
                  These permissions determine which planets each signed-in user can open.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>User</th>
                        <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Role</th>
                        {INVITABLE_PORTALS.map((portal) => (
                          <th key={portal.id} style={{ padding: '0.75rem 0.25rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', color: portal.glow }}>
                            {portal.label}
                          </th>
                        ))}
                        <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((managedUser) => (
                        <tr key={managedUser.email} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {managedUser.email}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                            <button
                              onClick={() => toggleRole(managedUser.email)}
                              disabled={!canManage}
                              style={{ borderRadius: '999px', border: '1px solid rgba(255,255,255,0.2)', background: managedUser.role === 'Admin' ? 'rgba(103,232,249,0.15)' : 'rgba(255,255,255,0.05)', color: managedUser.role === 'Admin' ? '#67e8f9' : 'rgba(255,255,255,0.6)', padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              {managedUser.role}
                            </button>
                          </td>
                          {INVITABLE_PORTALS.map((portal) => {
                            const checked = managedUser.permissions.includes(portal.permissionKey);
                            return (
                              <td key={portal.id} style={{ padding: '0.75rem 0.25rem', textAlign: 'center' }}>
                                <button
                                  onClick={() => togglePermission(managedUser.email, portal.permissionKey)}
                                  disabled={!canManage}
                                  style={{ width: '36px', height: '20px', borderRadius: '999px', border: checked ? `1px solid ${portal.glow}88` : '1px solid rgba(255,255,255,0.15)', background: checked ? `${portal.glow}44` : 'rgba(255,255,255,0.05)', boxShadow: checked ? `0 0 10px ${portal.glow}55` : 'none', cursor: 'pointer', transition: 'all 0.2s ease', display: 'block', margin: '0 auto' }}
                                  aria-label={`${managedUser.email} ${portal.label} access`}
                                />
                              </td>
                            );
                          })}
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                              <button onClick={() => grantAll(managedUser.email)} disabled={!canManage} style={{ background: 'rgba(103,232,249,0.1)', border: '1px solid rgba(103,232,249,0.3)', color: '#67e8f9', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.65rem', cursor: 'pointer' }}>All</button>
                              <button onClick={() => revokeAll(managedUser.email)} disabled={!canManage} style={{ background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.3)', color: '#f87171', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.65rem', cursor: 'pointer' }}>None</button>
                              <button onClick={() => void removeUser(managedUser.email)} disabled={!canManage} style={{ background: 'rgba(255,100,100,0.08)', border: '1px solid rgba(255,100,100,0.2)', color: 'rgba(248,113,113,0.7)', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.65rem', cursor: 'pointer' }}>Remove</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button onClick={saveChanges} disabled={saving || isUploading || !canManage} className="bg-white text-black hover:bg-cyan-100">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'portals' && (
          <Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Planet Portal Configuration</CardTitle>
              <CardDescription className="text-white/55">
                These Render URLs are saved centrally in Supabase and loaded by every signed-in user.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {INVITABLE_PORTALS.map((portal) => (
                  <div key={portal.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-bold uppercase tracking-[0.18em]" style={{ color: portal.glow }}>
                      {portal.label}
                    </div>
                    <label className="mb-2 block text-xs text-white/40">Render URL</label>
                    <input
                      type="url"
                      value={draftSettings[portal.id].url}
                      onChange={(event) => setDraftSettings((current) => ({ ...current, [portal.id]: { ...current[portal.id], url: event.target.value } }))}
                      placeholder="https://your-render-service.onrender.com"
                      className="mb-3 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-200/50"
                    />
                    <label className="mb-2 block text-xs text-white/40">Transition Video URL</label>
                    <input
                      type="url"
                      value={draftSettings[portal.id].videoUrl}
                      onChange={(event) => setDraftSettings((current) => ({ ...current, [portal.id]: { ...current[portal.id], videoUrl: event.target.value } }))}
                      placeholder="https://.../transition.mp4"
                      className="mb-3 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-200/50"
                    />
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(event) => void handleVideoUpload(portal.id, event.target.files?.[0] ?? null)}
                      disabled={isUploading || !canManage}
                      className="text-xs text-white/60"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={saveChanges} disabled={saving || isUploading || !canManage} className="bg-white text-black hover:bg-cyan-100">
                  {saving ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Portal Links'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'launch' && (
          <div className="space-y-6">
            <Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl">
              <CardHeader>
                <CardTitle>Opening Theme Video</CardTitle>
                <CardDescription className="text-white/55">
                  This is saved centrally and used by the portal opening experience.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  value={openingVideoUrl}
                  onChange={(event) => setOpeningVideoUrl(event.target.value)}
                  placeholder="https://.../opening-theme.mp4"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-200/50"
                />
                <input
                  type="file"
                  accept="video/*"
                  onChange={(event) => void handleOpeningVideoUpload(event.target.files?.[0] ?? null)}
                  disabled={isUploading || !canManage}
                  className="text-xs text-white/60"
                />
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl">
              <CardHeader>
                <CardTitle>Startup Audio</CardTitle>
                <CardDescription className="text-white/55">
                  Optional ambient audio that plays during portal transitions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  value={audioUrl}
                  onChange={(event) => setAudioUrl(event.target.value)}
                  placeholder="https://.../startup.mp3"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-200/50"
                />
              </CardContent>
            </Card>

            <Button onClick={saveChanges} disabled={saving || isUploading || !canManage} className="w-full bg-white text-black hover:bg-cyan-100">
              {saving ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Launch Settings'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
