'use server';

import {
  createSupabaseAdminClient,
  parseQuizJson,
  DEFAULT_SEED_DATA,
} from '@qna/database';
import { convertDocxBufferToQuizData, parseTextToQuizData } from '@qna/database/src/doc-converter';
import type { Question, QuizRawData, UserProfile } from '@qna/types';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { readSource, writeSource } from '../../lib/question-source';

function getAdmin() {
  return createSupabaseAdminClient();
}

export interface FolderQuestionSource {
  fileName: string;
  fileType: 'json' | 'docx';
  fullPath: string;
  slug: string;
  title: string;
  lessonsCount: number;
  questionsCount: number;
  fileSizeBytes: number;
  isValid: boolean;
  errorMessage?: string;
  syncedSet?: {
    id: string;
    slug: string;
    title: string;
    isActive: boolean;
  } | null;
}

// -------------------------------------------------------------
// USER MANAGEMENT ACTIONS
// -------------------------------------------------------------
export async function listUsers(): Promise<{ users: UserProfile[]; error?: string }> {
  try {
    const supabase = getAdmin();

    // 1. Get all authentic users directly from Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authError) {
      console.error('Error querying auth users:', authError);
      return { users: [], error: authError.message };
    }

    const authUsers = authData?.users || [];

    // 2. Get profiles table for soft-ban status and display name
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*');

    const profileMap = new Map<string, any>();
    if (profiles) {
      profiles.forEach((p) => profileMap.set(p.id, p));
    }

    // 3. Merge Auth users with profiles and auto-sync missing profiles
    const missingProfiles: any[] = [];
    const users: UserProfile[] = authUsers.map((u) => {
      const p = profileMap.get(u.id);
      const isBanned = Boolean(p?.is_banned);
      const role = (p?.role || u.user_metadata?.role || 'student') as 'admin' | 'student';
      const displayName =
        p?.display_name || u.user_metadata?.display_name || u.email?.split('@')[0] || '';

      if (!p) {
        missingProfiles.push({
          id: u.id,
          email: u.email || '',
          display_name: displayName,
          role,
          is_banned: false,
        });
      }

      return {
        id: u.id,
        email: u.email || '',
        displayName,
        isBanned,
        role,
        createdAt: u.created_at,
        updatedAt: p?.updated_at || u.updated_at || u.created_at,
      };
    });

    // Auto-sync missing profiles
    if (missingProfiles.length > 0) {
      try {
        await supabase.from('profiles').upsert(missingProfiles, { onConflict: 'id' });
      } catch (e) {
        console.warn('Could not auto-upsert profiles:', e);
      }
    }

    // Sort newest first
    users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

    // 1. Update auth user metadata so ban works even if profiles table not created
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { is_banned: isBanned },
      ban_duration: isBanned ? '876000h' : 'none',
    });

    // 2. Also try updating profiles table if present
    try {
      await supabase
        .from('profiles')
        .update({ is_banned: isBanned, updated_at: new Date().toISOString() })
        .eq('id', userId);
    } catch {
      // ignore table missing error
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
    const title = (formData.get('title') as string)?.trim() || 'QNA Learning';
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
          title: 'QNA Learning',
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
export interface AdminQuizSet {
  id: string;
  title: string;
  isActive: boolean;
}

export async function listQuestionSets(): Promise<{ sets: AdminQuizSet[]; error?: string }> {
  try {
    const { data, error } = await getAdmin().from('quiz_sets').select('id, title, is_active').order('title').order('id');
    if (error) return { sets: [], error: error.message };
    return { sets: (data || []).map(set => ({ id: set.id, title: set.title, isActive: set.is_active })) };
  } catch (error) {
    return { sets: [], error: error instanceof Error ? error.message : 'Không thể tải bộ đề.' };
  }
}

export async function listQuestions(setId?: string): Promise<{ questions: Question[]; error?: string }> {
  try {
    const supabase = getAdmin();
    let query = supabase.from('questions').select('*').order('question_order', { ascending: true });

    if (setId) {
      query = query.eq('set_id', setId);
    }

    // Page explicitly: PostgREST otherwise caps results at its configured row limit.
    const data: any[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data: page, error } = await query.order('id', { ascending: true }).range(offset, offset + 499);
      if (error) return { questions: [], error: error.message };
      data.push(...(page || []));
      if (!page || page.length < 500) break;
    }

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

// -------------------------------------------------------------
// FOLDER SOURCE SCANNER & SET BUILDER ACTIONS
// -------------------------------------------------------------
function resolveSourceFolder(customPath?: string): string {
  if (customPath && customPath.trim().length > 0) {
    return path.isAbsolute(customPath) ? customPath : path.resolve(process.cwd(), customPath);
  }

  // Look in standard candidate locations
  const candidates = [
    path.resolve(process.cwd(), 'data/question-sources'),
    path.resolve(process.cwd(), '../../data/question-sources'),
    path.resolve(process.cwd(), '../data/question-sources'),
    path.resolve(process.cwd(), 'src/question_sources'),
    path.resolve(process.cwd(), 'apps/admin/src/question_sources'),
    path.resolve(process.cwd(), '../../apps/admin/src/question_sources'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  return path.resolve(process.cwd(), '../../data/question-sources');
}

export async function listQuestionSourcesFromFolder(customPath?: string): Promise<{
  folderPath: string;
  sources: FolderQuestionSource[];
  error?: string;
}> {
  try {
    const targetDir = resolveSourceFolder(customPath);

    if (!fs.existsSync(targetDir)) {
      return {
        folderPath: targetDir,
        sources: [],
        error: `Thư mục không tồn tại: ${targetDir}`,
      };
    }

    const files = await fs.promises.readdir(targetDir);
    const targetFiles = files.filter(
      (f) => f.endsWith('.json') || f.toLowerCase().endsWith('.docx')
    );

    let syncedSetsMap: Record<string, { id: string; slug: string; title: string; isActive: boolean }> = {};
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = getAdmin();
        const { data: dbSets } = await supabase.from('quiz_sets').select('id, slug, title, is_active');
        if (dbSets) {
          dbSets.forEach((s) => {
            syncedSetsMap[s.slug] = {
              id: s.id,
              slug: s.slug,
              title: s.title,
              isActive: s.is_active,
            };
          });
        }
      } catch (e) {
        console.warn('Could not query DB for synced sets:', e);
      }
    }

    const sources: FolderQuestionSource[] = [];

    for (const f of targetFiles) {
      const fullPath = path.join(targetDir, f);
      const stat = await fs.promises.stat(fullPath);
      const isDocx = f.toLowerCase().endsWith('.docx');
      const baseSlug = f
        .replace(/\.(json|docx)$/i, '')
        .replace(/_/g, '-')
        .toLowerCase();

      try {
        let lessonsCount = 0;
        let questionsCount = 0;
        let title = '';

        if (isDocx) {
          const buf = await fs.promises.readFile(fullPath);
          const docRes = await convertDocxBufferToQuizData(buf, { fileName: f });
          if (docRes.success && docRes.data) {
            lessonsCount = docRes.data.lessons.length;
            questionsCount = docRes.data.qs.length;
            title = docRes.data.title || f;
          } else {
            throw new Error(docRes.error || 'Lỗi đọc file DOCX');
          }
        } else {
          const content = await fs.promises.readFile(fullPath, 'utf-8');
          const parsed = JSON.parse(content);
          lessonsCount = Array.isArray(parsed.lessons) ? parsed.lessons.length : 0;
          questionsCount = Array.isArray(parsed.qs) ? parsed.qs.length : 0;
          title =
            parsed.title ||
            f
              .replace(/\.json$/i, '')
              .replace(/[-_]/g, ' ')
              .toUpperCase();
        }

        sources.push({
          fileName: f,
          fileType: isDocx ? 'docx' : 'json',
          fullPath,
          slug: baseSlug,
          title,
          lessonsCount,
          questionsCount,
          fileSizeBytes: stat.size,
          isValid: questionsCount > 0,
          syncedSet: syncedSetsMap[baseSlug] || null,
        });
      } catch (err: any) {
        sources.push({
          fileName: f,
          fileType: isDocx ? 'docx' : 'json',
          fullPath,
          slug: baseSlug,
          title: f,
          lessonsCount: 0,
          questionsCount: 0,
          fileSizeBytes: stat.size,
          isValid: false,
          errorMessage: err.message,
          syncedSet: syncedSetsMap[baseSlug] || null,
        });
      }
    }

    return {
      folderPath: targetDir,
      sources,
    };
  } catch (err: any) {
    return {
      folderPath: customPath || '',
      sources: [],
      error: err.message,
    };
  }
}

export async function buildSetFromFolderSource(fileName: string, customPath?: string) {
  try {
    const targetDir = resolveSourceFolder(customPath);
    const fullPath = path.join(targetDir, fileName);

    if (!fs.existsSync(fullPath)) {
      return { success: false, error: `File không tồn tại: ${fullPath}` };
    }

    const isDocx = fileName.toLowerCase().endsWith('.docx');
    let parsedData: QuizRawData;

    if (isDocx) {
      const buffer = await fs.promises.readFile(fullPath);
      const docRes = await convertDocxBufferToQuizData(buffer, { fileName });
      if (!docRes.success || !docRes.data) {
        return { success: false, error: docRes.error || 'Lỗi chuyển đổi DOCX' };
      }
      parsedData = docRes.data;

      // Auto-save the JSON counterpart to folder as well
      const jsonDest = fullPath.replace(/\.docx$/i, '.json');
      try {
        await fs.promises.writeFile(jsonDest, JSON.stringify(parsedData, null, 2), 'utf-8');
      } catch (err) {
        console.warn('Could not auto-save JSON file:', err);
      }
    } else {
      const content = await fs.promises.readFile(fullPath, 'utf-8');
      parsedData = JSON.parse(content);
    }

    const slug = fileName
      .replace(/\.(json|docx)$/i, '')
      .replace(/_/g, '-')
      .toLowerCase();
    const title =
      (parsedData as any).title ||
      fileName
        .replace(/\.(json|docx)$/i, '')
        .replace(/[-_]/g, ' ')
        .toUpperCase();

    const supabase = getAdmin();

    // 1. Create/update set
    const { data: setRecord, error: setError } = await supabase
      .from('quiz_sets')
      .upsert(
        {
          slug,
          title,
          description: `Ngân hàng câu hỏi ${title} từ file ${fileName}`,
          is_active: true,
          storage_file_path: fileName,
        },
        { onConflict: 'slug' }
      )
      .select()
      .single();

    if (setError || !setRecord) {
      if (setError?.code === 'PGRST205') {
        revalidatePath('/');
        return {
          success: true,
          message: isDocx
            ? `Đã chuyển đổi thành công sang file JSON (${parsedData.qs.length} câu)! Bộ đề sẵn sàng hoạt động ở chế độ file.`
            : `Bộ đề file JSON (${parsedData.qs.length} câu) đã sẵn sàng hoạt động ở chế độ file!`,
        };
      }
      return { success: false, error: setError?.message || 'Lỗi tạo bộ đề' };
    }

    const { lessons, questions } = parseQuizJson(parsedData);

    // 2. Insert lessons
    const lessonMap: Record<number, string> = {};
    for (const l of lessons) {
      const { data: lRecord } = await supabase
        .from('lessons')
        .insert({
          set_id: setRecord.id,
          lesson_num: l.n,
          title: l.title,
          source_doc: l.src || null,
        })
        .select()
        .single();

      if (lRecord) lessonMap[l.n] = lRecord.id;
    }

    // 3. Clear existing questions of this set and insert fresh ones
    await supabase.from('questions').delete().eq('set_id', setRecord.id);

    const questionsToInsert = questions.map((q) => ({
      set_id: setRecord.id,
      lesson_id: lessonMap[q.lesson] || null,
      lesson_num: q.lesson,
      question_order: q.n,
      question_text: q.q,
      options: q.opts as any,
      correct_option: q.ans,
      answer_text: q.ansText || q.opts[q.ans],
      explanation: q.exp,
      source_ref: q.src,
      is_active: true,
    }));

    const chunkSize = 50;
    for (let i = 0; i < questionsToInsert.length; i += chunkSize) {
      const chunk = questionsToInsert.slice(i, i + chunkSize);
      await supabase.from('questions').insert(chunk);
    }

    revalidatePath('/');
    return {
      success: true,
      message: `Đã build thành công bộ đề "${title}" với ${lessons.length} bài và ${questions.length} câu hỏi!`,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function setActiveQuizSet(setId: string, isActive = true) {
  try {
    const supabase = getAdmin();
    // Activation is independent: multiple sets can be available to learners.
    const { error } = await supabase.from('quiz_sets').update({ is_active: isActive }).eq('id', setId).select('id').single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function previewFolderSource(fileName: string, customPath?: string) {
  try {
    const targetDir = resolveSourceFolder(customPath);
    const fullPath = path.join(targetDir, fileName);

    if (!fs.existsSync(fullPath)) {
      return { success: false, error: `File không tồn tại: ${fullPath}` };
    }

    if (fileName.toLowerCase().endsWith('.docx')) {
      const buffer = await fs.promises.readFile(fullPath);
      const res = await convertDocxBufferToQuizData(buffer, { fileName });
      if (!res.success || !res.data) {
        return { success: false, error: res.error || 'Lỗi parse DOCX' };
      }
      const { lessons, questions } = parseQuizJson(res.data);
      return { success: true, lessons, questions, warnings: res.warnings };
    }

    const content = await fs.promises.readFile(fullPath, 'utf-8');
    const parsedData: QuizRawData = JSON.parse(content);
    const { lessons, questions } = parseQuizJson(parsedData);
    return { success: true, lessons, questions };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function loadQuestionSource(fileName: string, customPath?: string) {
  try {
    return { success: true as const, ...await readSource(resolveSourceFolder(customPath), fileName) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Không thể đọc nguồn.' };
  }
}

export async function saveQuestionSource(fileName: string, data: QuizRawData, version: string, customPath?: string) {
  try {
    const result = await writeSource(resolveSourceFolder(customPath), fileName, data, version);
    revalidatePath('/');
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Không thể lưu nguồn.' };
  }
}

export async function convertUploadedDocAction(formData: FormData): Promise<{
  success: boolean;
  data?: QuizRawData;
  jsonFileName?: string;
  totalQuestions?: number;
  warnings?: string[];
  error?: string;
}> {
  try {
    const file = formData.get('file') as File;
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: 'Chưa chọn file tài liệu.' };
    }
    if (file.size > 5 * 1024 * 1024) return { success: false, error: 'File tối đa 5 MB.' };

    const fileName = file.name;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let res;
    if (fileName.toLowerCase().endsWith('.docx')) {
      res = await convertDocxBufferToQuizData(buffer, { fileName });
    } else if (fileName.toLowerCase().endsWith('.txt') || fileName.toLowerCase().endsWith('.md')) {
      const text = buffer.toString('utf-8');
      res = parseTextToQuizData(text, { fileName });
    } else {
      return {
        success: false,
        error: 'Chỉ hỗ trợ file định dạng .docx, .txt hoặc .md',
      };
    }

    if (!res.success || !res.data) {
      return { success: false, error: res.error || 'Lỗi đọc tài liệu', warnings: res.warnings };
    }

    // Save JSON to standard question sources folders
    const jsonFileName = `${res.data.slug || 'question-source'}-${crypto.randomUUID().slice(0, 8)}.json`;
    const targetDir = resolveSourceFolder(formData.get('folderPath')?.toString());
    await fs.promises.mkdir(targetDir, { recursive: true });
    await fs.promises.writeFile(path.join(targetDir, jsonFileName), JSON.stringify(res.data, null, 2), { flag: 'wx' });

    revalidatePath('/');
    return {
      success: true,
      data: res.data,
      jsonFileName,
      totalQuestions: res.totalQuestions,
      warnings: res.warnings,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
