'use server';

import { createClient } from '@/lib/supabase/server';

export async function checkLoginSession(): Promise<'active' | 'replaced' | 'unavailable'> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return 'active';
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) return 'unavailable';
    if (!user) return 'replaced';
    const { data, error } = await supabase.rpc('is_active_user');
    if (error) return 'unavailable';
    return data === true ? 'active' : 'replaced';
  } catch {
    return 'unavailable';
  }
}
