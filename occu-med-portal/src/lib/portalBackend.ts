import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function savePortalSettings(data: any) {
  const { error } = await supabase
    .from('portal_settings')
    .upsert([{ id: 1, data }]);

  if (error) {
    console.error('Supabase save failed:', error);
    throw error;
  }
}
