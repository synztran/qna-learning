export type OptionKey = 'A' | 'B' | 'C' | 'D';

export interface Lesson {
  id?: string;
  setId?: string;
  n: number;
  title: string;
  src?: string;
  questionCount?: number;
}

export interface Question {
  id?: string;
  setId?: string;
  lessonId?: string;
  lesson: number;
  n: number;
  q: string;
  opts: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  ans: OptionKey;
  ansText?: string;
  exp: string;
  src?: string;
  isActive?: boolean;
}

export interface QuizSet {
  id: string;
  slug: string;
  title: string;
  description?: string;
  isActive: boolean;
  storageFilePath?: string;
  lessons?: Lesson[];
  questions?: Question[];
  createdAt: string;
}

export interface QuizRawData {
  lessons: Array<{
    n: number;
    title: string;
    src?: string;
  }>;
  qs: Array<{
    lesson: number;
    n: number;
    q: string;
    opts: Record<string, string>;
    ans: OptionKey;
    ansText?: string;
    exp: string;
    src?: string;
  }>;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  isBanned: boolean;
  role: 'admin' | 'student';
  createdAt: string;
  updatedAt: string;
}

export interface QuizSessionItem {
  q: Question;
  order: OptionKey[];
  first: OptionKey | null;
  tries: OptionKey[];
  done: boolean;
}

export interface QuizSession {
  items: QuizSessionItem[];
  lessons: number[];
  start: number;
  end: number | null;
  isRetryWrong?: boolean;
}

export interface QuizAttemptRecord {
  id?: string;
  userId?: string;
  setId?: string;
  totalQuestions: number;
  correctCount: number;
  score: number;
  durationMs: number;
  wrongQuestionIds?: string[];
  createdAt?: string;
}
