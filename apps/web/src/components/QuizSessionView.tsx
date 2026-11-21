"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Clock, X } from "lucide-react";
import type { OptionKey, QuizSessionItem } from "@qna/types";
import { QuizQuestionCard } from "./QuizQuestionCard";

interface QuizSessionStats {
  total: number;
  doneCount: number;
  okCount: number;
  badCount: number;
  progressPercent: number;
}

interface QuizSessionViewProps {
  items: QuizSessionItem[];
  stats: QuizSessionStats;
  sessionKind: "quiz" | "wrong" | "srs";
  isExam: boolean;
  remainingMs: number | null;
  quitConfirm: boolean;
  reduceMotion: boolean;
  onQuit: () => void;
  showGridModal: boolean;
  onOpenGrid: () => void;
  onCloseGrid: () => void;
  onSelectOption: (index: number, key: OptionKey) => void;
  onScrollToQuestion: (index: number) => void;
  onFinish: () => void;
}

function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function QuizSessionView({ items, stats, sessionKind, isExam, remainingMs, quitConfirm, showGridModal, reduceMotion, onQuit, onOpenGrid, onCloseGrid, onSelectOption, onScrollToQuestion, onFinish }: QuizSessionViewProps) {
	const gridItemClass = (item: QuizSessionItem) => {
		if (!item.done) return "bg-base-200 text-base-content/70 border border-base-300";
		return item.first === item.q.ans
			? "bg-success text-white font-bold border-success"
			: "bg-warning text-base-content font-bold border-warning";
	};

  return (
    <div safe_bot="" className="min-h-[100dvh] pb-48">
				{/* Sticky Mobile Bar with Rabbit Ear Clearance */}
				<div
					safe_top=""
					className="sticky  top-0 z-30 bg-base-100/95 backdrop-blur-md border-b border-base-300/80 py-2 px-2 mb-4 shadow-sm rounded-md w-full">
					<div className="flex justify-between items-center mb-2">
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={onQuit}
								className={`btn btn-xs rounded-xl font-medium transition-all px-0 ${
									quitConfirm
										? "btn-error text-white"
										: "btn-ghost text-base-content/70"
								}`}>
								{quitConfirm
									? "Chắc chắn thoát?"
									: "← Chọn lại"}
							</button>
							{sessionKind !== "quiz" && (
								<span className="badge badge-warning badge-xs text-[10px] font-semibold">
									{sessionKind === "wrong" ? "Làm lại câu sai" : "Ôn theo lịch"}
								</span>
							)}
						</div>

						<div className="flex items-center gap-2">
							{isExam && remainingMs !== null && (
								<span className={`badge badge-sm gap-1 tabular-nums font-bold ${remainingMs <= 60_000 ? "badge-error text-white" : "badge-neutral text-neutral-content"}`}
									role="timer" aria-label={`Thời gian còn lại ${formatClock(remainingMs)}`}>
									<Clock aria-hidden="true" className="h-3.5 w-3.5" />
									{formatClock(remainingMs)}
								</span>
							)}
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
								onClick={onOpenGrid}
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
								width: `${stats.progressPercent}%`,
							}}
						/>
					</div>
				</div>

				{/* Questions Cards List */}
				<div className="space-y-4">
					{items.map((item, idx) => (
						<QuizQuestionCard
							key={item.q.id ?? `${item.q.lesson}-${item.q.n}-${idx}`}
							item={item}
							index={idx}
							total={items.length}
							reduceMotion={reduceMotion}
							onSelect={onSelectOption}
							onNext={onScrollToQuestion}
						/>
					))}

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
							onClick={onOpenGrid}
							className="btn btn-ghost btn-sm rounded-xl font-display text-xs">
							Xem {stats.doneCount}/{stats.total} câu
						</button>
						<button
							type="button"
							disabled={stats.doneCount < stats.total}
							onClick={onFinish}
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
								transition={reduceMotion ? { duration: 0 } : undefined}
								exit={{ y: "100%", opacity: 0 }}
								safe_bot=""
								className="w-full max-w-lg bg-base-100 rounded-t-3xl sm:rounded-3xl p-5 border border-base-300 shadow-2xl max-h-[85vh] flex flex-col">
								<div className="flex justify-between items-center pb-3 border-b border-base-300">
									<h3 className="font-display font-bold text-base">
										Bảng danh sách câu hỏi
									</h3>
									<button
										type="button"
										onClick={onCloseGrid}
										className="btn btn-circle btn-xs btn-ghost">
										<X className="w-5 h-5" />
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
									{items.map((it, i) => (
										<button
											key={i}
											type="button"
											onClick={() => onScrollToQuestion(i)}
											className={`h-10 rounded-xl flex items-center justify-center font-display text-xs active:scale-95 transition-transform ${gridItemClass(it)}`}>
											{i + 1}
										</button>
									))}
								</div>

								<div className="pt-2 border-t border-base-300">
									<button
										type="button"
										onClick={onCloseGrid}
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
