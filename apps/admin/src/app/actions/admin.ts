'use server';

import { createSupabaseAdminClient, parseQuizJson, DEFAULT_SEED_DATA } from '@qna/database';
import type { Question, QuizRawData, UserProfile } from '@qna/types';
import { revalidatePath } from 'next/cache';

function getAdmin() {
  return createSupabaseAdminClient();
}

// -------------------------------------------------------------
// USER MANAGEMENT ACTIONS
// -------------------------------------------------------------
export async function listUsers(): Promise<{ users: UserProfile[]; error?: string }> {
  try {
    const supabase = getAdmin();
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { users: [], error: error.message };
    }

    const users: UserProfile[] = (profiles || []).map((p) => ({
      id: p.id,
      email: p.email,
      displayName: p.display_name,
      isBanned: p.is_banned,
      role: p.role,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    return { users };
  } catch (err: any) {
    return { users: [], error: err.message };
  }
}

export async function createStudentUser(formData: FormData) {
  try {
    const email = (formData.get('email') as string)?.trim();
    const password = formData.get('password') as string;
    const displayName = (formData.get('displayName') as string)?.trim();
    const role = (formData.get('role') as string) || 'student';

    if (!email || !password) {
      return { success: false, error: 'Email và mật khẩu không được để trống.' };
    }

    const supabase = getAdmin();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName || email.split('@')[0],
        role,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Ensure profile is synced
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        display_name: displayName || email.split('@')[0],
        is_banned: false,
        role,
      });
    }

    revalidatePath('/');
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleSoftBan(userId: string, isBanned: boolean) {
  try {
    const supabase = getAdmin();
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: isBanned, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateUserPassword(userId: string, newPassword: string) {
  try {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Mật khẩu phải từ 6 ký tự trở lên.' };
    }

    const supabase = getAdmin();
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// QUESTION SETS & STORAGE ACTIONS
// -------------------------------------------------------------
export async function uploadQuestionsToStorageAndSync(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    const title = (formData.get('title') as string)?.trim() || 'SC5 - MĐ1';
    const slug = (formData.get('slug') as string)?.trim() || 'sc5-mon-md1';

    if (!file) {
      return { success: false, error: 'Vui lòng chọn file JSON câu hỏi.' };
    }

    const textContent = await file.text();
    const parsedData: QuizRawData = JSON.parse(textContent);

    const supabase = getAdmin();
    const fileName = `${slug}-${Date.now()}.json`;

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('quiz-files')
      .upload(fileName, file, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Storage upload error (continuing database sync):', uploadError.message);
    }

    // 2. Upsert Quiz Set
    const { data: setRecord, error: setError } = await supabase
      .from('quiz_sets')
      .upsert(
        {
          slug,
          title,
          description: `Ngân hàng câu hỏi ${title}`,
          is_active: true,
          storage_file_path: fileName,
        },
        { onConflict: 'slug' }
      )
      .select()
      .single();

    if (setError || !setRecord) {
      return { success: false, error: setError?.message || 'Không thể tạo quiz set' };
    }

    const { lessons, questions } = parseQuizJson(parsedData);

    // 3. Insert lessons
    const lessonMap: Record<number, string> = {};
    for (const l of lessons) {
      const { data: lRecord } = await supabase
        .from('lessons')
        .upsert(
          {
            set_id: setRecord.id,
            lesson_num: l.n,
            title: l.title,
            source_doc: l.src,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (lRecord) {
        lessonMap[l.n] = lRecord.id;
      }
    }

    // 4. Delete old questions of this set and insert new ones
    await supabase.from('questions').delete().eq('set_id', setRecord.id);

    const questionsToInsert = questions.map((q) => ({
      set_id: setRecord.id,
      lesson_id: lessonMap[q.lesson] || null,
      lesson_num: q.lesson,
      question_order: q.n,
      question_text: q.q,
      options: q.opts,
      correct_option: q.ans,
      answer_text: q.ansText || q.opts[q.ans],
      explanation: q.exp,
      source_ref: q.src,
      is_active: true,
    }));

    const { error: qError } = await supabase.from('questions').insert(questionsToInsert);
    if (qError) {
      return { success: false, error: qError.message };
    }

    revalidatePath('/');
    return {
      success: true,
      message: `Đã nhập thành công ${lessons.length} bài học và ${questions.length} câu hỏi vào set "${title}"!`,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function seedDefaultSc5Data() {
  try {
    const supabase = getAdmin();

    const { data: setRecord } = await supabase
      .from('quiz_sets')
      .upsert(
        {
          slug: 'sc5-mon-md1',
          title: 'SC5 - MĐ1',
          description: 'Hàng không dân dụng - Môn MĐ1',
          is_active: true,
          storage_file_path: 'sc5_mon_md1.json',
        },
        { onConflict: 'slug' }
      )
      .select()
      .single();

    if (!setRecord) throw new Error('Không thể khởi tạo Quiz Set');

    const { lessons, questions } = parseQuizJson(DEFAULT_SEED_DATA);

    const lessonMap: Record<number, string> = {};
    for (const l of lessons) {
      const { data: lRecord } = await supabase
        .from('lessons')
        .insert({
          set_id: setRecord.id,
          lesson_num: l.n,
          title: l.title,
          source_doc: l.src,
        })
        .select()
        .single();

      if (lRecord) lessonMap[l.n] = lRecord.id;
    }

    await supabase.from('questions').delete().eq('set_id', setRecord.id);

    const qs = questions.map((q) => ({
      set_id: setRecord.id,
      lesson_id: lessonMap[q.lesson] || null,
      lesson_num: q.lesson,
      question_order: q.n,
      question_text: q.q,
      options: q.opts,
      correct_option: q.ans,
      answer_text: q.ansText || q.opts[q.ans],
      explanation: q.exp,
      source_ref: q.src,
      is_active: true,
    }));

    await supabase.from('questions').insert(qs);
    revalidatePath('/');
    return { success: true, count: qs.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// QUESTION EDITOR ACTIONS
// -------------------------------------------------------------
export async function listQuestions(setId?: string): Promise<{ questions: Question[]; error?: string }> {
  try {
    const supabase = getAdmin();
    let query = supabase.from('questions').select('*').order('question_order', { ascending: true });

    if (setId) {
      query = query.eq('set_id', setId);
    }

    const { data, error } = await query;
    if (error) return { questions: [], error: error.message };

    const questions: Question[] = (data || []).map((q) => ({
      id: q.id,
      setId: q.set_id,
      lessonId: q.lesson_id,
      lesson: q.lesson_num,
      n: q.question_order,
      q: q.question_text,
      opts: q.options,
      ans: q.correct_option as 'A' | 'B' | 'C' | 'D',
      ansText: q.answer_text,
      exp: q.explanation || '',
      src: q.source_ref || '',
      isActive: q.is_active,
    }));

    return { questions };
  } catch (err: any) {
    return { questions: [], error: err.message };
  }
}

export async function saveQuestion(question: Partial<Question>) {
  try {
    const supabase = getAdmin();

    const record = {
      lesson_num: question.lesson || 1,
      question_order: question.n || 1,
      question_text: question.q,
      options: question.opts,
      correct_option: question.ans,
      answer_text: question.ans ? question.opts?.[question.ans] : '',
      explanation: question.exp,
      source_ref: question.src,
      is_active: question.isActive !== undefined ? question.isActive : true,
    };

    if (question.id) {
      const { error } = await supabase.from('questions').update(record).eq('id', question.id);
      if (error) return { success: false, error: error.message };
    } else {
      // Find active set
      const { data: sets } = await supabase.from('quiz_sets').select('id').limit(1);
      const setId = question.setId || sets?.[0]?.id;
      const { error } = await supabase.from('questions').insert({
        ...record,
        set_id: setId,
      });
      if (error) return { success: false, error: error.message };
    }

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteQuestion(questionId: string) {
  try {
    const supabase = getAdmin();
    const { error } = await supabase.from('questions').delete().eq('id', questionId);
    if (error) return { success: false, error: error.message };
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
