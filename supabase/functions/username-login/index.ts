import { createClient } from 'npm:@supabase/supabase-js@2';

const response = (body: object, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const denied = () => response({ error: 'Sai thông tin đăng nhập' }, 401);

Deno.serve(async request => {
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
  try {
    const raw = await request.text();
    if (raw.length > 8192) return denied();
    const { username, password } = JSON.parse(raw);
    if (typeof username !== 'string' || !/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username) ||
        typeof password !== 'string' || !password || password.length > 1024) return denied();
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
      new TextEncoder().encode(`username:${username}`)))).map(v => v.toString(16).padStart(2, '0')).join('');
    const { data: allowed, error: limitError } = await admin.rpc('consume_username_login_limit', { p_key: hash, p_limit: 10 });
    if (limitError || allowed !== true) return response({ error: 'Vui lòng thử lại sau.' }, 429);
    const { data: profile, error } = await admin.from('profiles').select('email,is_banned').eq('username', username).maybeSingle();
    if (error) return response({ error: 'Không thể đăng nhập. Vui lòng thử lại.' }, 503);
    // Unknown and banned names still perform one password verification to reduce timing differences.
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error: authError } = await auth.auth.signInWithPassword({
      email: profile?.email || 'unknown-username@invalid.invalid', password,
    });
    if (authError || !data.session || !profile || profile.is_banned) {
      if (data.session) await auth.auth.signOut({ scope: 'local' });
      return denied();
    }
    return response({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  } catch {
    return response({ error: 'Không thể đăng nhập. Vui lòng thử lại.' }, 503);
  }
});
