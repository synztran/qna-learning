'use server';

import { createClient } from '@/lib/supabase/server';
import type { FeedbackType } from '@qna/types';

export async function submitFeedback(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const type = formData.get('type') as FeedbackType;
  const content = (formData.get('content') as string)?.trim();

  if (!type || !['feature', 'issue'].includes(type)) {
    return { success: false, error: 'Loại góp ý không hợp lệ.' };
  }

  if (!content || content.length < 5) {
    return { success: false, error: 'Nội dung góp ý phải có ít nhất 5 ký tự.' };
  }

  if (content.length > 2000) {
    return { success: false, error: 'Nội dung góp ý không được vượt quá 2000 ký tự.' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.' };
    }

    const { error: insertError } = await supabase.from('feedbacks').insert({
      user_id: user.id,
      type,
      content,
      status: 'pending',
    });

    if (insertError) {
      return { success: false, error: 'Không thể gửi góp ý: ' + insertError.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Có lỗi xảy ra khi gửi góp ý. Vui lòng thử lại.' };
  }
}
