import type { PortalPermissionKey } from './config';
import { supabase } from './supabase';

const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'portal-assets';

export type PlanetSettings = Record<PortalPermissionKey, { url: string; videoUrl: string }>;
export type ManagedUser = { email: string; role: 'Admin' | 'User'; permissions: PortalPermissionKey[] };

export interface PortalBackendState {
  settings?: Partial<PlanetSettings>;
  users?: ManagedUser[];
  openingVideoUrl?: string;
  audioUrl?: string;
}

export async function loadPortalState(): Promise<PortalBackendState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('portal_settings').select('data').eq('id', 1).maybeSingle<{ data: PortalBackendState }>();
  if (error) return null;
  return data?.data ?? null;
}

export async function savePortalState(state: PortalBackendState): Promise<void> {
  if (!supabase) throw new Error('Supabase client is not configured.');
  const { error } = await supabase.from('portal_settings').upsert(
    {
      id: 1,
      data: state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (error) throw error;
}

export async function uploadPortalAsset(file: File, folder = 'opening'): Promise<string> {
  if (!supabase) throw new Error('Supabase client is not configured.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const path = `${folder}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
