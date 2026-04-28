import { createClient } from '@supabase/supabase-js';
import type { PortalPermissionKey } from './config';

export type PlanetSetting = {
  url: string;
  videoUrl: string;
};

export type PlanetSettings = Record<PortalPermissionKey, PlanetSetting>;

export type ManagedUser = {
  email: string;
  role: 'Admin' | 'User';
  permissions: PortalPermissionKey[];
};

export type PortalBackendState = {
  settings?: Partial<PlanetSettings>;
  users?: ManagedUser[];
  openingVideoUrl?: string;
  audioUrl?: string;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const storageBucket = (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET as string | undefined) ?? 'portal-assets';

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export async function loadPortalState(): Promise<PortalBackendState | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('portal_settings')
    .select('data')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('Supabase load failed:', error);
    return null;
  }

  return (data?.data as PortalBackendState | undefined) ?? null;
}

export async function savePortalState(state: PortalBackendState): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.');
  }

  const { error } = await supabase
    .from('portal_settings')
    .upsert({
      id: 1,
      data: state,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Supabase save failed:', error);
    throw error;
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadPortalAsset(
  file: File,
  pathPrefix: 'transitions' | 'opening' | 'audio',
): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.');
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const safeBaseName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
  const filePath = `${pathPrefix}/${Date.now()}-${safeBaseName}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(storageBucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    console.error('Supabase upload failed:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from(storageBucket)
    .getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error('Failed to generate public URL for uploaded asset.');
  }

  return data.publicUrl;
}
