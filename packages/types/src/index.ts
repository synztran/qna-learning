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

export type DonorTier = 'hieu_hoc' | 'uyen_bac' | 'tinh_hoa';

export interface DonorTierConfig {
  tier: DonorTier;
  level: number;
  label: string;
  shortLabel: string;
  icon: string;
  badgeClass: string;
  description: string;
}

export const DONOR_TIER_CONFIGS: Record<DonorTier, DonorTierConfig> = {
  hieu_hoc: {
    tier: 'hieu_hoc',
    level: 1,
    label: 'Hiếu Học',
    shortLabel: 'Hiếu Học',
    icon: '🌱',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400',
    description: 'Người đồng hành hiếu học, tiếp sức tri thức',
  },
  uyen_bac: {
    tier: 'uyen_bac',
    level: 2,
    label: 'Uyên Bác',
    shortLabel: 'Uyên Bác',
    icon: '🎓',
    badgeClass: 'bg-sky-500/10 text-sky-600 border border-sky-500/20 dark:text-sky-400',
    description: 'Người bảo trợ tri thức uyên bác, tiếp bước tương lai',
  },
  tinh_hoa: {
    tier: 'tinh_hoa',
    level: 3,
    label: 'Tinh Hoa',
    shortLabel: 'Tinh Hoa',
    icon: '👑',
    badgeClass: 'bg-amber-500/15 text-amber-600 border border-amber-500/30 dark:text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
    description: 'Nhà bảo trợ tinh hoa, cột trụ cộng đồng học tập',
  },
};

export function getDonorTierByLevel(level?: number | null): DonorTierConfig | null {
  if (!level || level <= 0) return null;
  if (level >= 3) return DONOR_TIER_CONFIGS.tinh_hoa;
  if (level === 2) return DONOR_TIER_CONFIGS.uyen_bac;
  return DONOR_TIER_CONFIGS.hieu_hoc;
}

export function getDonorTierBySlug(slug?: string | null): DonorTierConfig | null {
  if (!slug) return null;
  return DONOR_TIER_CONFIGS[slug as DonorTier] || null;
}

export type LearningFeatureKey =
  | 'wrong_review'
  | 'srs_review'
  | 'flashcards'
  | 'exam'
  | 'streak'
  | 'stats';

export interface LearningFeatureConfig {
  key: LearningFeatureKey;
  label: string;
  description: string;
  defaultMinDonorLevel: number;
}

export const LEARNING_FEATURE_CONFIGS: Record<LearningFeatureKey, LearningFeatureConfig> = {
  wrong_review: {
    key: 'wrong_review',
    label: 'Ôn câu sai',
    description: 'Luyện lại các câu đã làm sai trong bài thi.',
    defaultMinDonorLevel: 0,
  },
  srs_review: {
    key: 'srs_review',
    label: 'Ôn theo lịch',
    description: 'Chế độ Ôn tập và danh sách câu đến hạn theo lịch Leitner.',
    defaultMinDonorLevel: 1,
  },
  flashcards: {
    key: 'flashcards',
    label: 'Flashcard',
    description: 'Lật thẻ và tự chấm mức độ ghi nhớ.',
    defaultMinDonorLevel: 1,
  },
  exam: {
    key: 'exam',
    label: 'Thi thử',
    description: 'Làm bài thi có giới hạn thời gian và tính điểm.',
    defaultMinDonorLevel: 0,
  },
  streak: {
    key: 'streak',
    label: 'Chuỗi ngày & mục tiêu',
    description: 'Hiển thị chuỗi ngày học và mục tiêu số câu mỗi ngày.',
    defaultMinDonorLevel: 0,
  },
  stats: {
    key: 'stats',
    label: 'Thống kê học tập',
    description: 'Biểu đồ tiến độ, độ chính xác và thống kê theo bài.',
    defaultMinDonorLevel: 1,
  },
};

export const LEARNING_FEATURE_KEYS = Object.keys(LEARNING_FEATURE_CONFIGS) as LearningFeatureKey[];

export type FeatureAccessMap = Record<LearningFeatureKey, number>;

export const DEFAULT_FEATURE_ACCESS: FeatureAccessMap = LEARNING_FEATURE_KEYS.reduce(
  (access, key) => ({ ...access, [key]: LEARNING_FEATURE_CONFIGS[key].defaultMinDonorLevel }),
  {} as FeatureAccessMap,
);

export interface FeatureAccessConfig extends LearningFeatureConfig {
  minDonorLevel: number;
  updatedAt?: string | null;
}

export function getFeatureMinDonorLevel(
  access: Partial<FeatureAccessMap> | null | undefined,
  key: LearningFeatureKey,
): number {
  return access?.[key] ?? DEFAULT_FEATURE_ACCESS[key];
}

export function hasFeatureAccess(
  access: Partial<FeatureAccessMap> | null | undefined,
  key: LearningFeatureKey,
  donorLevel: number | null | undefined,
): boolean {
  return (donorLevel ?? 0) >= getFeatureMinDonorLevel(access, key);
}

export interface QuizSet {
  id: string;
  slug: string;
  title: string;
  description?: string;
  isActive: boolean;
  minDonorLevel?: number;
  storageFilePath?: string;
  lessons?: Lesson[];
  questions?: Question[];
  createdAt: string;
}

export interface QuizRawData {
  title?: string;
  slug?: string;
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
  userName?: string;
  id: string;
  email: string;
  displayName?: string;
  isBanned: boolean;
  role: 'admin' | 'student';
  donorLevel?: number;
  donorTier?: DonorTier | string | null;
  donorSince?: string | null;
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

export type FeedbackType = 'feature' | 'issue';
export type FeedbackStatus = 'pending' | 'verified' | 'resolved' | 'rejected';

/** Flashcard self-grade mapped to Leitner boxes: again, hard, good, easy. */
export type FlashcardGrade = 0 | 1 | 2 | 3;

export interface LearningSummary {
  due: number;
  todayAnswered: number;
  todayCorrect: number;
  dailyGoal: number;
  streak: number;
  goalMet: boolean;
  streakLocked?: boolean;
}

export interface LessonLearningStat {
  lessonNum: number;
  total: number;
  answered: number;
  correct: number;
  mastered: number;
}

export interface DailyLearningPoint {
  day: string;
  answered: number;
  correct: number;
  seconds: number;
}

export interface LearningTotals {
  totalQuestions: number;
  answered: number;
  correct: number;
  mastered: number;
  learning: number;
}

export interface LearningStats {
  summary: LearningSummary;
  totals: LearningTotals;
  lessons: LessonLearningStat[];
  trend: DailyLearningPoint[];
}

export type ExamMode = 'practice' | 'exam';

export interface FeedbackItem {
  id: string;
  userId: string;
  type: FeedbackType;
  content: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
  userEmail?: string;
  userDisplayName?: string;
  userName?: string;
}

declare global {
  namespace React {
    interface HTMLAttributes<T> {
      safe_top?: string | boolean;
      safe_bot?: string | boolean;
    }
  }
}
