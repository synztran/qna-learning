'use server';

import { createClient } from '@/lib/supabase/server';
import { DEFAULT_SEED_DATA, parseQuizJson } from '@qna/database';
import type { Lesson, Question, QuizAttemptRecord } from '@qna/types';

export async function getQuizData(): Promise<{ lessons: Lesson[]; questions: Question[] }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return parseQuizJson(DEFAULT_SEED_DATA);
  }

  try {
    const supabase = await createClient();

    // Query active sets, lessons, and questions
    const { data: sets } = await supabase
      .from('quiz_sets')
      .select('id, title, slug')
      .eq('is_active', true)
      .limit(1);

    const activeSetId = sets?.[0]?.id;

    if (!activeSetId) {
      return parseQuizJson(DEFAULT_SEED_DATA);
    }

    const [{ data: lessonsData }, { data: questionsData }] = await Promise.all([
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

    if (!lessonsData || lessonsData.length === 0 || !questionsData || questionsData.length === 0) {
      return parseQuizJson(DEFAULT_SEED_DATA);
    }

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

    return { lessons, questions };
  } catch (err) {
    console.error('Failed to fetch from Supabase, using seed fallback:', err);
    return parseQuizJson(DEFAULT_SEED_DATA);
  }
}

export async function saveQuizAttempt(record: QuizAttemptRecord) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return { success: true };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabase.from('quiz_attempts').insert({
      user_id: user.id,
      set_id: record.setId || null,
      total_questions: record.totalQuestions,
      correct_count: record.correctCount,
      score: record.score,
      duration_ms: record.durationMs,
      wrong_question_ids: record.wrongQuestionIds || [],
    });

    if (error) {
      console.error('Error saving attempt:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Save attempt error:', err);
    return { success: false };
  }
}
