"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import type { Lesson, Question, OptionKey, QuizSessionItem } from "@qna/types";
import {
	ThemeToggle,
	ThiingsTrophy,
	ThiingsBook,
	ThiingsTarget,
	ThiingsSparkle,
} from "@qna/ui";
import {
	BookOpen,
	Check,
	ChevronDown,
	ChevronUp,
	Clock,
	ExternalLink,
	Flame,
	Home,
	LogOut,
	RefreshCw,
	RotateCcw,
	Sparkles,
	X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { saveQuizAttempt } from "../app/actions/quiz";
import { signOut } from "../app/actions/auth";
import Link from "next/link";
import { InstallApp } from './InstallApp';

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
	user?: {
		displayName?: string;
		email?: string;
	};
}

export function QuizEngine({
	initialLessons,
	initialQuestions,
	user,
	setId,
	setTitle,
	availableSets = [],
}: QuizEngineProps) {
	// Navigation State
	const [view, setView] = useState<"setup" | "quiz" | "result">("setup");

	// Setup State
	const [selectedLessonNums, setSelectedLessonNums] = useState<number[]>(
		() => {
			try {
				const saved = localStorage.getItem(
					`qna-lessons-${setId || "preview"}`,
				);
				if (saved) {
					const parsed = JSON.parse(saved);
					if (Array.isArray(parsed) && parsed.length > 0)
						return parsed;
				}
			} catch {}
			return initialLessons.map((l) => l.n);
		},
	);

	const [countMode, setCountMode] = useState<"20" | "25" | "all" | "custom">(
		"20",
	);
	const [customCount, setCustomCount] = useState<number>(20);

	// Active Quiz State
	const [items, setItems] = useState<QuizSessionItem[]>([]);
	const [startTime, setStartTime] = useState<number>(0);
	const [endTime, setEndTime] = useState<number | null>(null);
	const [isRetryWrong, setIsRetryWrong] = useState(false);
	const [showGridModal, setShowGridModal] = useState(false);
	const [resultFilter, setResultFilter] = useState<"all" | "bad" | "ok">(
		"all",
	);
	const [quitConfirm, setQuitConfirm] = useState(false);

	// Question Pool calculation
	const pool = useMemo(() => {
		return initialQuestions.filter((q) =>
			selectedLessonNums.includes(q.lesson),
		);
	}, [initialQuestions, selectedLessonNums]);

	const targetCount = useMemo(() => {
		const pLen = pool.length;
		if (pLen === 0) return 0;
		if (countMode === "all") return pLen;
		if (countMode === "custom")
			return Math.max(1, Math.min(customCount, pLen));
		return Math.min(parseInt(countMode, 10), pLen);
	}, [pool.length, countMode, customCount]);

	// Persist settings
	useEffect(() => {
		try {
			localStorage.setItem(
				`qna-lessons-${setId || "preview"}`,
				JSON.stringify(selectedLessonNums),
			);
		} catch {}
	}, [selectedLessonNums, setId]);

	// Handle lesson select/deselect
	const toggleLesson = (num: number) => {
		setSelectedLessonNums((prev) =>
			prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num],
		);
	};

	const toggleSelectAll = () => {
		if (selectedLessonNums.length === initialLessons.length) {
			setSelectedLessonNums([]);
		} else {
			setSelectedLessonNums(initialLessons.map((l) => l.n));
		}
	};

	// Start Quiz
	const startQuiz = (customQuestions?: Question[], retryMode = false) => {
		let sourcePool = customQuestions || pool;
		if (sourcePool.length === 0) return;

		let selectedQs =
			customQuestions || shuffle(sourcePool).slice(0, targetCount);

		const sessionItems: QuizSessionItem[] = selectedQs.map((q) => ({
			q,
			order: shuffle(OPTION_KEYS),
			first: null,
			tries: [],
			done: false,
		}));

		setItems(sessionItems);
		setStartTime(Date.now());
		setEndTime(null);
		setIsRetryWrong(retryMode);
		setView("quiz");
		setShowGridModal(false);
		window.scrollTo({ top: 0, behavior: "instant" });
	};

	// Answer selection
	const handleSelectOption = (itemIndex: number, chosenKey: OptionKey) => {
		setItems((prev) => {
			const next = [...prev];
			const it = { ...next[itemIndex] };
			if (it.done || it.tries.includes(chosenKey)) return prev;

			const tries = [...it.tries, chosenKey];
			const first = it.first === null ? chosenKey : it.first;
			const isCorrect = chosenKey === it.q.ans;

			it.tries = tries;
			it.first = first;
			if (isCorrect) {
				it.done = true;
			}
			next[itemIndex] = it;
			return next;
		});
	};

	// Scroll to question
	const scrollToQuestion = (idx: number) => {
		setShowGridModal(false);
		const el = document.getElementById(`q-card-${idx}`);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "start" });
			el.classList.add("flash-active");
			setTimeout(() => el.classList.remove("flash-active"), 1200);
		}
	};

	// Quiz Stats
	const stats = useMemo(() => {
		const total = items.length;
		const doneCount = items.filter((it) => it.done).length;
		const okCount = items.filter((it) => it.first === it.q.ans).length;
		const badCount = total - okCount;
		const score =
			total > 0 ? Math.round((okCount / total) * 1000) / 100 : 0;
		return { total, doneCount, okCount, badCount, score };
	}, [items]);

	// Finish quiz
	const handleFinishQuiz = async () => {
		if (stats.doneCount < stats.total) return;
		const finishMs = Date.now();
		setEndTime(finishMs);
		setView("result");
		window.scrollTo({ top: 0, behavior: "smooth" });

		// Save attempt record
		const wrongIds = items
			.filter((it) => it.first !== it.q.ans && it.q.id)
			.map((it) => it.q.id as string);

		await saveQuizAttempt({
			setId,
			totalQuestions: stats.total,
			correctCount: stats.okCount,
			score: stats.score,
			durationMs: finishMs - startTime,
			wrongQuestionIds: wrongIds,
		});
	};

	// Retry Wrong Only
	const handleRetryWrong = () => {
		const wrongQs = items
			.filter((it) => it.first !== it.q.ans)
			.map((it) => it.q);
		if (wrongQs.length === 0) return;
		startQuiz(wrongQs, true);
	};

	const renderLessonChoices = () => (
		<div className="grid grid-cols-1 gap-2.5">
			{initialLessons.map((lesson) => {
				const checked = selectedLessonNums.includes(lesson.n);
				const count = initialQuestions.filter(
					(question) => question.lesson === lesson.n,
				).length;
				return (
					<label
						key={lesson.n}
						className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3 ${checked ? "border-primary/40 bg-base-100" : "border-base-300 bg-base-100/40"}`}>
						<input
							type="checkbox"
							checked={checked}
							onChange={() => toggleLesson(lesson.n)}
							className="checkbox checkbox-primary checkbox-sm shrink-0"
						/>
						<span className="min-w-0 flex-1 text-xs font-semibold">
							Bài {lesson.n}.{" "}
							{lesson.title.replace(/^BÀI \d+\.\s*/i, "")}
						</span>
						<span className="badge badge-sm badge-ghost shrink-0 text-[10px]">
							{count} câu
						</span>
					</label>
				);
			})}
		</div>
	);

	/* ==============================================================
     1. SETUP VIEW
     ============================================================== */
	if (view === "setup") {
		return (
			<div className="flex flex-1 flex-col justify-between gap-4">
				{/* Header */}
				<header className="flex justify-between items-center gap-3 pb-3 border-b border-base-300">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
							<BookOpen className="w-5 h-5" />
						</div>
						<div>
							<h1 className="font-display font-bold text-lg sm:text-xl leading-tight">
								{"Ôn tập trắc nghiệm"}
							</h1>
							<p className="text-[11px] text-base-content/60">
								{user?.displayName
									? `Học viên: ${user.displayName}`
									: "Study with Ms. Nhung"}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-1">
						<ThemeToggle />
						<button
							onClick={() => signOut()}
							title="Đăng xuất"
							className="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-error">
							<LogOut className="w-4 h-4" />
						</button>
					</div>
				</header>

				{/* Content */}
				<main className="space-y-4">
					{/* Lessons Selector */}
					<section className="bg-base-200/50 backdrop-blur-sm p-4 sm:p-5 rounded-3xl border border-base-300 shadow-sm">
						<div className="flex justify-between items-center mb-3">
							<div className="flex items-center gap-2">
								<span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
								<h2 className="font-display font-bold text-sm tracking-tight">
									Chọn bài ôn tập
								</h2>
							</div>
							<button
								type="button"
								onClick={toggleSelectAll}
								className="text-xs text-primary font-semibold hover:underline">
								{selectedLessonNums.length ===
								initialLessons.length
									? "Bỏ chọn tất cả"
									: "Chọn tất cả"}
							</button>
						</div>

						<div className="space-y-3">
							{availableSets.map((set) => (
								<div key={set.id} className="space-y-2">
									<Link
										href={`/?set=${encodeURIComponent(set.id)}`}
										aria-current={
											set.id === setId
												? "true"
												: undefined
										}
										className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${set.id === setId ? "border-primary bg-base-100" : "border-base-300 bg-base-100/40 hover:border-primary/50"}`}>
										<span
											aria-hidden="true"
											className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${set.id === setId ? "border-primary" : "border-base-content/40"}`}>
											{set.id === setId && (
												<span className="h-2.5 w-2.5 rounded-full bg-primary" />
											)}
										</span>
										<span className="flex-1 text-xs font-semibold leading-snug">
											{set.title}
										</span>
										<span className="badge badge-sm badge-ghost shrink-0 text-[10px]">
											{set.questionCount} câu
										</span>
									</Link>
									{set.id === setId && (
										<div className="pl-3 border-l border-base-300">
											{renderLessonChoices()}
										</div>
									)}
								</div>
							))}
							{availableSets.length === 0 &&
								renderLessonChoices()}
						</div>
					</section>

					{/* Question Count Selector */}
					<section className="bg-base-200/50 backdrop-blur-sm p-4 sm:p-5 rounded-3xl border border-base-300 shadow-sm">
						<h2 className="font-display font-bold text-sm mb-3 tracking-tight">
							Số câu hỏi mỗi lượt
						</h2>

						<div className="grid grid-cols-4 gap-2 mb-3">
							{(["20", "25", "all", "custom"] as const).map(
								(mode) => {
									const label =
										mode === "20"
											? "20 câu"
											: mode === "25"
												? "25 câu"
												: mode === "all"
													? "Toàn bộ"
													: "Tự chọn";
									const disabled =
										(mode === "20" && pool.length < 20) ||
										(mode === "25" && pool.length < 25) ||
										pool.length === 0;

									return (
										<button
											key={mode}
											type="button"
											disabled={disabled}
											onClick={() => setCountMode(mode)}
											className={`btn btn-sm rounded-xl font-display text-xs border ${
												countMode === mode
													? "btn-primary text-primary-content border-primary shadow-sm"
													: "btn-ghost bg-base-100 border-base-300"
											}`}>
											{label}
										</button>
									);
								},
							)}
						</div>

						{countMode === "custom" && (
							<div className="p-3 bg-base-100 rounded-2xl border border-base-300 flex items-center gap-3">
								<input
									type="range"
									min="1"
									max={Math.max(1, pool.length)}
									value={customCount}
									onChange={(e) =>
										setCustomCount(
											parseInt(e.target.value, 10),
										)
									}
									className="range range-primary range-xs flex-1"
								/>
								<input
									type="number"
									min="1"
									max={Math.max(1, pool.length)}
									value={customCount}
									onChange={(e) =>
										setCustomCount(
											Math.max(
												1,
												parseInt(e.target.value, 10) ||
													1,
											),
										)
									}
									className="input input-sm input-bordered w-16 text-center font-bold text-xs rounded-xl"
								/>
							</div>
						)}

						<div className="mt-3 pt-3 border-t border-base-300/80 flex flex-wrap gap-2 justify-between items-center text-xs text-base-content/70">
							<span>
								Ngân hàng đã chọn:{" "}
								<b className="text-base-content">
									{pool.length}
								</b>{" "}
								câu
							</span>
							<span>
								Lượt này:{" "}
								<b className="text-primary text-sm font-display">
									{targetCount}
								</b>{" "}
								câu
							</span>
						</div>
					</section>
				</main>

				{/* Start Button */}
				<footer>
					<div className="mb-3"><InstallApp /></div>
					<p className="text-center text-[11px] text-base-content/60 mb-2">
						Câu hỏi và 4 phương án được trộn ngẫu nhiên mỗi lượt ôn
						tập
					</p>
					<button
						type="button"
						disabled={targetCount === 0}
						onClick={() => startQuiz()}
						className="btn btn-primary w-full py-3.5 rounded-2xl font-display font-bold text-base shadow-lg shadow-primary/25 text-primary-content active:scale-98 transition-transform leading-[1]">
						Bắt đầu làm bài ({targetCount} câu)
					</button>
				</footer>
			</div>
		);
	}

	/* ==============================================================
     2. QUIZ SESSION VIEW (iOS Optimized)
     ============================================================== */
	if (view === "quiz") {
		return (
			<div safe_bot="" className="min-h-[100dvh] pb-48 pt-2">
				{/* Sticky Mobile Bar with Rabbit Ear Clearance */}
				<div
					safe_top=""
					className="sticky top-0 z-30 bg-base-100/95 backdrop-blur-md border-b border-base-300/80 pb-2.5 px-1 -mx-1 mb-4 shadow-sm">
					<div className="flex justify-between items-center mb-2">
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => {
									if (quitConfirm) {
										setView("setup");
										setQuitConfirm(false);
									} else {
										setQuitConfirm(true);
										setTimeout(
											() => setQuitConfirm(false),
											3500,
										);
									}
								}}
								className={`btn btn-xs rounded-xl font-medium transition-all ${
									quitConfirm
										? "btn-error text-white"
										: "btn-ghost text-base-content/70"
								}`}>
								{quitConfirm
									? "Chắc chắn thoát?"
									: "← Chọn lại"}
							</button>
							{isRetryWrong && (
								<span className="badge badge-warning badge-xs text-[10px] font-semibold">
									Làm lại câu sai
								</span>
							)}
						</div>

						<div className="flex items-center gap-2">
							<div className="flex items-center gap-1.5 text-xs font-bold font-display">
								<span className="text-success font-semibold flex items-center gap-0.5">
									<Check className="w-3.5 h-3.5" />{" "}
									{stats.okCount}
								</span>
								<span className="text-base-content/30">/</span>
								<span className="text-error font-semibold flex items-center gap-0.5">
									<X className="w-3.5 h-3.5" />{" "}
									{stats.badCount}
								</span>
							</div>
							<button
								type="button"
								onClick={() => setShowGridModal(true)}
								className="btn btn-xs btn-outline btn-primary rounded-xl font-display">
								Bảng câu ({stats.doneCount}/{stats.total})
							</button>
						</div>
					</div>

					{/* Progress fill */}
					<div className="w-full bg-base-300 h-1.5 rounded-full overflow-hidden">
						<div
							className="bg-primary h-full transition-all duration-300 ease-out"
							style={{
								width: `${(stats.doneCount / stats.total) * 100}%`,
							}}
						/>
					</div>
				</div>

				{/* Questions Cards List */}
				<div className="space-y-4">
					{items.map((item, idx) => {
						const { q, order, first, tries, done } = item;
						const isFirstRight = first === q.ans;
						const isWrongFirst = first !== null && first !== q.ans;

						return (
							<article
								key={idx}
								id={`q-card-${idx}`}
								className={`card bg-base-100 border transition-all duration-200 p-4 sm:p-5 rounded-3xl shadow-sm ${
									done
										? isFirstRight
											? "border-success/30 bg-success/5"
											: "border-warning/30 bg-warning/5"
										: "border-base-300"
								}`}>
								{/* Card Header */}
								<div className="flex justify-between items-center mb-3">
									<div className="flex items-center gap-2">
										<span className="font-display font-bold text-sm text-primary">
											Câu {idx + 1}
										</span>
										<span className="text-[11px] px-2 py-0.5 rounded-md bg-base-200 text-base-content/70 font-medium">
											Bài {q.lesson} · Câu {q.n}
										</span>
									</div>

									{done ? (
										<span
											className={`badge badge-sm text-[10px] font-bold ${
												isFirstRight
													? "badge-success text-white"
													: "badge-warning text-base-content"
											}`}>
											{isFirstRight
												? "✓ Đúng ngay"
												: "Đúng sau khi chọn lại"}
										</span>
									) : isWrongFirst ? (
										<span className="badge badge-error badge-sm text-white text-[10px] font-bold">
											Sai · chọn lại
										</span>
									) : (
										<span className="badge badge-ghost badge-sm text-[10px] text-base-content/50">
											Chưa hoàn thành
										</span>
									)}
								</div>

								{/* Question Text */}
								<p className="font-semibold text-sm sm:text-base leading-snug mb-4 text-base-content select-text">
									{q.q}
								</p>

								{/* Options List */}
								<div className="grid grid-cols-1 gap-2.5">
									{order.map((key, optIdx) => {
										const text = q.opts[key];
										const isTried = tries.includes(key);
										const isCorrectAnswer = key === q.ans;

										let btnClass =
											"bg-base-200/60 border-base-300 text-base-content hover:bg-base-200";
										let mark = null;

										if (done) {
											if (isCorrectAnswer) {
												btnClass =
													"bg-success/20 border-success text-success-content font-bold shadow-sm";
												mark = "✓ Đúng";
											} else if (isTried) {
												btnClass =
													"bg-error/15 border-error text-error line-through opacity-70";
												mark = "✗";
											} else {
												btnClass =
													"opacity-40 border-base-300";
											}
										} else if (isTried) {
											btnClass =
												"bg-error/15 border-error text-error line-through opacity-75";
											mark = "✗ Sai";
										}

										return (
											<button
												key={key}
												type="button"
												disabled={done || isTried}
												onClick={() =>
													handleSelectOption(idx, key)
												}
												className={`quiz-opt-btn flex items-center justify-between text-left p-3.5 rounded-2xl border text-xs sm:text-sm font-medium ${btnClass}`}>
												<div className="flex items-center gap-3 pr-2">
													<span
														className={`w-6 h-6 rounded-xl flex items-center justify-center font-display font-bold text-xs shrink-0 ${
															done &&
															isCorrectAnswer
																? "bg-success text-white"
																: "bg-base-300 text-base-content/80"
														}`}>
														{OPTION_KEYS[optIdx]}
													</span>
													<span className="leading-snug select-text">
														{text}
													</span>
												</div>
												{mark && (
													<span className="text-[11px] font-bold shrink-0 ml-2">
														{mark}
													</span>
												)}
											</button>
										);
									})}
								</div>

								{/* Explanation Box (Revealed on correct) */}
								{done && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: "auto" }}
										className="mt-4 pt-3 border-t border-base-300/80 text-xs space-y-2 bg-base-200/40 p-3 rounded-2xl">
										<div>
											<b className="text-primary font-display">
												Giải thích:{" "}
											</b>
											<span className="text-base-content/90 leading-relaxed select-text">
												{q.exp}
											</span>
										</div>
										{q.src && (
											<div className="text-[11px] text-base-content/60 italic border-t border-base-300/40 pt-1.5">
												<b>Nguồn: </b> {q.src}
											</div>
										)}
										{idx < items.length - 1 && (
											<div className="pt-2 text-right">
												<button
													type="button"
													onClick={() =>
														scrollToQuestion(
															idx + 1,
														)
													}
													className="btn btn-xs btn-ghost text-primary font-display font-bold">
													Câu tiếp theo ↓
												</button>
											</div>
										)}
									</motion.div>
								)}
							</article>
						);
					})}

					{/* Spacer so last question card scrolls well above fixed footer on iOS */}
					<div className="h-32 sm:h-36 w-full" aria-hidden="true" />
				</div>

				{/* Floating Bottom Action Bar with Browser / Control Center Clearance */}
				<div
					safe_bot=""
					className="fixed bottom-0 left-0 right-0 px-4 pt-3 pb-[max(calc(env(safe-area-inset-bottom,0px)+1.5rem),2.5rem)] bg-base-100/95 backdrop-blur-md border-t border-base-300 z-30 flex justify-center shadow-lg">
					<div className="w-full max-w-md flex items-center justify-between gap-3">
						<button
							type="button"
							onClick={() => setShowGridModal(true)}
							className="btn btn-ghost btn-sm rounded-xl font-display text-xs">
							Xem {stats.doneCount}/{stats.total} câu
						</button>
						<button
							type="button"
							disabled={stats.doneCount < stats.total}
							onClick={handleFinishQuiz}
							className="btn btn-primary btn-sm px-5 rounded-xl font-display font-bold text-primary-content shadow-md shadow-primary/25 disabled:opacity-50">
							{stats.doneCount < stats.total
								? `Còn ${stats.total - stats.doneCount} câu chưa làm`
								: "Nộp bài & xem điểm →"}
						</button>
					</div>
				</div>

				{/* Question Grid Modal */}
				<AnimatePresence>
					{showGridModal && (
						<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
							<motion.div
								initial={{ y: "100%", opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								exit={{ y: "100%", opacity: 0 }}
								safe_bot=""
								className="w-full max-w-lg bg-base-100 rounded-t-3xl sm:rounded-3xl p-5 border border-base-300 shadow-2xl max-h-[85vh] flex flex-col">
								<div className="flex justify-between items-center pb-3 border-b border-base-300">
									<h3 className="font-display font-bold text-base">
										Bảng danh sách câu hỏi
									</h3>
									<button
										type="button"
										onClick={() => setShowGridModal(false)}
										className="btn btn-circle btn-xs btn-ghost">
										<X className="w-4 h-4" />
									</button>
								</div>

								<div className="flex items-center gap-4 py-2 text-[11px] text-base-content/70">
									<span className="flex items-center gap-1.5">
										<span className="w-3 h-3 rounded-full bg-success" />{" "}
										Đúng ngay ({stats.okCount})
									</span>
									<span className="flex items-center gap-1.5">
										<span className="w-3 h-3 rounded-full bg-warning" />{" "}
										Chọn lại ({stats.badCount})
									</span>
									<span className="flex items-center gap-1.5">
										<span className="w-3 h-3 rounded-full bg-base-300" />{" "}
										Chưa làm
									</span>
								</div>

								<div className="grid grid-cols-6 sm:grid-cols-8 gap-2 py-4 overflow-y-auto">
									{items.map((it, i) => {
										let dotStyle =
											"bg-base-200 text-base-content/70 border border-base-300";
										if (it.done) {
											if (it.first === it.q.ans) {
												dotStyle =
													"bg-success text-white font-bold border-success";
											} else {
												dotStyle =
													"bg-warning text-base-content font-bold border-warning";
											}
										}
										return (
											<button
												key={i}
												type="button"
												onClick={() =>
													scrollToQuestion(i)
												}
												className={`h-10 rounded-xl flex items-center justify-center font-display text-xs active:scale-95 transition-transform ${dotStyle}`}>
												{i + 1}
											</button>
										);
									})}
								</div>

								<div className="pt-2 border-t border-base-300">
									<button
										type="button"
										onClick={() => setShowGridModal(false)}
										className="btn btn-outline btn-sm w-full rounded-xl font-display">
										Đóng bảng câu
									</button>
								</div>
							</motion.div>
						</div>
					)}
				</AnimatePresence>
			</div>
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
				<p className="text-xs text-base-content/60 mt-0.5">
					{setTitle || "Ngân hàng câu hỏi trắc nghiệm"}
				</p>

				{/* Score Badge */}
				<div className="my-5 p-4 rounded-2xl bg-base-100 border border-base-300 inline-flex flex-col items-center">
					<div className="text-4xl sm:text-5xl font-display font-extrabold text-primary">
						{stats.score.toString().replace(".", ",")}
						<span className="text-xl font-medium text-base-content/40">
							/10
						</span>
					</div>
					<span className="text-xs font-semibold text-base-content/80 mt-1">
						{stats.okCount}/{stats.total} câu đúng ngay lần đầu
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
								if (lessonItems.length === 0) return null;
								const rightCount = lessonItems.filter(
									(it) => it.first === it.q.ans,
								).length;
								const pct = Math.round(
									(rightCount / lessonItems.length) * 100,
								);

								return (
									<div key={l.n} className="space-y-1">
										<div className="flex justify-between text-[11px] font-semibold">
											<span>Bài {l.n}</span>
											<span className="text-base-content/70">
												{rightCount}/
												{lessonItems.length} ({pct}%)
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
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<button
					type="button"
					disabled={stats.badCount === 0}
					onClick={handleRetryWrong}
					className="btn btn-warning rounded-2xl font-display font-bold text-xs sm:text-sm shadow-sm">
					<RotateCcw className="w-4 h-4 mr-1.5" />
					Làm lại {stats.badCount} câu sai
				</button>

				<button
					type="button"
					onClick={() => startQuiz()}
					className="btn btn-primary rounded-2xl font-display font-bold text-xs sm:text-sm text-primary-content shadow-sm">
					<RefreshCw className="w-4 h-4 mr-1.5" />
					Làm lại toàn bộ lượt này
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
							if (resultFilter === "bad") return !ok;
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
											className={`badge badge-xs text-[10px] font-bold ${
												ok
													? "badge-success text-white"
													: "badge-error text-white"
											}`}>
											{ok ? "Đúng ngay" : "Sai lần đầu"}
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
												className={`font-semibold ${ok ? "text-success" : "text-error"}`}>
												{first}.{" "}
												{first
													? q.opts[first]
													: "Chưa chọn"}
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

			{/* Return to Setup */}
			<div className="text-center pt-2">
				<button
					type="button"
					onClick={() => setView("setup")}
					className="btn btn-ghost btn-sm font-display text-xs">
					<Home className="w-4 h-4 mr-1.5" />
					Về màn hình chọn bài
				</button>
			</div>
		</div>
	);
}
