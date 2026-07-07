import type { PortalPermissionKey } from './config';
import type { PortalManagedUser } from './accessControl';

export type PlanetSetting = {
  url: string;
  videoUrl: string;
};

export type PlanetSettings = Record<PortalPermissionKey, PlanetSetting>;

export type ManagedUser = PortalManagedUser;

export type PublicPortalState = {
  settings?: Partial<PlanetSettings>;
  openingVideoUrl?: string;
  audioUrl?: string;
};

export type AdminPortalState = PublicPortalState & {
  users: ManagedUser[];
};

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export async function loadPortalState(): Promise<PublicPortalState> {
  const response = await fetch('/api/portal/state', { credentials: 'include' });
  return parseJson<PublicPortalState>(response);
}

export async function loadAdminPortalState(): Promise<AdminPortalState> {
  const response = await fetch('/api/admin/state', { credentials: 'include' });
  return parseJson<AdminPortalState>(response);
}

export async function savePortalSettings(state: PublicPortalState): Promise<void> {
  const response = await fetch('/api/admin/settings', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  await parseJson<{ ok: true }>(response);
}

export async function createPortalUser(firstName: string, lastName: string): Promise<ManagedUser & { generatedPin: string }> {
  const response = await fetch('/api/admin/users', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, lastName }),
  });
  return parseJson<ManagedUser & { generatedPin: string }>(response);
}

export async function regeneratePortalUserPin(id: string): Promise<{ generatedPin: string }> {
  const response = await fetch(`/api/admin/users/${id}/regenerate-pin`, {
    method: 'POST',
    credentials: 'include',
  });
  return parseJson<{ generatedPin: string }>(response);
}

export async function removePortalUser(id: string): Promise<void> {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  await parseJson<{ ok: true }>(response);
}

export async function savePortalUserPermissions(id: string, permissions: PortalPermissionKey[]): Promise<PortalPermissionKey[]> {
  const response = await fetch(`/api/admin/users/${id}/permissions`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions }),
  });
  const data = await parseJson<{ permissions: PortalPermissionKey[] }>(response);
  return data.permissions;
}

export async function verifyPortalAccess(username: string, pin: string, portalKey: PortalPermissionKey): Promise<
  | { allowed: true; portalUrl: string; transitionVideoUrl: string }
  | { allowed: false; reason: string }
> {
  const response = await fetch('/api/portal/verify-access', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin, portalKey }),
  });
  return parseJson(response);
}
