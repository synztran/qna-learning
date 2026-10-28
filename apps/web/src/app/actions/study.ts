'use server';

import { createClient } from '@/lib/supabase/server';

export async function getStudyProgress(): Promise<{
  progress?: Record<string, { reviewed: number; total: number }>; error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: active, error: sessionError } = await supabase.rpc('is_active_user');
    if (sessionError || active !== true) throw new Error('Invalid session');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Invalid session');
    const { data: profile } = await supabase.from('profiles').select('donor_level').eq('id', user.id).single();
    if (!profile || (profile.donor_level ?? 0) <= 0) {
      return { error: 'Tính năng Ôn tập chỉ khả dụng cho học viên có cấp bậc tri ân.' };
    }
    const { data, error } = await supabase.rpc('study_progress_summary');
    if (error) throw error;
    return { progress: Object.fromEntries((data || []).map((row: { set_id: string; reviewed: number; total: number }) =>
      [row.set_id, { reviewed: Number(row.reviewed), total: Number(row.total) }])) };
  } catch {
    return { error: 'Không thể tải tiến độ ôn tập. Vui lòng thử lại.' };
  }
}

export async function recordStudyProgress(questionIds: string[]): Promise<{ success: boolean; error?: string }> {
  if (!Array.isArray(questionIds) || questionIds.length < 1 || questionIds.length > 200 ||
      questionIds.some(id => typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
    return { success: false, error: 'Danh sách câu hỏi không hợp lệ.' };
  }
  try {
    const supabase = await createClient();
    const { data: active, error: sessionError } = await supabase.rpc('is_active_user');
    if (sessionError || active !== true) throw new Error('Invalid session');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Invalid session');
    const { data: profile } = await supabase.from('profiles').select('donor_level').eq('id', user.id).single();
    if (!profile || (profile.donor_level ?? 0) <= 0) {
      return { success: false, error: 'Tính năng Ôn tập chỉ khả dụng cho học viên có cấp bậc tri ân.' };
    }
    const { error } = await supabase.rpc('record_study_progress', { p_question_ids: [...new Set(questionIds)] });
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: 'Chưa lưu được tiến độ ôn tập. Kiểm tra kết nối và thử lại.' };
  }
}
