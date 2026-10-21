import type { OptionKey } from '@qna/types';

export interface QuizSubmission {
  submissionId: string;
  setId: string;
  durationMs: number;
  isRetry: boolean;
  answers: { questionId: string; first: OptionKey }[];
}

export interface AnswerSnapshot {
  questionId: string;
  question: string;
  options: Record<OptionKey, string>;
  first: OptionKey;
  correct: OptionKey;
  explanation: string;
  lesson: number;
}

export interface AttemptSummary {
  id: string;
  set_title: string | null;
  created_at: string;
  duration_ms: number;
  score: number;
  total_questions: number;
  correct_count: number;
  is_retry: boolean;
  server_verified: boolean;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const HISTORY_PAGE_SIZE = 20;

export function validSubmission(value: QuizSubmission): boolean {
  return Boolean(value && UUID.test(value.submissionId) && UUID.test(value.setId) &&
    Number.isInteger(value.durationMs) && value.durationMs >= 0 && value.durationMs <= 86400000 &&
    typeof value.isRetry === 'boolean' && Array.isArray(value.answers) &&
    value.answers.length > 0 && value.answers.length <= 1000 &&
    value.answers.every(a => a && UUID.test(a.questionId) && ['A', 'B', 'C', 'D'].includes(a.first)) &&
    new Set(value.answers.map(a => a.questionId.toLowerCase())).size === value.answers.length);
}

export function historyPage(value?: string): number {
  const page = Number(value || 1);
  return Number.isSafeInteger(page) && page >= 1 && page <= 10000 ? page : 1;
}

export function accuracy(correct: number, total: number): string {
  return `${(total > 0 ? correct * 100 / total : 0).toFixed(1)}%`;
}
