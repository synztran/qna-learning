"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
	DEFAULT_FEATURE_ACCESS,
	LEARNING_FEATURE_CONFIGS,
	getDonorTierByLevel,
	hasFeatureAccess,
	type FeatureAccessMap,
	type LearningFeatureKey,
} from "@qna/types";
import type { Lesson, Question, OptionKey, QuizSessionItem, LearningSummary } from "@qna/types";
import {
	ThemeToggle,
	DonorBadge,
	ThiingsTrophy,
	ThiingsBook,
	ThiingsTarget,
	ThiingsSparkle,
} from "@qna/ui";
import {
	BookOpen,
	Brain,
	CalendarClock,
	ChevronDown,
	ChevronUp,
	Clock,
	ExternalLink,
	Flame,
	Home,
	ListChecks,
	Lock,
	RefreshCw,
	RotateCcw,
	Sparkles,
	User,
	X,
} from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { getQuizData, saveQuizAttempt } from "../app/actions/quiz";
import { LogoutButton } from './LogoutButton';
import { createLeaderboardCache } from '@/lib/leaderboard-cache';
import { PerfectScoreCelebration } from './PerfectScoreCelebration';
import { DonorWelcomeModal } from './DonorWelcomeModal';
import { StudyView } from './StudyView';
import { FlashcardView } from './FlashcardView';
import { QuizSessionView } from './QuizSessionView';
import { QuizSetupView } from './QuizSetupView';
import { getStudyProgress } from '../app/actions/study';
import { getDueQuestions, getFlashcardQuestions, getLearningSummary, getWrongQuestions } from '../app/actions/learning';
import type { QuizSubmission } from '@/lib/submissions';

const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

function shuffle<T>(array: T[]): T[] {
	const arr = [...array];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

function formatDuration(ms: number): string {
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes === 0) return `${seconds} giây`;
	return `${minutes} phút ${seconds} giây`;
}

interface QuizEngineProps {
	availableSets?: { id: string; title: string; questionCount: number }[];
	setId?: string;
	setTitle?: string;
	initialLessons: Lesson[];
	initialQuestions: Question[];
	featureAccess?: FeatureAccessMap;
	user?: {
		id?: string;
		displayName?: string;
		email?: string;
		donorLevel?: number;
		donorTier?: string | null;
	};
}

