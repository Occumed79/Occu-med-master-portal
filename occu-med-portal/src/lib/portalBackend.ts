import { supabase } from './supabase';

const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'portal-assets';

interface PortalSettingsRow<T> {
  id: number;
  data: T;
}

export async function loadPortalState<T extends Record<string, unknown>>(fallback: T): Promise<T> {
  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from('portal_settings')
    .select('id, data')
    .eq('id', 1)
    .maybeSingle<PortalSettingsRow<T>>();

  if (error || !data?.data) return fallback;
  return { ...fallback, ...data.data };
}

export async function savePortalState<T extends Record<string, unknown>>(state: T): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase client is not configured.' };

  const { error } = await supabase.from('portal_settings').upsert(
    {
      id: 1,
      data: state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function uploadPortalAsset(file: File, folder = 'opening'): Promise<{ url: string | null; error?: string }> {
  if (!supabase) return { url: null, error: 'Supabase client is not configured.' };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const path = `${folder}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: undefined };
}
