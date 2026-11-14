'use server';

import { createClient } from '@/lib/supabase/server';
import { getFeatureAccessError, readFeatureAccess } from '@/lib/feature-access';
import { DEFAULT_FEATURE_ACCESS } from '@qna/types';
import type {
  DailyLearningPoint,
  FeatureAccessMap,
  FlashcardGrade,
  LearningStats,
  LearningSummary,
  LessonLearningStat,
  Question,
} from '@qna/types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMPTY_SUMMARY: LearningSummary = {
  due: 0,
  todayAnswered: 0,
  todayCorrect: 0,
  dailyGoal: 20,
  streak: 0,
  goalMet: false,
};

function hasEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function mapQuestion(row: any): Question {
  return {
    id: row.id,
    setId: row.set_id,
    lessonId: row.lesson_id,
    lesson: row.lesson_num,
    n: row.question_order,
    q: row.question_text,
    opts: row.options,
    ans: row.correct_option,
    ansText: row.answer_text,
    exp: row.explanation || '',
    src: row.source_ref || '',
    isActive: row.is_active,
  };
}

async function activeClient() {
  const supabase = await createClient();
  const { data: active, error } = await supabase.rpc('is_active_user');
  if (error || active !== true) throw new Error('Invalid session');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Invalid session');
  return { supabase, user };
}

export async function getFeatureAccess(): Promise<FeatureAccessMap> {
  if (!hasEnv()) return { ...DEFAULT_FEATURE_ACCESS };
  try {
    const supabase = await createClient();
    return await readFeatureAccess(supabase);
  } catch {
    return { ...DEFAULT_FEATURE_ACCESS };
  }
}

export async function getLearningSummary(setId?: string): Promise<{ summary: LearningSummary; error?: string }> {
  if (!hasEnv()) return { summary: EMPTY_SUMMARY };
  if (setId && !UUID.test(setId)) return { summary: EMPTY_SUMMARY, error: 'Bộ đề không hợp lệ.' };
  try {
    const { supabase, user } = await activeClient();
    const [summaryResult, streakLocked] = await Promise.all([
      supabase.rpc('learning_summary', { p_set_id: setId || null }),
      getFeatureAccessError(supabase, user.id, 'streak').then(error => Boolean(error)),
    ]);
    const { data, error } = summaryResult;
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { summary: EMPTY_SUMMARY };
    return {
      summary: {
        due: Number(row.due ?? 0),
        todayAnswered: Number(row.today_answered ?? 0),
        todayCorrect: Number(row.today_correct ?? 0),
        dailyGoal: Number(row.daily_goal ?? 20),
        streak: streakLocked ? 0 : Number(row.streak ?? 0),
        goalMet: streakLocked ? false : Boolean(row.goal_met),
        streakLocked,
      },
    };
  } catch {
    return { summary: EMPTY_SUMMARY, error: 'Không thể tải tiến độ học tập.' };
  }
}

export async function getDueQuestions(setId: string, limit = 50): Promise<{ questions: Question[]; error?: string }> {
  if (!UUID.test(setId)) return { questions: [], error: 'Bộ đề không hợp lệ.' };
  if (!hasEnv()) return { questions: [] };
  try {
    const { supabase, user } = await activeClient();
    const accessError = await getFeatureAccessError(supabase, user.id, 'srs_review');
    if (accessError) return { questions: [], error: accessError };
    const { data, error } = await supabase.rpc('due_questions', { p_set_id: setId, p_limit: limit });
    if (error) throw error;
    return { questions: (data || []).map(mapQuestion) };
  } catch {
    return { questions: [], error: 'Không thể tải danh sách câu cần ôn.' };
  }
}

export async function getFlashcardQuestions(setId: string, limit = 100): Promise<{ questions: Question[]; error?: string }> {
  if (!UUID.test(setId)) return { questions: [], error: 'Bộ đề không hợp lệ.' };
  if (!hasEnv()) return { questions: [] };
  try {
    const { supabase, user } = await activeClient();
    const accessError = await getFeatureAccessError(supabase, user.id, 'flashcards');
    if (accessError) return { questions: [], error: accessError };
    const { data, error } = await supabase.rpc('due_questions', { p_set_id: setId, p_limit: limit });
    if (error) throw error;
    return { questions: (data || []).map(mapQuestion) };
  } catch {
    return { questions: [], error: 'Không thể tải thẻ ôn tập.' };
  }
}

export async function getWrongQuestions(setId: string, limit = 50): Promise<{ questions: Question[]; error?: string }> {
  if (!UUID.test(setId)) return { questions: [], error: 'Bộ đề không hợp lệ.' };
  if (!hasEnv()) return { questions: [] };
  try {
    const { supabase, user } = await activeClient();
    const accessError = await getFeatureAccessError(supabase, user.id, 'wrong_review');
    if (accessError) return { questions: [], error: accessError };
    const { data, error } = await supabase.rpc('wrong_questions', { p_set_id: setId, p_limit: limit });
    if (error) throw error;
    return { questions: (data || []).map(mapQuestion) };
  } catch {
    return { questions: [], error: 'Không thể tải danh sách câu sai.' };
  }
}

