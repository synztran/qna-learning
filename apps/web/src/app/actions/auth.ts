'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function signIn(formData: FormData) {
  const email = (formData.get('email') as string)?.trim();
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Check if soft banned
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', data.user.id)
      .single();

    if (profile?.is_banned) {
      await supabase.auth.signOut();
      return { error: 'Tài khoản của bạn đã bị tạm khoá (banned). Vui lòng liên hệ quản trị viên.' };
    }
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signOut() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    const supabase = await createClient();
    await supabase.auth.signOut();
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
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email || '',
    displayName: profile?.display_name || user.email?.split('@')[0],
    isBanned: profile?.is_banned || false,
    role: profile?.role || 'student',
  };
}
