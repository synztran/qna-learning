import 'server-only';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HISTORY_PAGE_SIZE, UUID, type AttemptSummary, type AnswerSnapshot } from './submissions';

const summaryColumns = 'id,set_title,created_at,duration_ms,score,total_questions,correct_count,is_retry,server_verified';

export async function recordsClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/login');
  const { data: active, error: sessionError } = await client.rpc('is_active_user');
  if (sessionError || active !== true) redirect('/login?error=session_replaced');
  const { data: profile, error } = await client.from('profiles').select('is_banned').eq('id', user.id).single();
  if (error || !profile || profile.is_banned) redirect('/login');
  return { client, user };
}

export async function getHistory(page: number) {
  const session = await recordsClient();
  if (!session) return { attempts: [] as AttemptSummary[], hasNext: false, error: 'Lịch sử không khả dụng trong chế độ xem thử.' };
  const from = (page - 1) * HISTORY_PAGE_SIZE;
  const { data, error } = await session.client.from('quiz_attempts').select(summaryColumns)
    .eq('user_id', session.user.id).order('created_at', { ascending: false }).order('id', { ascending: false })
    .range(from, from + HISTORY_PAGE_SIZE);
  return { attempts: (data || []).slice(0, HISTORY_PAGE_SIZE) as AttemptSummary[],
    hasNext: (data?.length || 0) > HISTORY_PAGE_SIZE,
    error: error ? 'Không thể tải lịch sử. Vui lòng thử lại hoặc liên hệ quản trị viên.' : undefined };
}

export async function getAttempt(id: string) {
  const session = await recordsClient();
  if (!session || !UUID.test(id)) return { attempt: null };
  const { data, error } = await session.client.from('quiz_attempts').select(`${summaryColumns},answers`)
    .eq('user_id', session.user.id).eq('id', id).maybeSingle();
  return { attempt: data as (AttemptSummary & { answers: AnswerSnapshot[] | null }) | null,
    error: error ? 'Không thể tải bài nộp. Vui lòng thử lại.' : undefined };
}

export interface LeaderboardRow {
  rank: number;
  display_name: string;
  correct: number;
  total: number;
  accuracy: number;
}

export async function getLeaderboard() {
  const session = await recordsClient();
  if (!session) return { rows: [] as LeaderboardRow[], error: 'Xếp hạng không khả dụng trong chế độ xem thử.' };
  const { data, error } = await session.client.rpc('quiz_leaderboard');
  return { rows: (data || []) as LeaderboardRow[],
    error: error ? 'Không thể tải bảng xếp hạng. Vui lòng thử lại hoặc liên hệ quản trị viên.' : undefined };
}
