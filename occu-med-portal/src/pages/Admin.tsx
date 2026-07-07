import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PORTALS, type PortalPermissionKey } from '../lib/config';
import { createPortalUser, loadAdminPortalState, regeneratePortalUserPin, removePortalUser, savePortalSettings, savePortalUserPermissions, type ManagedUser, type PlanetSettings } from '../lib/portalBackend';
import { useAuth } from '../hooks/useAuth';
import { buildUsername, NON_ADMIN_PORTAL_KEYS } from '../lib/accessControl';

type AdminTab = 'users' | 'portals' | 'launch';

const USER_PORTALS = PORTALS.filter((portal) => portal.id !== 'admin' && NON_ADMIN_PORTAL_KEYS.includes(portal.permissionKey));

function buildEmptySettings(): PlanetSettings {
  return Object.fromEntries(PORTALS.map((portal) => [portal.id, { url: portal.url, videoUrl: portal.videoUrl }])) as PlanetSettings;
}

export default function Admin() {
  const { user, loading, isAdmin, logoutAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [generatedCode, setGeneratedCode] = useState<{ username: string; code: string } | null>(null);
  const [draftSettings, setDraftSettings] = useState<PlanetSettings>(() => buildEmptySettings());
  const [openingVideoUrl, setOpeningVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const usernamePreview = buildUsername(firstName, lastName);

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) setLocation('/login?next=/admin');
  }, [isAdmin, loading, setLocation, user]);

  useEffect(() => {
    let mounted = true;
    async function loadSharedSettings() {
      try {
        const backendState = await loadAdminPortalState();
        if (!mounted) return;
        setDraftSettings({ ...buildEmptySettings(), ...(backendState?.settings ?? {}) });
        setOpeningVideoUrl(typeof backendState?.openingVideoUrl === 'string' ? backendState.openingVideoUrl : '');
        setAudioUrl(typeof backendState?.audioUrl === 'string' ? backendState.audioUrl : '');
        setUsers(Array.isArray(backendState?.users) ? backendState.users : []);
      } catch (error: unknown) {
        if (!mounted) return;
        const detail = error instanceof Error ? error.message : 'Unknown backend error';
        setMessage(`Unable to load portal settings: ${detail}`);
      }
    }
    void loadSharedSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const addUser = async () => {
    if (!usernamePreview || saving) return;
    setSaving(true);
    setMessage('');
    try {
      const nextUser = await createPortalUser(firstName, lastName);
      setUsers((current) => [...current.filter((entry) => entry.username !== nextUser.username), nextUser]);
      setGeneratedCode({ username: nextUser.username, code: nextUser.generatedPin });
      setFirstName('');
      setLastName('');
      setMessage(`Created ${nextUser.username}. Copy the generated PIN now.`);
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'Unknown create error';
      setMessage(`Unable to create user: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const regenerateCode = async (id: string) => {
    setSaving(true);
    setMessage('');
    try {
      const target = users.find((entry) => entry.id === id);
      const { generatedPin } = await regeneratePortalUserPin(id);
      setGeneratedCode(target ? { username: target.username, code: generatedPin } : null);
      setMessage('Generated a new PIN. Copy it now.');
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'Unknown PIN regeneration error';
      setMessage(`Unable to regenerate PIN: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (id: string) => {
    setSaving(true);
    setMessage('');
    try {
      await removePortalUser(id);
      setUsers((current) => current.filter((entry) => entry.id !== id));
      setMessage('User removed.');
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'Unknown delete error';
      setMessage(`Unable to remove user: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (id: string, permission: PortalPermissionKey) => {
    setUsers((current) => current.map((entry) => {
      if (entry.id !== id) return entry;
      const hasPermission = entry.permissions.includes(permission);
      return { ...entry, permissions: hasPermission ? entry.permissions.filter((item) => item !== permission) : [...entry.permissions, permission] };
    }));
  };

  const saveChanges = async () => {
    setSaving(true);
    setMessage('');
    try {
      await savePortalSettings({ settings: draftSettings, openingVideoUrl, audioUrl });
      await Promise.all(users.map((entry) => savePortalUserPermissions(entry.id, entry.permissions)));
      setMessage('Portal links, launch settings, and user access saved.');
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'Unknown save error';
      setMessage(`Unable to save portal state: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const savePermissions = async (managedUser: ManagedUser) => {
    setSaving(true);
    setMessage('');
    try {
      const permissions = await savePortalUserPermissions(managedUser.id, managedUser.permissions);
      setUsers((current) => current.map((entry) => (entry.id === managedUser.id ? { ...entry, permissions } : entry)));
      setMessage(`Saved permissions for ${managedUser.username}.`);
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'Unknown permissions error';
      setMessage(`Unable to save permissions: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center bg-black text-white">Loading command center...</div>;

  const tabStyle = (tab: AdminTab) => ({
    padding: '0.5rem 1.25rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
    letterSpacing: '0.1em', textTransform: 'uppercase' as const, background: activeTab === tab ? 'rgba(103,232,249,0.2)' : 'rgba(255,255,255,0.05)',
    color: activeTab === tab ? '#67e8f9' : 'rgba(255,255,255,0.55)', boxShadow: activeTab === tab ? '0 0 16px rgba(103,232,249,0.25)' : 'none',
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#18244f_0%,#03040a_45%,#000_100%)] p-6 text-white md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/70">Occu-Med Secure Portal</p><h1 className="mt-2 text-3xl font-bold uppercase tracking-[0.18em] md:text-4xl">Admin Command Center</h1><p className="mt-2 text-sm text-white/55">Create portal users, assign planet access, and publish portal links through the Neon API.</p></div>
          <div className="flex gap-2"><Link href="/"><Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">Return to Portal</Button></Link><Button onClick={() => { void logoutAdmin().then(() => setLocation('/login?next=/admin')); }} variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">Sign Out</Button></div>
        </div>
        {message && <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/80 backdrop-blur-xl">{message}</div>}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}><button style={tabStyle('users')} onClick={() => setActiveTab('users')}>User Management</button><button style={tabStyle('portals')} onClick={() => setActiveTab('portals')}>Planet Portals</button><button style={tabStyle('launch')} onClick={() => setActiveTab('launch')}>Launch Experience</button></div>

        {activeTab === 'users' && <div className="space-y-6">
          <Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl"><CardHeader><CardTitle>Create User</CardTitle><CardDescription className="text-white/55">Enter a first and last name. Username is generated automatically and only a PIN digest is stored.</CardDescription></CardHeader><CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3"><input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" /><input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" /><Button onClick={addUser} disabled={!usernamePreview || saving} className="bg-white text-black hover:bg-cyan-100">{saving ? 'Working...' : 'Generate User + PIN'}</Button></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">Username preview: <span className="font-mono text-cyan-100">{usernamePreview || 'firstnamelastname'}</span></div>
            {generatedCode && <div className="rounded-2xl border border-cyan-200/30 bg-cyan-200/10 p-4"><p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Generated access code</p><p className="mt-2 text-sm">Username: <span className="font-mono text-white">{generatedCode.username}</span></p><p className="text-sm">PIN/Password: <span className="font-mono text-2xl text-white">{generatedCode.code}</span></p><p className="mt-2 text-xs text-white/50">Copy this now. The plain text code is not saved.</p></div>}
          </CardContent></Card>

          <Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl"><CardHeader><CardTitle>User Permissions</CardTitle><CardDescription className="text-white/55">Toggle portal access for non-admin planets only, then save changes.</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}><thead><tr style={{ background: 'rgba(255,255,255,0.06)' }}><th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>User</th>{USER_PORTALS.map((portal) => <th key={portal.id} style={{ padding: '0.75rem 0.25rem', textAlign: 'center', color: portal.glow }}>{portal.label}</th>)}<th>Actions</th></tr></thead><tbody>{users.map((managedUser) => <tr key={managedUser.id} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}><td style={{ padding: '0.75rem 1rem' }}><div>{managedUser.firstName} {managedUser.lastName}</div><div className="font-mono text-xs text-cyan-100/75">{managedUser.username}</div></td>{USER_PORTALS.map((portal) => { const checked = managedUser.permissions.includes(portal.permissionKey); return <td key={portal.id} style={{ padding: '0.75rem 0.25rem', textAlign: 'center' }}><button onClick={() => togglePermission(managedUser.id, portal.permissionKey)} style={{ width: '36px', height: '20px', borderRadius: '999px', border: checked ? `1px solid ${portal.glow}88` : '1px solid rgba(255,255,255,0.15)', background: checked ? `${portal.glow}44` : 'rgba(255,255,255,0.05)', boxShadow: checked ? `0 0 10px ${portal.glow}55` : 'none' }} aria-label={`${managedUser.username} ${portal.label} access`} /></td>; })}<td style={{ textAlign: 'center' }}><div className="flex justify-center gap-2"><button onClick={() => void savePermissions(managedUser)} className="rounded-md border border-emerald-200/30 bg-emerald-200/10 px-2 py-1 text-xs text-emerald-100">Save Access</button><button onClick={() => void regenerateCode(managedUser.id)} className="rounded-md border border-cyan-200/30 bg-cyan-200/10 px-2 py-1 text-xs text-cyan-100">Regenerate PIN</button><button onClick={() => void removeUser(managedUser.id)} className="rounded-md border border-red-300/30 bg-red-500/10 px-2 py-1 text-xs text-red-200">Remove</button></div></td></tr>)}</tbody></table></div><div className="mt-4 flex justify-end"><Button onClick={saveChanges} disabled={saving} className="bg-white text-black hover:bg-cyan-100">{saving ? 'Saving...' : 'Save Changes'}</Button></div></CardContent></Card>
        </div>}

        {activeTab === 'portals' && <Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl"><CardHeader><CardTitle>Planet Portal Configuration</CardTitle><CardDescription className="text-white/55">Portal URLs and transition videos are saved to Neon through the backend API.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 md:grid-cols-2">{USER_PORTALS.map((portal) => <div key={portal.id} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="mb-3 text-sm font-bold uppercase tracking-[0.18em]" style={{ color: portal.glow }}>{portal.label}</div><label className="mb-2 block text-xs text-white/40">Render URL</label><input type="url" value={draftSettings[portal.id].url} onChange={(event) => setDraftSettings((current) => ({ ...current, [portal.id]: { ...current[portal.id], url: event.target.value } }))} placeholder="https://your-render-service.onrender.com" className="mb-3 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" /><label className="mb-2 block text-xs text-white/40">Transition Video URL</label><input type="url" value={draftSettings[portal.id].videoUrl} onChange={(event) => setDraftSettings((current) => ({ ...current, [portal.id]: { ...current[portal.id], videoUrl: event.target.value } }))} placeholder="https://.../transition.mp4" className="mb-3 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" /></div>)}</div><div className="flex justify-end"><Button onClick={saveChanges} disabled={saving} className="bg-white text-black hover:bg-cyan-100">{saving ? 'Saving...' : 'Save Portal Links'}</Button></div></CardContent></Card>}

        {activeTab === 'launch' && <div className="space-y-6"><Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl"><CardHeader><CardTitle>Opening Theme Video</CardTitle><CardDescription className="text-white/55">This is saved centrally and used by the portal opening experience.</CardDescription></CardHeader><CardContent className="space-y-4"><input value={openingVideoUrl} onChange={(event) => setOpeningVideoUrl(event.target.value)} placeholder="https://.../opening-theme.mp4" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" /></CardContent></Card><Card className="border-white/10 bg-black/35 text-white backdrop-blur-xl"><CardHeader><CardTitle>Startup Audio</CardTitle><CardDescription className="text-white/55">Optional ambient audio that plays during portal transitions.</CardDescription></CardHeader><CardContent><input value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} placeholder="https://.../startup.mp3" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" /></CardContent></Card><Button onClick={saveChanges} disabled={saving} className="w-full bg-white text-black hover:bg-cyan-100">{saving ? 'Saving...' : 'Save Launch Settings'}</Button></div>}
      </div>
    </div>
  );
}
