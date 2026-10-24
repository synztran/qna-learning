"use client";

import React, { useState, useMemo, useRef } from "react";
import { recordStudyProgress } from '../app/actions/study';
import type { Lesson, Question, OptionKey } from "@qna/types";
import {
	ArrowLeft,
	BookOpen,
	Check,
	ChevronUp,
	Eye,
	EyeOff,
	Filter,
	Search,
	Sparkles,
	X,
} from "lucide-react";

const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

interface StudyViewProps {
	questions: Question[];
	lessons: Lesson[];
	setTitle?: string;
	onBack: () => void;
	onProgressSaved?: () => void;
}

export function StudyView({
	questions,
	lessons,
	setTitle,
	onBack,
	onProgressSaved,
}: StudyViewProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const pendingProgress = useRef(new Set<string>());
	const savingProgress = useRef(false);
	const [progressSaving, setProgressSaving] = useState(false);
	const [progressError, setProgressError] = useState('');
	const persistProgress = async () => {
		if (savingProgress.current || pendingProgress.current.size === 0) return;
		savingProgress.current = true;
		setProgressSaving(true);
		setProgressError('');
		try {
			while (pendingProgress.current.size > 0) {
				const batch = [...pendingProgress.current].slice(0, 200);
				const result = await recordStudyProgress(batch);
				if (!result.success) throw new Error(result.error);
				onProgressSaved?.();
				batch.forEach(id => pendingProgress.current.delete(id));
			}
		} catch {
			setProgressError('Chưa lưu được tiến độ. Vui lòng thử lại trước khi về chọn bài.');
		} finally {
			savingProgress.current = false;
			setProgressSaving(false);
		}
	};
	const trackProgress = (keys: (string | number)[]) => {
		for (const key of keys) {
			// Preview questions have no database ID and must never be persisted.
			if (typeof key === 'string' && questions.some(question => question.id === key)) pendingProgress.current.add(key);
		}
		void persistProgress();
	};
	const goBack = () => {
		if (savingProgress.current) return;
		if (pendingProgress.current.size) {
			setProgressError('Tiến độ chưa lưu. Thử lưu lại hoặc chọn rời trang không lưu.');
			return;
		}
		onBack();
	};
	const [selectedLesson, setSelectedLesson] = useState<number | "all">("all");
	const [revealedIds, setRevealedIds] = useState<Set<string | number>>(
		() => new Set(),
	);
	const [userGuesses, setUserGuesses] = useState<
		Record<string | number, OptionKey>
	>({});

	// Map lesson number to lesson title for fast lookup
	const lessonTitleMap = useMemo(() => {
		const map = new Map<number, string>();
		for (const l of lessons) {
			map.set(l.n, l.title);
		}
		return map;
	}, [lessons]);

	// Unique list of lesson numbers present in questions
	const availableLessonNums = useMemo(() => {
		const set = new Set<number>();
		for (const q of questions) {
			if (typeof q.lesson === "number") set.add(q.lesson);
		}
		return Array.from(set).sort((a, b) => a - b);
	}, [questions]);

	// Filtered questions based on lesson and search term
	const filteredQuestions = useMemo(() => {
		const qTrim = searchQuery.trim().toLowerCase();
		return questions.filter((q) => {
			if (selectedLesson !== "all" && q.lesson !== selectedLesson) {
				return false;
			}
			if (!qTrim) return true;

			const inQuestion = q.q.toLowerCase().includes(qTrim);
			const inExplanation = q.exp?.toLowerCase().includes(qTrim);
			const inOptions = OPTION_KEYS.some((key) =>
				q.opts[key]?.toLowerCase().includes(qTrim),
			);
			return inQuestion || inExplanation || inOptions;
		});
	}, [questions, selectedLesson, searchQuery]);

	const getQuestionKey = (q: Question, idx: number): string | number => {
		return q.id || `idx-${questions.indexOf(q)}`;
	};

	const isRevealed = (key: string | number) => revealedIds.has(key);

	const toggleReveal = (key: string | number) => {
		if (!revealedIds.has(key)) trackProgress([key]);
		setRevealedIds((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const handleSelectOptionInStudy = (
		key: string | number,
		chosen: OptionKey,
	) => {
		trackProgress([key]);
		setUserGuesses((prev) => ({ ...prev, [key]: chosen }));
		// Automatically reveal when user taps an option
		setRevealedIds((prev) => {
			const next = new Set(prev);
			next.add(key);
			return next;
		});
	};

	const areAllVisibleRevealed = useMemo(() => {
		if (filteredQuestions.length === 0) return false;
		return filteredQuestions.every((q, idx) =>
			revealedIds.has(getQuestionKey(q, idx)),
		);
	}, [filteredQuestions, revealedIds]);

	const toggleRevealAll = () => {
		if (areAllVisibleRevealed) {
			// Hide all visible
			setRevealedIds((prev) => {
				const next = new Set(prev);
				for (let i = 0; i < filteredQuestions.length; i++) {
					next.delete(getQuestionKey(filteredQuestions[i], i));
				}
				return next;
			});
		} else {
			// Reveal all visible
			trackProgress(filteredQuestions.map(getQuestionKey));
			setRevealedIds((prev) => {
				const next = new Set(prev);
				for (let i = 0; i < filteredQuestions.length; i++) {
					next.add(getQuestionKey(filteredQuestions[i], i));
				}
				return next;
			});
		}
	};

	const scrollToTop = () => {
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	return (
		<div className="flex flex-1 flex-col gap-4">
			{/* Top Navigation Bar */}
			<header className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-base-300">
				<button
					type="button"
					onClick={goBack}
					disabled={progressSaving}
					className="btn btn-ghost btn-sm rounded-xl font-display text-xs gap-1.5 -ml-2 text-base-content/80 hover:text-primary">
					<ArrowLeft className="w-4 h-4" />
					Về chọn bài
				</button>

				<div className="text-right ml-auto">
					<div className="badge badge-primary badge-outline text-[11px] font-bold font-display">
						Chế độ Ôn tập
					</div>
				</div>
			</header>

			{progressSaving && <p role="status" className="text-xs text-base-content/70">Đang lưu tiến độ…</p>}
			{progressError && <div role="alert" className="space-y-2 text-xs text-error">
				<p>{progressError}</p>
				<div className="flex flex-wrap gap-2">
					<button type="button" disabled={progressSaving} onClick={() => void persistProgress()} className="btn btn-sm btn-outline">Thử lưu lại</button>
					<button type="button" disabled={progressSaving} onClick={onBack} className="btn btn-sm btn-ghost">Rời trang không lưu</button>
				</div>
			</div>}
			{/* Title & Set Info */}
			<div className="bg-base-200/50 backdrop-blur-sm p-4 rounded-3xl border border-base-300 space-y-2">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
						<BookOpen className="w-4 h-4" />
					</div>
					<div className="min-w-0">
						<h1 className="font-display font-bold text-base sm:text-lg leading-tight truncate">
							{setTitle || "Bộ câu hỏi ôn tập"}
						</h1>
						<p className="text-[11px] text-base-content/60">
							Đang hiển thị {filteredQuestions.length}/
							{questions.length} câu hỏi
						</p>
					</div>
				</div>
			</div>

			{/* Search & Filter Toolbar */}
			<div className="space-y-3">
				{/* Search Input */}
				<div className="relative">
					<Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Tìm kiếm nội dung câu hỏi, từ khóa, đáp án..."
						className="input input-sm input-bordered w-full pl-9 pr-9 rounded-2xl text-xs bg-base-100"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-base-content/40 hover:text-base-content">
							<X className="w-3.5 h-3.5" />
						</button>
					)}
				</div>

				{/* Filter Controls Row */}
				<div className="flex flex-wrap items-center justify-between gap-2">
					{/* Lesson Filter */}
					{availableLessonNums.length > 1 && (
						<div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
							<Filter className="w-3.5 h-3.5 text-base-content/50 shrink-0" />
							<select
								value={selectedLesson}
								onChange={(e) =>
									setSelectedLesson(
										e.target.value === "all"
											? "all"
											: Number(e.target.value),
									)
								}
								className="select select-bordered select-xs rounded-xl text-xs flex-1 max-w-xs bg-base-100">
								<option value="all">
									Tất cả bài học ({questions.length} câu)
								</option>
								{availableLessonNums.map((num) => {
									const title = lessonTitleMap.get(num);
									const count = questions.filter(
										(q) => q.lesson === num,
									).length;
									return (
										<option key={num} value={num}>
											Bài {num}
											{title ? `: ${title}` : ""} ({count}{" "}
											câu)
										</option>
									);
								})}
							</select>
						</div>
					)}

					{/* Global Toggle Button */}
					<button
						type="button"
						onClick={toggleRevealAll}
						className={`btn btn-xs rounded-xl font-display text-[11px] gap-1.5 ml-auto border ${
							areAllVisibleRevealed
								? "btn-outline border-base-300 text-base-content/70"
								: "btn-primary text-primary-content border-primary"
						}`}>
						{areAllVisibleRevealed ? (
							<>
								<EyeOff className="w-3.5 h-3.5" />
								Ẩn tất cả đáp án
							</>
						) : (
							<>
								<Eye className="w-3.5 h-3.5" />
								Hiện tất cả đáp án
							</>
						)}
					</button>
				</div>
			</div>

			{/* Question List */}
			<main className="space-y-4 my-2">
				{filteredQuestions.length === 0 ? (
					<div className="bg-base-200/50 backdrop-blur-sm p-8 rounded-3xl border border-base-300 text-center space-y-3">
						<p className="text-sm font-semibold text-base-content/70">
							Không tìm thấy câu hỏi phù hợp.
						</p>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="btn btn-sm btn-outline rounded-xl font-display text-xs">
								Xóa tìm kiếm
							</button>
						)}
					</div>
				) : (
					filteredQuestions.map((q, idx) => {
						const key = getQuestionKey(q, idx);
						const revealed = isRevealed(key);
						const guess = userGuesses[key];
						const lessonTitle = lessonTitleMap.get(q.lesson);

						return (
							<article
								key={key}
								id={`study-q-${key}`}
								className={`p-4 sm:p-5 rounded-3xl border bg-base-100/90 shadow-sm transition-all space-y-3.5 ${
									revealed
										? "border-primary/40"
										: "border-base-300"
								}`}>
								{/* Question Header */}
								<div className="flex items-center justify-between gap-2 border-b border-base-300/60 pb-2.5">
									<div className="flex items-center gap-2 flex-wrap w-full">
										<div className="flex items-center justify-between w-full">
											<span className="font-display font-bold text-xs text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg">
												Câu {idx + 1}
											</span>
											<button
												type="button"
												onClick={() =>
													toggleReveal(key)
												}
												className="btn btn-outline btn-xs rounded-lg text-[11px] font-display gap-1 text-base-content/70 hover:text-primary">
												{revealed ? (
													<>
														<EyeOff className="w-3 h-3" />
														Ẩn đáp án
													</>
												) : (
													<>
														<Eye className="w-3 h-3" />
														Xem đáp án
													</>
												)}
											</button>
										</div>
										{/* <span className="text-[11px] font-medium text-base-content/60">
											Bài {q.lesson}
											{lessonTitle
												? ` · ${lessonTitle}`
												: ""}
										</span> */}
									</div>
								</div>

								{/* Question Text */}
								<p className="font-semibold text-sm sm:text-base leading-snug text-base-content select-text">
									{q.q}
								</p>

								{/* Options List */}
								<div className="grid grid-cols-1 gap-2 pt-1">
									{OPTION_KEYS.map((optKey) => {
										const text = q.opts[optKey];
										if (!text) return null;

										const isCorrect = optKey === q.ans;
										const isUserPick = guess === optKey;

										let cardClass =
											"bg-base-200/50 border-base-300 text-base-content hover:bg-base-200/80";
										let badge = null;

										if (revealed) {
											if (isCorrect) {
												cardClass =
													"bg-success/15 border-2 border-success text-success font-semibold shadow-sm";
												badge = (
													<span
														className="w-5 h-5 rounded-full bg-success text-white flex items-center justify-center shrink-0 shadow-sm"
														title="Đáp án đúng"
														aria-label="Đáp án đúng">
														<Check className="w-3.5 h-3.5 stroke-[3]" />
													</span>
												);
											} else if (isUserPick) {
												cardClass =
													"bg-error/10 border-error/50 text-error line-through opacity-80";
												badge = (
													<span
														className="w-5 h-5 rounded-full bg-error text-white flex items-center justify-center shrink-0"
														title="Bạn chọn"
														aria-label="Bạn chọn">
														<X className="w-3.5 h-3.5 stroke-[3]" />
													</span>
												);
											} else {
												cardClass =
													"opacity-50 border-base-300/60 bg-base-100";
											}
										}

										return (
											<button
												key={optKey}
												type="button"
												onClick={() =>
													handleSelectOptionInStudy(
														key,
														optKey,
													)
												}
												className={`flex items-center justify-between text-left p-3 rounded-2xl border text-xs sm:text-sm transition-all gap-2.5 ${cardClass}`}>
												<div className="flex items-center gap-2.5 flex-1 min-w-0">
													<span
														className={`w-5 h-5 rounded-lg flex items-center justify-center font-display font-bold text-xs shrink-0 ${
															revealed &&
															isCorrect
																? "bg-success text-white"
																: "bg-base-300/80 text-base-content"
														}`}>
														{optKey}
													</span>
													<span
														className={`select-text leading-relaxed flex-1 ${revealed && isCorrect ? "text-success font-semibold" : ""}`}>
														{text}
													</span>
												</div>
												{badge}
											</button>
										);
									})}
								</div>

								{/* Explanation Box (Visible when revealed) */}
								{revealed && (
									<div className="mt-3 pt-3 border-t border-base-300/70 text-xs space-y-2 bg-base-200/40 p-3.5 rounded-2xl">
										<div className="flex items-start gap-1.5">
											<Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
											<div className="space-y-1">
												<span className="font-display font-bold text-primary">
													Đáp án chính xác: {q.ans}
												</span>
												{q.exp && (
													<p className="text-base-content/90 leading-relaxed select-text pt-0.5">
														<b>Giải thích: </b>
														{q.exp}
													</p>
												)}
											</div>
										</div>
										{/* {q.src && (
											<div className="text-[11px] text-base-content/60 italic border-t border-base-300/40 pt-1.5">
												<b>Nguồn tham khảo:</b> {q.src}
											</div>
										)} */}
									</div>
								)}
							</article>
						);
					})
				)}
			</main>

			{/* Floating / Sticky Footer Actions */}
			<footer className="sticky bottom-4 pt-2">
				<div className="bg-base-100/90 backdrop-blur-md p-3 rounded-2xl border border-base-300 shadow-lg flex items-center justify-between gap-3 max-w-lg mx-auto">
					<button
						type="button"
						onClick={goBack}
						disabled={progressSaving}
						className="btn btn-outline btn-sm rounded-xl font-display text-xs gap-1.5">
						<ArrowLeft className="w-3.5 h-3.5" />
						Về chọn bài
					</button>

					<span className="text-[11px] text-base-content/60 hidden sm:inline">
						{filteredQuestions.length} câu hỏi
					</span>

					<button
						type="button"
						onClick={scrollToTop}
						className="btn btn-ghost btn-sm rounded-xl font-display text-xs gap-1 text-base-content/70">
						<ChevronUp className="w-4 h-4" />
						Đầu trang
					</button>
				</div>
			</footer>
		</div>
	);
}
