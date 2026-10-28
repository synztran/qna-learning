'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function signIn(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Vui lòng nhập đầy đủ email và mật khẩu.' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    // Demo fallback mode when credentials not configured yet
    return { success: true };
  }

  const supabase = await createClient();
  if (email.length > 254 || password.length > 1024) return { error: 'Sai thông tin đăng nhập' };
  let result;
  if (email.includes('@')) {
    result = await supabase.auth.signInWithPassword({ email, password });
  } else {
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(email)) return { error: 'Sai thông tin đăng nhập' };
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/username-login`, {
        method: 'POST', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}` },
        body: JSON.stringify({ username: email, password }),
      });
      if (!response.ok) return { error: response.status === 401 ? 'Sai thông tin đăng nhập'
        : response.status === 429 ? 'Vui lòng thử lại sau.' : 'Không thể đăng nhập. Vui lòng thử lại.' };
      const tokens = await response.json();
      result = await supabase.auth.setSession(tokens);
    } catch {
      return { error: 'Không thể đăng nhập. Vui lòng thử lại.' };
    }
  }
  const { data, error } = result;

  if (error) {
    return { error: error.code === 'invalid_credentials' || error.message === 'Invalid login credentials'
      ? 'Sai thông tin đăng nhập'
      : error.message };
  }

  // Activation checks the profile without requiring an already-active session.
  const { data: activated, error: activationError } = await supabase.rpc('activate_login_session');
  if (activationError || activated !== true) {
    await supabase.auth.signOut({ scope: 'local' });
    return { error: activationError
      ? 'Không thể xác thực phiên đăng nhập. Vui lòng thử lại hoặc liên hệ quản trị viên.'
      : 'Phiên đăng nhập đã bị thay thế hoặc tài khoản bị khóa. Vui lòng đăng nhập lại.' };
  }

  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const oldPassword = formData.get('oldPassword');
  const newPassword = formData.get('newPassword');
  const confirmPassword = formData.get('confirmPassword');

  if (typeof oldPassword !== 'string' || !oldPassword || oldPassword.length > 1024) {
    return { error: 'Vui lòng nhập mật khẩu hiện tại.' };
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 1024) {
    return { error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' };
  }

  if (newPassword === oldPassword) {
    return { error: 'Mật khẩu mới không được trùng mật khẩu hiện tại.' };
  }

  if (newPassword !== confirmPassword) {
    return { error: 'Mật khẩu xác nhận không khớp.' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return { success: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    return { error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  const { data: active, error: sessionError } = await supabase.rpc('is_active_user');
  if (sessionError || active !== true) {
    return { error: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.' };
  }

  // Verify current password against Supabase Auth
  const verifyClient = createSupabaseClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: verifyError } = await verifyClient.auth.signInWithPassword({
    email: user.email,
    password: oldPassword,
  });

  if (verifyError) {
    return { error: 'Mật khẩu hiện tại không chính xác.' };
  }

  // Revoke only the temporary verification session, not the student's session.
  await verifyClient.auth.signOut({ scope: 'local' });

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: error.message || 'Không thể cập nhật mật khẩu.' };
  }

  return { success: true };
}

export async function signOut() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: 'local' });
  }
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function getCurrentUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return {
      id: 'demo-user',
      email: 'demo@studywithmsnhung.edu',
      displayName: 'Học viên Demo',
      isBanned: false,
      donorLevel: 0,
      donorTier: null,
      donorSince: null,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: active, error: sessionError } = await supabase.rpc('is_active_user');
  if (sessionError || active !== true) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.is_banned) return null;

  return {
    id: user.id,
    email: user.email || '',
    displayName: profile?.display_name || user.email?.split('@')[0],
    userName: profile?.username || user.email?.split('@')[0],
    isBanned: profile?.is_banned || false,
    role: profile?.role || 'student',
    donorLevel: profile?.donor_level ?? 0,
    donorTier: profile?.donor_tier || null,
    donorSince: profile?.donor_since || null,
  };
}