export async function recordLearningAnswer(
  questionId: string,
  grade: FlashcardGrade,
  countActivity = true,
): Promise<{ success: boolean; error?: string }> {
  if (!UUID.test(questionId) || ![0, 1, 2, 3].includes(grade)) {
    return { success: false, error: 'Dữ liệu ôn tập không hợp lệ.' };
  }
  if (!hasEnv()) return { success: true };
  try {
    const { supabase } = await activeClient();
    const { error } = await supabase.rpc('record_learning_answer', {
      p_question_id: questionId,
      p_grade: grade,
      p_count_activity: countActivity,
    });
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: 'Chưa lưu được kết quả ôn tập. Vui lòng thử lại.' };
  }
}

export async function setDailyGoal(goal: number): Promise<{ success: boolean; goal?: number; error?: string }> {
  if (!Number.isInteger(goal) || goal < 5 || goal > 100) {
    return { success: false, error: 'Mục tiêu phải từ 5 đến 100 câu mỗi ngày.' };
  }
  if (!hasEnv()) return { success: true, goal };
  try {
    const { supabase } = await activeClient();
    const { error } = await supabase.rpc('set_daily_goal', { p_goal: goal });
    if (error) throw error;
    return { success: true, goal };
  } catch {
    return { success: false, error: 'Chưa lưu được mục tiêu. Vui lòng thử lại.' };
  }
}

export async function getLearningSets(): Promise<{ sets: { id: string; title: string }[] }> {
  if (!hasEnv()) return { sets: [] };
  try {
    const { supabase } = await activeClient();
    const { data, error } = await supabase
      .from('quiz_sets')
      .select('id,title')
      .eq('is_active', true)
      .order('title');
    if (error) throw error;
    return { sets: (data || []).map((row: any) => ({ id: row.id, title: row.title || 'Bộ đề' })) };
  } catch {
    return { sets: [] };
  }
}

export async function getLearningStats(
  setId: string | undefined,
  days = 30,
): Promise<{ stats?: LearningStats; error?: string }> {
  if (setId && !UUID.test(setId)) return { error: 'Bộ đề không hợp lệ.' };
  if (!hasEnv()) return { error: 'Chưa cấu hình Supabase để tải thống kê.' };
  try {
    const { supabase, user } = await activeClient();
    const accessError = await getFeatureAccessError(supabase, user.id, 'stats');
    if (accessError) return { error: accessError };
    const setArg = setId || null;
    const [summaryResult, totalsResult, lessonsResult, trendResult, streakLocked] = await Promise.all([
      supabase.rpc('learning_summary', { p_set_id: setArg }),
      supabase.rpc('learning_totals', { p_set_id: setArg }),
      setId ? supabase.rpc('learning_lesson_stats', { p_set_id: setId }) : Promise.resolve({ data: [], error: null }),
      supabase.rpc('learning_daily_trend', { p_days: days }),
      getFeatureAccessError(supabase, user.id, 'streak').then(error => Boolean(error)),
    ]);
    if (summaryResult.error) throw summaryResult.error;
    if (totalsResult.error) throw totalsResult.error;
    if (lessonsResult.error) throw lessonsResult.error;
    if (trendResult.error) throw trendResult.error;

    const summaryRow = Array.isArray(summaryResult.data) ? summaryResult.data[0] : summaryResult.data;
    const totalsRow = Array.isArray(totalsResult.data) ? totalsResult.data[0] : totalsResult.data;

    const lessons: LessonLearningStat[] = ((lessonsResult.data || []) as any[]).map((row) => ({
      lessonNum: Number(row.lesson_num),
      total: Number(row.total ?? 0),
      answered: Number(row.answered ?? 0),
      correct: Number(row.correct ?? 0),
      mastered: Number(row.mastered ?? 0),
    }));
    const trend: DailyLearningPoint[] = ((trendResult.data || []) as any[]).map((row) => ({
      day: String(row.day),
      answered: Number(row.answered ?? 0),
      correct: Number(row.correct ?? 0),
      seconds: Number(row.seconds ?? 0),
    }));

    return {
      stats: {
        summary: {
          due: Number(summaryRow?.due ?? 0),
          todayAnswered: Number(summaryRow?.today_answered ?? 0),
          todayCorrect: Number(summaryRow?.today_correct ?? 0),
          dailyGoal: Number(summaryRow?.daily_goal ?? 20),
          streak: streakLocked ? 0 : Number(summaryRow?.streak ?? 0),
          goalMet: streakLocked ? false : Boolean(summaryRow?.goal_met),
          streakLocked,
        },
        totals: {
          totalQuestions: Number(totalsRow?.total_questions ?? 0),
          answered: Number(totalsRow?.answered ?? 0),
          correct: Number(totalsRow?.correct ?? 0),
          mastered: Number(totalsRow?.mastered ?? 0),
          learning: Number(totalsRow?.learning ?? 0),
        },
        lessons,
        trend,
      },
    };
  } catch {
    return { error: 'Không thể tải thống kê học tập. Vui lòng thử lại.' };
  }
}
