import { createClient } from '@supabase/supabase-js';
import type { PortalPermissionKey } from './config';
import type { PortalManagedUser } from './accessControl';

export type PlanetSetting = {
  url: string;
  videoUrl: string;
};

export type PlanetSettings = Record<PortalPermissionKey, PlanetSetting>;

export type ManagedUser = PortalManagedUser;

export type PortalBackendState = {
  settings?: Partial<PlanetSettings>;
  openingVideoUrl?: string;
  audioUrl?: string;
  users?: PortalManagedUser[];
};

const configuredApiBase = (import.meta.env.VITE_PORTAL_API_URL as string | undefined)?.trim() ?? '';
const apiBase = configuredApiBase.replace(/\/$/, '');
const adminPassword = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined) ?? '';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const storageBucket = (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET as string | undefined) ?? 'portal-assets';

const storageClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

function portalStateUrl(): string {
  return `${apiBase}/api/portal-state`;
}

async function readApiError(response: Response): Promise<string> {
  try {
    const payload = await response.json() as { error?: unknown };
    if (typeof payload.error === 'string' && payload.error.trim()) return payload.error;
  } catch {
    // Fall through to the HTTP status below.
  }

  return `Portal API request failed with status ${response.status}.`;
}

export async function loadPortalState(): Promise<PortalBackendState | null> {
  const response = await fetch(portalStateUrl(), {
    method: 'GET',
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (!response.ok) throw new Error(await readApiError(response));

  const state = await response.json() as PortalBackendState | null;
  return state && typeof state === 'object' ? state : null;
}

export async function savePortalState(state: PortalBackendState): Promise<void> {
  const response = await fetch(portalStateUrl(), {
    method: 'PUT',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'x-admin-password': adminPassword,
    },
    body: JSON.stringify(state),
  });

  if (!response.ok) throw new Error(await readApiError(response));
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadPortalAsset(
  file: File,
  pathPrefix: 'transitions' | 'opening' | 'audio',
): Promise<string> {
  if (!storageClient) {
    throw new Error('Supabase Storage environment variables are missing.');
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const safeBaseName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
  const filePath = `${pathPrefix}/${Date.now()}-${safeBaseName}.${ext}`;

  const { error: uploadError } = await storageClient.storage
    .from(storageBucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    console.error('Supabase Storage upload failed:', uploadError);
    throw new Error(uploadError.message || 'Supabase Storage upload failed.');
  }

  const { data } = storageClient.storage
    .from(storageBucket)
    .getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error('Failed to generate public URL for uploaded asset.');
  }

  return data.publicUrl;
}
