'use server';

import { createClient } from '@/lib/supabase/server';
import { DEFAULT_SEED_DATA, parseQuizJson } from '@qna/database';
import type { Lesson, Question } from '@qna/types';
import { validSubmission, type QuizSubmission } from '@/lib/submissions';

export async function getQuizData(setId?: string): Promise<{
  lessons: Lesson[]; questions: Question[];
  sets: { id: string; title: string; questionCount: number }[];
  selectedSetId?: string; error?: string;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return { ...parseQuizJson(DEFAULT_SEED_DATA), sets: [] };
  }

  try {
    const supabase = await createClient();

    // Query active sets, lessons, and questions
    const { data: sets, error: setsError } = await supabase
      .from('quiz_sets')
      .select('id, title, slug, questions(count)')
      .eq('is_active', true)
      .eq('questions.is_active', true)
      .order('title', { ascending: true })
      .order('id', { ascending: true });

    if (setsError) throw setsError;
    const availableSets = (sets || []).map(set => ({
      id: set.id, title: set.title, questionCount: set.questions?.[0]?.count || 0,
    }));

    const activeSetId = setId ? availableSets.find(set => set.id === setId)?.id : availableSets[0]?.id;

    if (!activeSetId) {
      return { lessons: [], questions: [], sets: availableSets,
        error: setId ? 'Bộ đề không tồn tại hoặc chưa được kích hoạt.' : 'Chưa có bộ đề được kích hoạt.' };
    }

    const [{ data: lessonsData, error: lessonsError }, { data: questionsData, error: questionsError }] = await Promise.all([
      supabase
        .from('lessons')
        .select('*')
        .eq('set_id', activeSetId)
        .order('lesson_num', { ascending: true }),
      supabase
        .from('questions')
        .select('*')
        .eq('set_id', activeSetId)
        .eq('is_active', true)
        .order('question_order', { ascending: true }),
    ]);

    if (lessonsError) throw lessonsError;
    if (questionsError) throw questionsError;
    if (!lessonsData?.length || !questionsData?.length) return {
      lessons: [], questions: [], sets: availableSets, selectedSetId: activeSetId,
      error: 'Bộ đề chưa có đầy đủ bài học và câu hỏi. Vui lòng liên hệ quản trị viên.',
    };

    const lessons: Lesson[] = lessonsData.map((l) => ({
      id: l.id,
      setId: l.set_id,
      n: l.lesson_num,
      title: l.title,
      src: l.source_doc,
    }));

    const questions: Question[] = questionsData.map((q) => ({
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
    }));

    return { lessons, questions, sets: availableSets, selectedSetId: activeSetId };
  } catch (err) {
    console.error('Failed to fetch quiz data from Supabase:', err);
    return { lessons: [], questions: [], sets: [], error: 'Không thể tải bộ đề từ Supabase. Vui lòng thử lại hoặc liên hệ quản trị viên.' };
  }
}

export async function saveQuizAttempt(record: QuizSubmission) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return { success: false, error: 'Chế độ xem thử không lưu lịch sử.' };
  if (!validSubmission(record)) return { success: false, error: 'Bài nộp không hợp lệ. Vui lòng kiểm tra bộ đề và thử lại.' };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabase.rpc('submit_quiz_attempt', {
      p_submission_id: record.submissionId,
      p_set_id: record.setId,
      p_answers: record.answers,
      p_duration_ms: record.durationMs,
      p_is_retry: record.isRetry,
    });

    if (error) {
      return { success: false, error: 'Không thể lưu bài nộp. Kiểm tra kết nối hoặc liên hệ quản trị viên, rồi thử lưu lại.' };
    }

    return { success: true };
  } catch (err) {
    console.error('Save attempt error:', err);
    return { success: false };
  }
}
