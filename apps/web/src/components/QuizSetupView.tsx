"use client";

import type { Dispatch, SetStateAction } from "react";
import type { LearningSummary, LearningFeatureKey } from "@qna/types";
import { ThemeToggle, DonorBadge, ThiingsTarget } from "@qna/ui";
import { BookOpen, Brain, CalendarClock, Clock, Flame, ListChecks, Lock, User, X } from "lucide-react";
import Link from "next/link";
import { StreakBadge } from "./StreakBadge";
import { HomeGuide } from "./HomeGuide";
import { LogoutButton } from "./LogoutButton";
import { FloatingLearningMenu } from "./FloatingLearningMenu";
import { PullToRefresh } from "./PullToRefresh";
import type { LeaderboardCache } from "@/lib/leaderboard-cache";

type AvailableSet = { id: string; title: string; questionCount: number };
type SetupMode = "exam" | "study";
type CountMode = "20" | "25" | "all" | "custom";
interface QuizSetupViewProps {
 availableSets: AvailableSet[]; selectedSetId?: string; setSelectedSetId: Dispatch<SetStateAction<string | undefined>>;
 user?: { id?: string; displayName?: string; donorLevel?: number; donorTier?: string | null };
 canExam: boolean; canStudy: boolean; canWrong: boolean; canFlashcards: boolean; canStreak: boolean;
 activeMode: SetupMode; setActiveMode: Dispatch<SetStateAction<SetupMode>>; starting: boolean; saveState: string;
 studyProgressLoading: boolean; onRefresh: () => Promise<void>; studySetsLoading: boolean;
 studyProgressError: string; studyProgress: Record<string, { reviewed: number; total: number }> | null;
 refreshStudyProgress: (force?: boolean) => Promise<boolean>; setStartError: Dispatch<SetStateAction<string>>;
 setLockedFeature: Dispatch<SetStateAction<LearningFeatureKey | null>>; poolCount: number; learningSummary: LearningSummary | null;
 countMode: CountMode; setCountMode: Dispatch<SetStateAction<CountMode>>; customCount: number; setCustomCount: Dispatch<SetStateAction<number>>;
 examMinutes: 0 | 15 | 30 | 45 | 60; setExamMinutes: Dispatch<SetStateAction<0 | 15 | 30 | 45 | 60>>; targetCount: number;
 reviewLoading: "wrong" | "due" | null; flashcardLoading: boolean; reviewError: string;
 startReview: (kind: "wrong" | "due") => Promise<void>; openFlashcards: () => Promise<void>;
  footerSetTitle?: string; startError: string; startQuiz: () => Promise<void>; startStudy: () => Promise<void>;
 leaderboardCache: LeaderboardCache;
 lockedFeature: LearningFeatureKey | null; lockedConfig: { label: string; description: string } | null;
 lockedTier: { icon: string; label: string } | null; onCloseLockedFeature: () => void;
}
const COUNT_MODE_LABELS = { 20: "20 câu", 25: "25 câu", all: "Toàn bộ", custom: "Tự chọn" } as const;
export function QuizSetupView({ availableSets, selectedSetId, setSelectedSetId, user, canExam, canStudy, canWrong, canFlashcards, canStreak, activeMode, setActiveMode, starting, saveState, studyProgressLoading, onRefresh, studySetsLoading, studyProgressError, studyProgress, refreshStudyProgress, setStartError, setLockedFeature, poolCount, learningSummary, countMode, setCountMode, customCount, setCustomCount, examMinutes, setExamMinutes, targetCount, reviewLoading, flashcardLoading, reviewError, startReview, openFlashcards, footerSetTitle, startError, startQuiz, startStudy, leaderboardCache, lockedFeature, lockedConfig, lockedTier, onCloseLockedFeature }: QuizSetupViewProps) {
 return (
			<>
			<div
				safe_top=""
				safe_bot=""
				className="fixed inset-0 z-20 flex flex-col overflow-hidden bg-base-100">
			<div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col md:max-w-xl lg:max-w-2xl">
			<PullToRefresh
				scrollable
				className="px-4 pb-4 sm:px-6"
				disabled={starting || saveState === 'saving' || studyProgressLoading}
 onRefresh={onRefresh}>
			<div className="home-setup flex flex-col gap-4">
				<HomeGuide userId={user?.id} />
				{/* Sticky Header & Mode Switcher */}
				<div className="sticky top-0 z-30 bg-base-100/95 backdrop-blur-md pt-1 pb-3 space-y-3 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-base-300/80 shadow-xs">
					{/* Header */}
					<header className="flex flex-wrap justify-between items-center gap-3">
						<div className="flex min-w-0 items-center gap-3">
							{/* <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
								<BookOpen className="w-5 h-5" />
							</div> */}
							<div className="min-w-0">
								<h1 className="font-display font-bold text-lg sm:text-xl leading-tight">
									QnA Learning
								</h1>
								<div className="flex items-center gap-1.5 flex-wrap">
									<p className="break-words text-xs leading-relaxed text-base-content/75">
										{user?.displayName
											? `Học viên: ${user.displayName}`
											: "Study with QNA Learning"}
									</p>
									<DonorBadge level={user?.donorLevel} tier={user?.donorTier} compact />
									{learningSummary && canStreak && (
										<StreakBadge
											streak={learningSummary.streak}
											todayAnswered={learningSummary.todayAnswered}
											dailyGoal={learningSummary.dailyGoal}
										/>
									)}
								</div>
							</div>
						</div>
						<div className="ml-auto flex shrink-0 items-center gap-1.5">
							<Link
								href="/profile"
								title="Hồ sơ & Đổi mật khẩu"
								className="btn btn-ghost btn-circle btn-xs text-base-content/70 hover:text-primary">
								<User className="w-5 h-5" />
							</Link>
							<ThemeToggle />
							<LogoutButton size="xs" />
						</div>
					</header>

					{/* Mode Switcher Tabs */}
					<div role="group" aria-label="Chế độ học" data-home-guide="mode" data-mode={activeMode}
						className="home-mode-switch relative isolate grid grid-cols-2 gap-1 rounded-2xl border border-base-300 bg-base-200/90 p-1">
						<button
							type="button"
							aria-pressed={activeMode === 'exam'}
							disabled={starting}
							onClick={() => {
								if (!canExam) {
									setLockedFeature('exam');
									return;
								}
								setActiveMode("exam");
								setStartError("");
							}}
							className={`home-mode-button btn rounded-xl font-display text-sm border-0 ${
								activeMode === "exam"
									? "text-primary-content"
									: "text-base-content/75"
							}`}>
							<ThiingsTarget className="w-5 h-5 mr-1" />
							Thi thử
							{!canExam && (
								<span className="badge badge-warning badge-xs px-1.5 py-0.5 text-[9px] gap-0.5 ml-1 font-semibold">
									<Lock className="w-2.5 h-2.5" /> Khóa
								</span>
							)}
						</button>
						<button
							type="button"
							aria-pressed={activeMode === 'study'}
							disabled={starting}
							onClick={() => {
								if (!canStudy) {
									setLockedFeature('srs_review');
									return;
								}
								setActiveMode("study");
								setStartError("");
							}}
							className={`home-mode-button btn rounded-xl font-display text-sm border-0 ${
								activeMode === "study"
									? "text-primary-content"
									: "text-base-content/75"
							}`}>
							<BookOpen className="w-5 h-5 mr-1" />
							Ôn tập
							{!canStudy && (
								<span className="badge badge-warning badge-sm px-1.5 py-1 text-[10px] gap-0.5 text-white font-bold">
									<Lock className="w-2.5 h-2.5" /> Khóa
								</span>
							)}
						</button>
					</div>
				</div>

				{/* Content */}
				<main className="space-y-4">
					{/* Lessons Selector */}
					<section data-home-guide="sets" className="bg-base-200/50 backdrop-blur-sm p-4 sm:p-5 rounded-3xl border border-base-300 shadow-sm">
						<div className="flex justify-between items-center mb-3">
							<div className="flex items-center gap-2">
								<span className="w-2 h-2 rounded-full bg-primary" />
								<h2 className="font-display font-bold text-sm tracking-tight">
									Chọn bài ôn tập
								</h2>
							</div>
						</div>

						<div
							role="region"
							aria-label="Danh sách bộ đề ôn tập"
							aria-busy={studySetsLoading}
							tabIndex={0}
							className="overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden space-y-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
							{studySetsLoading ? <>
								<span role="status" className="sr-only">Đang tải bộ đề và tiến độ ôn tập…</span>
								{availableSets.map(set => <div key={set.id} aria-hidden="true"
									className="flex items-center gap-3 rounded-xl border border-base-300 p-3.5 motion-safe:animate-pulse">
									<div className="h-5 w-5 shrink-0 rounded bg-base-300" />
									<div className="min-w-0 flex-1 space-y-2">
										<div className="h-5 w-4/5 rounded bg-base-300" />
										<div className="h-4 w-1/2 rounded bg-base-300" />
										<div className="h-1.5 w-full rounded bg-base-300" />
									</div>
									<div className="h-4 w-10 shrink-0 rounded bg-base-300" />
								</div>)}
							</> : activeMode === 'study' && studyProgressError && !studyProgress ? null : availableSets.map((set) => (
									<label key={set.id}
										className={`home-set-option relative flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 ${set.id === selectedSetId ? "border-primary bg-primary/5" : "border-base-300 bg-base-100"}`}>
										<input type="checkbox" checked={set.id === selectedSetId} disabled={starting}
											onChange={() => { setSelectedSetId(set.id === selectedSetId ? undefined : set.id); setStartError(""); }}
											className="checkbox checkbox-primary checkbox-sm shrink-0" />
										<span className="min-w-0 flex-1 break-words text-xs font-semibold leading-relaxed">
											<span className="line-clamp-3">{set.title}</span>
											{activeMode === 'study' && studyProgress?.[set.id] && (() => {
												const { reviewed, total } = studyProgress[set.id];
												return <span className="mt-2 block space-y-1">
													<span className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-base-content/70">
														<span>Đã ôn {reviewed}/{total} câu</span>
														{total > 0 && reviewed === total && <span className="badge badge-success badge-sm">Đã ôn tập</span>}
													</span>
													<progress className="progress progress-success block h-1.5 w-full" value={reviewed} max={Math.max(1, total)} aria-label={`Tiến độ ôn tập ${set.title}`} />
												</span>;
											})()}
										</span>
                    <div className="absolute -top-3.5 right-2">
                      <span className="badge badge-sm badge-neutral px-2 py-1 rounded-md">
                        {set.questionCount} câu
                      </span>
                    </div>
									</label>
							))}
							{availableSets.length === 0 && <p className="text-sm">Bộ câu hỏi mẫu — {poolCount} câu</p>}
						</div>
						{activeMode === 'study' && !studySetsLoading && studyProgressError && <div role="alert" className="mt-2 text-xs text-error">
							{studyProgressError} <button type="button" onClick={() => void refreshStudyProgress(true)} className="btn btn-xs btn-ghost">Thử lại</button>
						</div>}
					</section>

					{/* Question Count Selector (Exam Mode) or Study Info Box (Study Mode) */}
					<div className="home-mode-options">
					{activeMode === "exam" ? (
						<section className="bg-base-200/50 backdrop-blur-sm p-4 sm:p-5 rounded-3xl border border-base-300 shadow-sm">
							<h2 className="font-display font-bold text-sm mb-3 tracking-tight">
								Số câu hỏi mỗi lượt
							</h2>

							<div className="grid grid-cols-4 gap-2 mb-3">
								{(["20", "25", "all", "custom"] as const).map(
									(mode) => {
						const label = COUNT_MODE_LABELS[mode];
										const disabled =
											starting || (mode === "20" && poolCount < 20) ||
											(mode === "25" && poolCount < 25) ||
											poolCount === 0;

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
										max={Math.max(1, poolCount)}
										disabled={starting}
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
										max={Math.max(1, poolCount)}
										disabled={starting}
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

							<div className="mt-3 pt-3 border-t border-base-300/70">
								<div className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
									<Clock aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
									Giới hạn thời gian
								</div>
								<div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Giới hạn thời gian làm bài">
									{([0, 15, 30, 45, 60] as const).map(minutes => (
										<button
											key={minutes}
											type="button"
											disabled={starting}
											aria-pressed={examMinutes === minutes}
											onClick={() => setExamMinutes(minutes)}
											className={`btn btn-xs rounded-xl font-display text-[11px] border ${
												examMinutes === minutes
													? "btn-primary text-primary-content border-primary"
													: "btn-ghost bg-base-100 border-base-300"
											}`}>
											{minutes === 0 ? "Không" : `${minutes} phút`}
										</button>
									))}
								</div>
								{examMinutes > 0 && (
									<p className="mt-1.5 text-[11px] text-base-content/60">Hết giờ tự động nộp bài; câu chưa làm không được tính điểm.</p>
								)}
							</div>

							<div className="mt-3 pt-3 border-t border-base-300/80 flex flex-wrap gap-2 justify-between items-center text-xs text-base-content/70">
								<span>
									Ngân hàng đã chọn:{" "}
									<b className="text-base-content">
										{poolCount}
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
					) : (
						<section className="bg-base-200/50 backdrop-blur-sm p-4 sm:p-5 rounded-3xl border border-base-300 shadow-sm space-y-2">
							<div className="flex items-center gap-2">
								<span className="w-2 h-2 rounded-full bg-primary" />
								<h2 className="font-display font-bold text-sm tracking-tight">
									Chế độ Ôn tập
								</h2>
							</div>
							<p className="text-xs text-base-content/70 leading-relaxed">
								Đọc toàn bộ câu hỏi theo từng bài học. Đáp án mặc định được ẩn để bạn tự nhẩm trước, chạm vào từng câu hoặc phương án để xem đáp án chính xác và lời giải chi tiết.
							</p>
							<div className="pt-2 border-t border-base-300/80 flex justify-between items-center text-xs text-base-content/70">
								<span>Tổng số câu hỏi trong bộ đề:</span>
								<b className="text-primary text-sm font-display">
									{poolCount} câu
								</b>
							</div>
						</section>
					)}
					</div>

					{/* Extra practice: wrong answers, due review, flashcards, daily goal */}
					<section data-home-guide="practice" className="bg-base-200/50 backdrop-blur-sm p-4 sm:p-5 rounded-3xl border border-base-300 shadow-sm space-y-3" aria-labelledby="practice-heading">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								<span className="w-2 h-2 rounded-full bg-primary" />
								<h2 id="practice-heading" className="font-display font-bold text-sm tracking-tight">Luyện tập thêm</h2>
							</div>
							{learningSummary && (
								<span className="text-[11px] text-base-content/70">
									Mục tiêu hôm nay: <b className="text-base-content">{learningSummary.todayAnswered}/{learningSummary.dailyGoal}</b> câu
									{learningSummary.streak > 0 && <span className="ml-1 inline-flex items-center gap-0.5 font-semibold text-warning"><Flame aria-hidden="true" className="h-3 w-3" />{learningSummary.streak} ngày</span>}
								</span>
							)}
						</div>
						{learningSummary && (
							<progress className="progress progress-warning block h-1.5 w-full" value={Math.min(learningSummary.todayAnswered, learningSummary.dailyGoal)} max={Math.max(1, learningSummary.dailyGoal)}
								aria-label={`Mục tiêu hôm nay ${learningSummary.todayAnswered} trên ${learningSummary.dailyGoal} câu`} />
						)}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
							<button type="button" disabled={Boolean(reviewLoading) || starting || !selectedSetId}
								onClick={() => void startReview("wrong")}
								className="btn btn-outline btn-sm h-auto min-h-12 justify-start gap-2 rounded-2xl px-3 py-2.5 text-left">
								<ListChecks aria-hidden="true" className="h-4 w-4 shrink-0 text-error" />
								<span className="min-w-0">
									<span className="flex items-center gap-1 font-display font-bold text-xs">
										{reviewLoading === "wrong" ? "Đang tải…" : "Ôn câu sai"}
										{!canWrong && <Lock aria-hidden="true" className="h-3 w-3" />}
									</span>
									<span className="block text-[10px] font-normal text-base-content/60">Câu làm sai chưa sửa</span>
								</span>
							</button>
							<button type="button" disabled={Boolean(reviewLoading) || starting || !selectedSetId}
								onClick={() => void startReview("due")}
								className="btn btn-outline btn-sm h-auto min-h-12 justify-start gap-2 rounded-2xl px-3 py-2.5 text-left">
								<CalendarClock aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
								<span className="min-w-0">
									<span className="flex items-center gap-1 font-display font-bold text-xs">
										{reviewLoading === "due" ? "Đang tải…" : "Câu đến hạn"}
										{learningSummary && learningSummary.due > 0 && <span className="badge badge-primary badge-xs text-white">{learningSummary.due}</span>}
										{!canStudy && <Lock aria-hidden="true" className="h-3 w-3" />}
									</span>
									<span className="block text-[10px] font-normal text-base-content/60">Theo lịch Leitner</span>
								</span>
							</button>
							<button type="button" disabled={flashcardLoading || starting || !selectedSetId}
								onClick={() => void openFlashcards()}
								className="btn btn-outline btn-sm h-auto min-h-12 justify-start gap-2 rounded-2xl px-3 py-2.5 text-left">
								<Brain aria-hidden="true" className="h-4 w-4 shrink-0 text-success" />
								<span className="min-w-0">
									<span className="flex items-center gap-1 font-display font-bold text-xs">
										{flashcardLoading ? "Đang tải…" : "Flashcard"}
										{!canFlashcards && <Lock aria-hidden="true" className="h-3 w-3" />}
									</span>
									<span className="block text-[10px] font-normal text-base-content/60">Lật thẻ & tự chấm</span>
								</span>
							</button>
						</div>
						{reviewError && <p role="alert" className="text-xs text-error">{reviewError}</p>}
					</section>
				</main>

			</div>
			</PullToRefresh>
			<div className="shrink-0 px-4 pb-2 sm:px-6">
				<div className="relative flex w-full flex-col items-end">
					<div className="absolute bottom-full right-0 z-10 mb-2">
<FloatingLearningMenu leaderboardCache={leaderboardCache} />
					</div>
					<footer className="w-full rounded-3xl border border-base-300 bg-base-100/95 p-3 backdrop-blur-md">
						<div className="mb-2 flex min-w-0 items-center justify-between gap-3 px-1 text-[11px]">
							<p className="truncate font-medium text-base-content/70">
								{/* {activeMode === "exam" ? "Thi thử" : "Ôn tập"} */}
								{/* <span aria-hidden="true"> · </span> */}
								{footerSetTitle || "Chưa chọn bộ đề"}
							</p>
							<span className="shrink-0 font-semibold tabular-nums text-base-content/80">
								{activeMode === "exam"
									? `${targetCount} câu${examMinutes > 0 ? ` · ${examMinutes} phút` : ""}`
									: `${poolCount} câu`}
							</span>
						</div>
						{startError && <p role="alert" className="mb-2 px-1 text-xs text-error">{startError}</p>}
						<button
							data-home-guide="start"
							type="button"
							disabled={activeMode === "exam" ? targetCount === 0 || starting : poolCount === 0 || starting}
							aria-busy={starting}
							onClick={() => activeMode === "exam"
								? (canExam ? startQuiz() : setLockedFeature('exam'))
								: startStudy()}
							className="btn btn-primary w-full min-h-12 rounded-2xl py-3.5 font-display text-base font-bold leading-[1] text-primary-content">
							{starting
								? "Đang tải bộ đề…"
								: activeMode === "exam"
									? !canExam
										? "Tính năng Thi thử đang khóa"
										: `Bắt đầu làm bài (${targetCount} câu${examMinutes > 0 ? ` · ${examMinutes} phút` : ""})`
									: `Bắt đầu ôn tập (${poolCount} câu)`}
						</button>
					</footer>
				</div>
			</div>
			</div>
			</div>
			{lockedFeature && lockedConfig && (
				<div
					role="dialog"
					aria-modal="true"
					aria-labelledby="lock-feature-title"
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
					<div className="relative w-full max-w-sm rounded-3xl border border-warning/30 bg-base-100 p-6 shadow-2xl space-y-4 text-center">
						<button
							type="button"
							onClick={() => setLockedFeature(null)}
							aria-label="Đóng"
							className="btn btn-circle btn-ghost btn-xs absolute right-3 top-3 text-base-content/60 hover:text-base-content">
							<X className="w-4 h-4" />
						</button>
						<div className="flex justify-center pt-2">
							<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/20 text-warning ring-4 ring-warning/10">
								<Lock className="h-7 w-7" />
							</div>
						</div>
						<div className="space-y-1">
							<h3 id="lock-feature-title" className="font-display text-lg font-bold">
								Đặc quyền {lockedConfig.label}
							</h3>
							<p className="text-xs text-base-content/70">
								Dành riêng cho học viên có cấp bậc tri ân
							</p>
						</div>
						<div className="rounded-2xl border border-base-300 bg-base-200/50 p-3.5 text-xs text-base-content/85 leading-relaxed space-y-1.5 text-left">
							<p>
								<b>{lockedConfig.label}</b> yêu cầu cấp <b>{lockedTier ? `${lockedTier.icon} ${lockedTier.label}` : 'học viên'}</b> trở lên.
							</p>
							<p className="text-[11px] text-base-content/60">{lockedConfig.description}</p>
							<p className="text-[11px] text-base-content/60">
								Vui lòng liên hệ quản trị viên hoặc ủng hộ nền tảng để mở khóa đặc quyền này!
							</p>
						</div>
						<button
							type="button"
							onClick={() => setLockedFeature(null)}
							className="btn btn-primary w-full rounded-2xl font-display font-bold text-sm text-primary-content shadow-md shadow-primary/20">
							Đã hiểu
						</button>
					</div>
				</div>
			)}
			</>
 );
}