export function QuizEngine({
	initialLessons: loadedLessons,
	initialQuestions: loadedQuestions,
	user,
	setId: initialSetId,
	setTitle: initialSetTitle,
	availableSets: initialAvailableSets = [],
	featureAccess,
}: QuizEngineProps) {
	const [availableSets, setAvailableSets] = useState(initialAvailableSets);
	const leaderboardCache = useRef(createLeaderboardCache());
	const access = featureAccess || DEFAULT_FEATURE_ACCESS;
	const canStudy = hasFeatureAccess(access, 'srs_review', user?.donorLevel);
	const canWrong = hasFeatureAccess(access, 'wrong_review', user?.donorLevel);
	const canFlashcards = hasFeatureAccess(access, 'flashcards', user?.donorLevel);
	const canExam = hasFeatureAccess(access, 'exam', user?.donorLevel);
	const canStreak = hasFeatureAccess(access, 'streak', user?.donorLevel);
	const [lockedFeature, setLockedFeature] = useState<LearningFeatureKey | null>(null);
	const lockedConfig = lockedFeature ? LEARNING_FEATURE_CONFIGS[lockedFeature] : null;
	const lockedTier = lockedFeature ? getDonorTierByLevel(access[lockedFeature]) : null;
	// Navigation State
	const [view, setView] = useState<"setup" | "quiz" | "result" | "study" | "flashcards">("setup");
	const [activeMode, setActiveMode] = useState<"exam" | "study">("exam");
	const [studyProgress, setStudyProgress] = useState<Record<string, { reviewed: number; total: number }> | null>(null);
	const [studyProgressError, setStudyProgressError] = useState('');
	const [studyProgressLoading, setStudyProgressLoading] = useState(false);
	const studyProgressFetchedAt = useRef(0);
	const studyProgressRequest = useRef<Promise<boolean> | null>(null);
	const studySetsLoading = activeMode === 'study' && availableSets.length > 0
		&& studyProgress === null && (studyProgressLoading || !studyProgressError);
	const refreshStudyProgress = (force = false): Promise<boolean> => {
		if (studyProgressRequest.current) return studyProgressRequest.current;
		if (!force && studyProgressFetchedAt.current > 0 && Date.now() - studyProgressFetchedAt.current < 60_000) {
			return Promise.resolve(true);
		}
		setStudyProgressLoading(true);
		setStudyProgressError('');
		const request = (async () => {
		try {
			const result = await getStudyProgress();
			if (result.error || !result.progress) throw new Error(result.error);
			setStudyProgress(result.progress);
			studyProgressFetchedAt.current = Date.now();
			return true;
		} catch {
			setStudyProgressError('Không thể tải tiến độ ôn tập. Vui lòng thử lại.');
			return false;
		} finally {
			setStudyProgressLoading(false);
			studyProgressRequest.current = null;
		}
		})();
		studyProgressRequest.current = request;
		return request;
	};
	useEffect(() => {
		if (view !== 'setup' || activeMode !== 'study' || !availableSets.length || !canStudy) return;
		void refreshStudyProgress();
		const refresh = () => { if (!document.hidden) void refreshStudyProgress(); };
		window.addEventListener('focus', refresh);
		document.addEventListener('visibilitychange', refresh);
		return () => {
			window.removeEventListener('focus', refresh);
			document.removeEventListener('visibilitychange', refresh);
		};
	}, [view, activeMode]);

	// Setup State
	const [selectedSetId, setSelectedSetId] = useState(initialSetId);
	const [setId, setSetId] = useState(initialSetId);
	const [initialLessons, setLessons] = useState(loadedLessons);
	const [pool, setPool] = useState(loadedQuestions);
	const [starting, setStarting] = useState(false);
	const startingRef = useRef(false);
	const [startError, setStartError] = useState("");
	const reduceMotion = useReducedMotion();
	const selectedLessonNums = initialLessons.map(lesson => lesson.n);
	const setTitle = availableSets.find(set => set.id === setId)?.title || initialSetTitle;
	const footerSetTitle = availableSets.find(set => set.id === selectedSetId)?.title || setTitle;
	const poolCount = availableSets.length
		? availableSets.find(set => set.id === selectedSetId)?.questionCount || 0
		: pool.length;

	// Learning summary: streak, daily goal, questions due today.
	const [learningSummary, setLearningSummary] = useState<LearningSummary | null>(null);
	const refreshLearningSummary = async () => {
		if (!user?.id || user.id === 'demo-user') return;
		const result = await getLearningSummary(selectedSetId);
		if (result.summary) setLearningSummary(result.summary);
	};
	useEffect(() => {
		if (view !== 'setup') return;
		void refreshLearningSummary();
	}, [view, selectedSetId]);

	// Extra practice: wrong-answer review, due review, flashcards.
	const [reviewLoading, setReviewLoading] = useState<"wrong" | "due" | null>(null);
	const [reviewError, setReviewError] = useState("");
	const [flashcardQuestions, setFlashcardQuestions] = useState<Question[] | null>(null);
	const [flashcardLoading, setFlashcardLoading] = useState(false);

	// Exam timer (0 = no limit).
	const [examMinutes, setExamMinutes] = useState<0 | 15 | 30 | 45 | 60>(0);
	const [remainingMs, setRemainingMs] = useState<number | null>(null);
	const deadlineRef = useRef<number | null>(null);
	const sessionModeRef = useRef<"practice" | "exam">("practice");
	const timeLimitRef = useRef<number | null>(null);
	const [sessionKind, setSessionKind] = useState<"quiz" | "wrong" | "srs">("quiz");

	const [countMode, setCountMode] = useState<"20" | "25" | "all" | "custom">(
		"20",
	);
	const [customCount, setCustomCount] = useState<number>(20);

	// Active Quiz State
	const [items, setItems] = useState<QuizSessionItem[]>([]);
	const [startTime, setStartTime] = useState<number>(0);
	const [endTime, setEndTime] = useState<number | null>(null);
	const submissionId = useRef('');
	const pendingSubmission = useRef<QuizSubmission | null>(null);
	const savingRef = useRef(false);
	const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
	const [saveError, setSaveError] = useState('');
	const [isRetryWrong, setIsRetryWrong] = useState(false);
	const [showGridModal, setShowGridModal] = useState(false);
	const [resultFilter, setResultFilter] = useState<"all" | "bad" | "ok">(
		"all",
	);
	const [quitConfirm, setQuitConfirm] = useState(false);

	const targetCount = useMemo(() => {
		const pLen = poolCount;
		if (pLen === 0) return 0;
		if (countMode === "all") return pLen;
		if (countMode === "custom")
			return Math.max(1, Math.min(customCount, pLen));
		return Math.min(parseInt(countMode, 10), pLen);
	}, [poolCount, countMode, customCount]);

	// Start Quiz
	const startQuiz = async (customQuestions?: Question[], retryMode = false, kind: "quiz" | "wrong" | "srs" = "quiz", limitMinutes = examMinutes) => {
		if (kind === "quiz" && !retryMode && !customQuestions && !canExam) {
			setLockedFeature('exam');
			return;
		}
		if (startingRef.current || savingRef.current) return;
		startingRef.current = true;
		setStarting(true);
		setStartError("");
		try {
		let sourcePool = customQuestions || pool;
		if (!customQuestions && availableSets.length) {
			if (!selectedSetId) return;
			const data = await getQuizData(selectedSetId);
			if (data.error || data.selectedSetId !== selectedSetId || !data.questions.length) {
				setStartError(data.error || "Bộ đề không có câu hỏi. Vui lòng chọn bộ đề khác.");
				return;
			}
			sourcePool = data.questions;
			setPool(data.questions);
			setLessons(data.lessons);
			setSetId(selectedSetId);
		}
		if (sourcePool.length === 0) return;
		const count = countMode === "all" ? sourcePool.length : countMode === "custom"
			? Math.max(1, Math.min(customCount, sourcePool.length))
			: Math.min(Number(countMode), sourcePool.length);

		let selectedQs =
			customQuestions || shuffle(sourcePool).slice(0, count);

		const sessionItems: QuizSessionItem[] = selectedQs.map((q) => ({
			q,
			order: shuffle(OPTION_KEYS),
			first: null,
			tries: [],
			done: false,
		}));

		setItems(sessionItems);
		submissionId.current = crypto.randomUUID();
		pendingSubmission.current = null;
		setSaveState('idle');
		setSaveError('');
		setStartTime(Date.now());
		setEndTime(null);
		setIsRetryWrong(retryMode);
		setSessionKind(kind);
		const limitMs = kind === "quiz" && limitMinutes > 0 ? limitMinutes * 60_000 : null;
		sessionModeRef.current = limitMs ? "exam" : "practice";
		timeLimitRef.current = limitMs;
		deadlineRef.current = limitMs ? Date.now() + limitMs : null;
		setRemainingMs(limitMs);
		setView("quiz");
		setShowGridModal(false);
		window.scrollTo({ top: 0, behavior: "instant" });
		} catch {
			setStartError("Không thể tải bộ đề. Kiểm tra kết nối và thử lại.");
		} finally {
			startingRef.current = false;
			setStarting(false);
		}
	};

	// Start Study Mode
	const startStudy = async () => {
		if (!canStudy) {
			setLockedFeature('srs_review');
			return;
		}
		if (startingRef.current || savingRef.current) return;
		startingRef.current = true;
		setStarting(true);
		setStartError("");
		try {
			let sourcePool = pool;
			if (availableSets.length) {
				if (!selectedSetId) {
					setStartError("Vui lòng chọn một bộ đề để ôn tập.");
					return;
				}
				const data = await getQuizData(selectedSetId);
				if (data.error || data.selectedSetId !== selectedSetId || !data.questions.length) {
					setStartError(data.error || "Bộ đề không có câu hỏi. Vui lòng chọn bộ đề khác.");
					return;
				}
				sourcePool = data.questions;
				setPool(data.questions);
				setLessons(data.lessons);
				setSetId(selectedSetId);
			}
			if (sourcePool.length === 0) {
				setStartError("Chưa có câu hỏi nào để ôn tập.");
				return;
			}
			setView("study");
			window.scrollTo({ top: 0, behavior: "instant" });
		} catch {
			setStartError("Không thể tải bộ đề. Kiểm tra kết nối và thử lại.");
		} finally {
			startingRef.current = false;
			setStarting(false);
		}
	};

	// Start wrong-answer / due review and flashcards
	const loadSelectedPool = async (): Promise<Question[] | null> => {
		if (!selectedSetId) {
			setStartError("Vui lòng chọn một bộ đề trước.");
			return null;
		}
		const data = await getQuizData(selectedSetId);
		if (data.error || data.selectedSetId !== selectedSetId || !data.questions.length) {
			setStartError(data.error || "Bộ đề không có câu hỏi. Vui lòng chọn bộ đề khác.");
			return null;
		}
		setPool(data.questions);
		setLessons(data.lessons);
		setSetId(selectedSetId);
		return data.questions;
	};

	const startReview = async (kind: "wrong" | "due") => {
		if (startingRef.current || reviewLoading) return;
		setReviewError("");
		setStartError("");
		if (kind === "due" && !canStudy) {
			setLockedFeature('srs_review');
			return;
		}
		if (kind === "wrong" && !canWrong) {
			setLockedFeature('wrong_review');
			return;
		}
		if (!selectedSetId) {
			setReviewError("Vui lòng chọn một bộ đề trước.");
			return;
		}
		setReviewLoading(kind);
		try {
			if (!await loadSelectedPool()) return;
			const result = kind === "wrong"
				? await getWrongQuestions(selectedSetId)
				: await getDueQuestions(selectedSetId);
			if (result.error) {
				setReviewError(result.error);
				return;
			}
			if (!result.questions.length) {
				setReviewError(kind === "wrong"
					? "Chưa có câu sai nào cần ôn. Hãy làm một lượt thi trước."
					: "Hôm nay không có câu nào đến hạn ôn.");
				return;
			}
			await startQuiz(result.questions, true, kind === "wrong" ? "wrong" : "srs");
		} catch {
			setReviewError("Không thể tải danh sách ôn tập. Kiểm tra kết nối và thử lại.");
		} finally {
			setReviewLoading(null);
		}
	};

	const openFlashcards = async () => {
		if (!canFlashcards) {
			setLockedFeature('flashcards');
			return;
		}
		if (startingRef.current || flashcardLoading) return;
		if (!selectedSetId) {
			setReviewError("Vui lòng chọn một bộ đề trước.");
			return;
		}
		setReviewError("");
		setFlashcardLoading(true);
		try {
			const source = await loadSelectedPool();
			if (!source) return;
			const due = await getFlashcardQuestions(selectedSetId, 100);
			if (due.error) {
				setReviewError(due.error);
				return;
			}
			const cards = due.questions.length ? due.questions : source.slice(0, 50);
			setFlashcardQuestions(cards);
			setView("flashcards");
			window.scrollTo({ top: 0, behavior: "instant" });
		} catch {
			setReviewError("Không thể tải thẻ ôn tập. Kiểm tra kết nối và thử lại.");
		} finally {
			setFlashcardLoading(false);
		}
	};

	// Answer selection
	const handleSelectOption = (itemIndex: number, chosenKey: OptionKey) => {
		setItems((prev) => {
			const next = [...prev];
			const it = { ...next[itemIndex] };
			if (it.done || it.tries.includes(chosenKey)) return prev;

			const tries = [...it.tries, chosenKey];
			const isCorrect = chosenKey === it.q.ans;
			const forceCorrect = !isCorrect && tries.length === OPTION_KEYS.length - 1;

			it.tries = forceCorrect ? [...tries, it.q.ans] : tries;
			it.first = it.first ?? (forceCorrect ? it.q.ans : chosenKey);
			if (isCorrect || forceCorrect) it.done = true;
			next[itemIndex] = it;
			return next;
		});
	};

	// Scroll to question
	const scrollToQuestion = (idx: number) => {
		setShowGridModal(false);
		const el = document.getElementById(`q-card-${idx}`);
		if (el) {
			el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
			el.classList.add("flash-active");
			setTimeout(() => el.classList.remove("flash-active"), 1200);
		}
	};

	const handleQuizQuit = () => {
		if (quitConfirm) {
			deadlineRef.current = null;
			setRemainingMs(null);
			setView("setup");
			setQuitConfirm(false);
		} else {
			setQuitConfirm(true);
			setTimeout(() => setQuitConfirm(false), 3500);
		}
	};

	// Quiz Stats
	const stats = useMemo(() => {
		const total = items.length;
		const doneCount = items.filter((it) => it.done).length;
		const answeredItems = items.filter((it) => it.first !== null);
		const scoredTotal = answeredItems.length;
		const okCount = answeredItems.filter((it) => it.first === it.q.ans).length;
		const badCount = scoredTotal - okCount;
		// Unanswered questions are left out of the score, matching the server submission.
		const score =
			scoredTotal > 0 ? Math.round((okCount / scoredTotal) * 1000) / 100 : 0;
		const progressPercent = total ? (doneCount / total) * 100 : 0;
		return { total, doneCount, scoredTotal, okCount, badCount, score, progressPercent };
	}, [items]);

	const persistSubmission = async () => {
		if (savingRef.current || !pendingSubmission.current) return;
		savingRef.current = true;
		setSaveState('saving');
		try {
			const result = await saveQuizAttempt(pendingSubmission.current);
			if (result.success) {
				setSaveState('saved');
				leaderboardCache.current.fetchedAt = 0;
			}
			else { setSaveState('error'); setSaveError(result.error || 'Không thể lưu bài nộp. Vui lòng thử lại.'); }
		} catch {
			setSaveState('error');
			setSaveError('Không thể lưu bài nộp. Kiểm tra kết nối và thử lại.');
		} finally {
			savingRef.current = false;
		}
	};

	// Finish quiz (manual requires every question answered; the timer may submit partial answers).
	const handleFinishQuiz = async (auto = false) => {
		if (savingRef.current) return;
		const answered = items.filter(item => item.first !== null);
		if (!auto && answered.length < items.length) return;
		const finishMs = Date.now();
		deadlineRef.current = null;
		setRemainingMs(null);
		setEndTime(finishMs);
		setView("result");
		window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });

		if (answered.length === 0) {
			setSaveState('error');
			setSaveError('Hết giờ nhưng chưa có câu trả lời nào để lưu.');
			return;
		}
		if (!setId || answered.some(item => !item.q.id || !item.first)) {
			setSaveState('error');
			setSaveError('Chế độ xem thử không lưu lịch sử.');
			return;
		}
		pendingSubmission.current = {
			submissionId: submissionId.current, setId,
			// Auto-submit can fire late when the tab sleeps; cap the recorded exam duration at its limit.
			durationMs: sessionModeRef.current === "exam" && timeLimitRef.current
				? Math.min(finishMs - startTime, timeLimitRef.current)
				: finishMs - startTime,
			isRetry: isRetryWrong || sessionKind !== "quiz",
			answers: answered.map(item => ({ questionId: item.q.id!, first: item.first! })),
			mode: sessionModeRef.current,
			timeLimitMs: timeLimitRef.current,
		};
		await persistSubmission();
	};

	const finishRef = useRef<(auto: boolean) => void>(() => {});
	finishRef.current = (auto) => { void handleFinishQuiz(auto); };
	useEffect(() => {
		if (view !== "quiz" || !deadlineRef.current) return;
		const tick = () => {
			const left = Math.max(0, (deadlineRef.current ?? 0) - Date.now());
			setRemainingMs(left);
			if (left <= 0) {
				deadlineRef.current = null;
				finishRef.current(true);
			}
		};
		tick();
		const interval = window.setInterval(tick, 1000);
		return () => window.clearInterval(interval);
	}, [view]);

	const handleSetupRefresh = async () => {
		if (activeMode === 'study') setStudyProgressLoading(true);
		try {
			const data = await getQuizData(selectedSetId);
			const fresh = data.error && data.sets.length > 0 ? await getQuizData() : data;
			if (fresh.error) throw new Error(fresh.error);
			setAvailableSets(fresh.sets);
			setSelectedSetId(fresh.selectedSetId);
			setSetId(fresh.selectedSetId);
			setPool(fresh.questions);
			setLessons(fresh.lessons);
			setStartError('');
			if (activeMode === 'study' && fresh.sets.length && !await refreshStudyProgress(true)) throw new Error('Không thể tải tiến độ ôn tập.');
		} catch (error) {
			if (activeMode === 'study') setStudyProgressError('Không thể tải dữ liệu ôn tập. Vui lòng thử lại.');
			throw error;
		} finally { setStudyProgressLoading(false); }
	};

	// Retry Wrong Only
	const handleRetryWrong = () => {
		const wrongQs = items
			.filter((it) => it.first !== null && it.first !== it.q.ans)
			.map((it) => it.q);
		if (wrongQs.length === 0) return;
		startQuiz(wrongQs, true);
	};

	/* ==============================================================
     1. SETUP VIEW
     ============================================================== */
	if (view === "setup") {
		return (
			<>
				<DonorWelcomeModal user={user} />
				<QuizSetupView
					availableSets={availableSets} selectedSetId={selectedSetId} setSelectedSetId={setSelectedSetId}
					user={user} canExam={canExam} canStudy={canStudy} canWrong={canWrong} canFlashcards={canFlashcards} canStreak={canStreak}
					activeMode={activeMode} setActiveMode={setActiveMode} starting={starting} saveState={saveState}
					studyProgressLoading={studyProgressLoading} onRefresh={handleSetupRefresh} studySetsLoading={studySetsLoading}
					studyProgressError={studyProgressError} studyProgress={studyProgress} refreshStudyProgress={refreshStudyProgress}
					setStartError={setStartError} setLockedFeature={setLockedFeature} poolCount={poolCount} learningSummary={learningSummary}
					countMode={countMode} setCountMode={setCountMode} customCount={customCount} setCustomCount={setCustomCount}
					examMinutes={examMinutes} setExamMinutes={setExamMinutes} targetCount={targetCount} reviewLoading={reviewLoading}
					flashcardLoading={flashcardLoading} reviewError={reviewError} startReview={startReview} openFlashcards={openFlashcards}
					footerSetTitle={footerSetTitle} startError={startError} startQuiz={startQuiz} startStudy={startStudy}
					leaderboardCache={leaderboardCache.current} lockedFeature={lockedFeature} lockedConfig={lockedConfig}
					lockedTier={lockedTier} onCloseLockedFeature={() => setLockedFeature(null)}
				/>
			</>
		);
	}

	/* ==============================================================
     2. FLASHCARD VIEW
     ============================================================== */
	if (view === "flashcards") {
		return (
			<FlashcardView
				questions={flashcardQuestions || pool}
				setTitle={setTitle}
				onBack={() => {
					setView("setup");
					void refreshLearningSummary();
				}}
			/>
		);
	}

	/* ==============================================================
     2. STUDY VIEW
     ============================================================== */
	if (view === "study") {
		return (
			<StudyView
				questions={pool}
				lessons={initialLessons}
				setTitle={setTitle}
				onBack={() => setView("setup")}
				onProgressSaved={() => { studyProgressFetchedAt.current = 0; }}
			/>
		);
	}

	/* ==============================================================
     2. QUIZ SESSION VIEW (iOS Optimized)
     ============================================================== */
	if (view === "quiz") {
		return (
			<QuizSessionView
				items={items}
				stats={stats}
				sessionKind={sessionKind}
				isExam={sessionModeRef.current === "exam"}
				remainingMs={remainingMs}
				quitConfirm={quitConfirm}
				showGridModal={showGridModal}
				reduceMotion={Boolean(reduceMotion)}
				onQuit={handleQuizQuit}
				onOpenGrid={() => setShowGridModal(true)}
				onCloseGrid={() => setShowGridModal(false)}
				onSelectOption={handleSelectOption}
				onScrollToQuestion={scrollToQuestion}
				onFinish={() => void handleFinishQuiz()}
			/>
		);
	}

	/* ==============================================================
     3. RESULT VIEW
     ============================================================== */
	return (
		<div
			safe_top=""
			safe_bot=""
			className="min-h-[100dvh] py-4 sm:py-6 space-y-6">
			{/* Trophy & Score Header */}
			<div className="card bg-base-200/60 backdrop-blur-sm border border-base-300 p-6 sm:p-8 rounded-3xl text-center shadow-lg shadow-primary/5">
				<div className="flex justify-center mb-3">
					<ThiingsTrophy size={64} className="drop-shadow-md" />
				</div>

				<h2 className="font-display text-2xl font-bold tracking-tight">
					Kết quả ôn tập
				</h2>
				{stats.total > 0 && stats.okCount === stats.total && (
					<PerfectScoreCelebration total={stats.total} />
				)}
				<div className="my-3 text-sm" aria-live="polite">
					{saveState === 'saving' && <p role="status">Đang lưu bài nộp…</p>}
					{saveState === 'saved' && <p role="status">Đã lưu bài nộp vào lịch sử.</p>}
					{saveState === 'error' && <div className="space-y-2"><p role="alert" className="text-error">{saveError}</p>
						{pendingSubmission.current && <button type="button" onClick={persistSubmission} className="btn btn-outline btn-sm">Thử lưu lại</button>}
						<p className="text-xs text-base-content/70">Giữ trang này để thử lưu lại trước khi bắt đầu lượt mới.</p>
					</div>}
					{items.some(item => item.first === null) && (
						<p className="text-xs text-warning">
							{items.filter(item => item.first === null).length} câu chưa trả lời (hết giờ hoặc bỏ trống) không được tính điểm.
						</p>
					)}
				</div>
				<p className="text-xs text-base-content/60 mt-0.5">
					{setTitle || "Ngân hàng câu hỏi trắc nghiệm"}
				</p>

				{/* Score Badge */}
				<div className="my-5 p-4 rounded-2xl bg-base-100 border border-base-300 inline-flex flex-col items-center">
					<div className="text-6xl sm:text-7xl font-display font-extrabold text-primary">
						{stats.score.toString().replace(".", ",")}
						{/* <span className="text-xl font-medium text-base-content/40">
							/10
						</span> */}
					</div>
					<span className="text-xs font-semibold text-base-content/80 mt-1">
						{stats.okCount}/{stats.scoredTotal} câu đúng ngay lần đầu
						{stats.total > stats.scoredTotal && (
							<span className="text-base-content/60"> · {stats.total - stats.scoredTotal} câu bỏ trống</span>
						)}
					</span>
				</div>

				{/* Quick Stats Grid */}
				<div className="grid grid-cols-2 gap-3 text-left">
					<div className="p-3 bg-base-100 rounded-2xl border border-base-300 text-xs">
						<div className="text-base-content/60 text-[11px]">
							Thời gian làm bài
						</div>
						<div className="font-bold font-display mt-0.5">
							{endTime
								? formatDuration(endTime - startTime)
								: "0s"}
						</div>
					</div>
					<div className="p-3 bg-base-100 rounded-2xl border border-base-300 text-xs">
						<div className="text-base-content/60 text-[11px]">
							Đúng ngay / Sai lần đầu
						</div>
						<div className="font-bold font-display mt-0.5 text-success">
							{stats.okCount}{" "}
							<span className="text-base-content/40">/</span>{" "}
							<span className="text-error">{stats.badCount}</span>
						</div>
					</div>
				</div>

				{/* Breakdown by lesson */}
				<div className="mt-5 pt-4 border-t border-base-300 text-left">
					<h4 className="font-display font-bold text-xs mb-3 text-base-content/80">
						Theo từng bài đã chọn
					</h4>
					<div className="space-y-2">
						{initialLessons
							.filter((l) => selectedLessonNums.includes(l.n))
							.map((l) => {
								const lessonItems = items.filter(
									(it) => it.q.lesson === l.n,
								);
								const scoredItems = lessonItems.filter(
									(it) => it.first !== null,
								);
								if (scoredItems.length === 0) return null;
								const rightCount = scoredItems.filter(
									(it) => it.first === it.q.ans,
								).length;
								const pct = Math.round(
									(rightCount / scoredItems.length) * 100,
								);

								return (
									<div key={l.n} className="space-y-1">
										<div className="flex justify-between text-[11px] font-semibold">
											<span>Bài {l.n}</span>
											<span className="text-base-content/70">
												{rightCount}/
												{scoredItems.length} ({pct}%)
											</span>
										</div>
										<div className="w-full bg-base-300 h-1.5 rounded-full overflow-hidden">
											<div
												className="bg-primary h-full rounded-full transition-all duration-300"
												style={{ width: `${pct}%` }}
											/>
										</div>
									</div>
								);
							})}
					</div>
				</div>
			</div>

			{/* Action Buttons */}
			<div className="text-center">
				<button
					type="button"
					onClick={() => setView("setup")}
					className="btn btn-outline btn-sm font-display text-xs">
					<Home className="w-5 h-5 mr-1.5" />
					Về màn hình chọn bài
				</button>
			</div>
			<div className="grid grid-cols-2 gap-2 sm:gap-3">
				<button
					type="button"
					disabled={stats.badCount === 0 || saveState === 'saving' || starting}
					onClick={handleRetryWrong}
					className="btn btn-warning min-w-0 h-auto min-h-12 gap-1 px-2 py-3 rounded-2xl font-display font-bold text-xs sm:text-sm shadow-sm">
					<RotateCcw className="w-5 h-5 shrink-0" />
					Làm lại {stats.badCount} câu sai
				</button>

				<button
					type="button"
					onClick={() => startQuiz()}
					disabled={saveState === 'saving' || starting}
					className="btn btn-primary min-w-0 h-auto min-h-12 gap-1 px-2 py-3 rounded-2xl font-display font-bold text-xs sm:text-sm text-primary-content shadow-sm">
					<RefreshCw className="w-5 h-5 shrink-0" />
					Làm lại toàn bộ
				</button>
			</div>

			{/* Answer Review Section */}
			<section className="bg-base-200/50 backdrop-blur-sm p-4 sm:p-5 rounded-3xl border border-base-300 shadow-sm space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-base-300">
					<h3 className="font-display font-bold text-sm">
						Xem lại đáp án chi tiết
					</h3>
					<div className="join">
						<button
							type="button"
							onClick={() => setResultFilter("all")}
							className={`join-item btn btn-xs font-display ${
								resultFilter === "all"
									? "btn-active btn-neutral"
									: "btn-ghost"
							}`}>
							Tất cả ({stats.total})
						</button>
						<button
							type="button"
							onClick={() => setResultFilter("bad")}
							className={`join-item btn btn-xs font-display ${
								resultFilter === "bad"
									? "btn-active btn-error text-white"
									: "btn-ghost"
							}`}>
							Câu sai ({stats.badCount})
						</button>
						<button
							type="button"
							onClick={() => setResultFilter("ok")}
							className={`join-item btn btn-xs font-display ${
								resultFilter === "ok"
									? "btn-active btn-success text-white"
									: "btn-ghost"
							}`}>
							Câu đúng ({stats.okCount})
						</button>
					</div>
				</div>

				<div className="space-y-3">
					{items
						.filter((it) => {
							const ok = it.first === it.q.ans;
							if (resultFilter === "bad") return it.first !== null && !ok;
							if (resultFilter === "ok") return ok;
							return true;
						})
						.map((item, idx) => {
							const { q, first } = item;
							const ok = first === q.ans;

							return (
								<div
									key={idx}
									className={`p-4 rounded-2xl border bg-base-100 text-xs space-y-2 ${
										ok
											? "border-success/30"
											: "border-error/30"
									}`}>
									<div className="flex justify-between items-center">
										<span className="font-display font-bold text-primary">
											Bài {q.lesson} · Câu {q.n}
										</span>
										<span
											className={`badge badge-xs text-[10px] font-bold py-2 ${
												ok
													? "badge-success text-white"
													: first === null
														? "badge-ghost text-base-content/70"
														: "badge-error text-white"
											}`}>
											{ok ? "Đúng ngay" : first === null ? "Chưa trả lời" : "Sai lần đầu"}
										</span>
									</div>

									<p className="font-semibold text-base-content select-text">
										{q.q}
									</p>

									<div className="space-y-1 pt-1 text-[11px]">
										<div className="flex items-center gap-2">
											<span className="text-base-content/60 w-28 shrink-0">
												Bạn chọn lần đầu:
											</span>
											<span
												className={`font-semibold ${ok ? "text-success" : first === null ? "text-base-content/60" : "text-error"}`}>
												{first ? `${first}. ${q.opts[first]}` : "Chưa chọn"}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<span className="text-base-content/60 w-28 shrink-0">
												Đáp án chính xác:
											</span>
											<span className="font-semibold text-success">
												{q.ans}. {q.opts[q.ans]}
											</span>
										</div>
									</div>

									{q.exp && (
										<div className="mt-2 pt-2 border-t border-base-300/60 text-base-content/80 text-[11px]">
											<b>Giải thích: </b> {q.exp}
										</div>
									)}
								</div>
							);
						})}
				</div>
			</section>

		</div>
	);
}
