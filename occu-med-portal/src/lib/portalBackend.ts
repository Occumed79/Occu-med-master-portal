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
  settings: PlanetSettings;
  users: ManagedUser[];
  openingVideoUrl: string;
  audioUrl: string;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export async function loadPortalState(): Promise<Partial<PortalBackendState> | null> {
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

  return (data?.data as Partial<PortalBackendState> | undefined) ?? null;
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
