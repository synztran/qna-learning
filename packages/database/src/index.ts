import type { QuizRawData, Question, Lesson } from '@qna/types';
import seedDataRaw from './seed/sc5_mon_md1.json';

export * from './client';
export * from './admin';
export * from './types';
export * from './doc-converter';

export const DEFAULT_SEED_DATA = seedDataRaw as QuizRawData;

export function parseQuizJson(jsonContent: string | QuizRawData): { lessons: Lesson[]; questions: Question[] } {
  const data: QuizRawData = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
  
  const lessons: Lesson[] = (data.lessons || []).map((l) => ({
    n: l.n,
    title: l.title,
    src: l.src,
  }));

  const questions: Question[] = (data.qs || []).map((q, idx) => ({
    lesson: q.lesson,
    n: q.n || idx + 1,
    q: q.q,
    opts: {
      A: q.opts?.A || '',
      B: q.opts?.B || '',
      C: q.opts?.C || '',
      D: q.opts?.D || '',
    },
    ans: (q.ans?.toUpperCase() as 'A' | 'B' | 'C' | 'D') || 'A',
    ansText: q.ansText,
    exp: q.exp || '',
    src: q.src || '',
  }));

  return { lessons, questions };
}
