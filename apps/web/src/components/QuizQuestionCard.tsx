"use client";

import { motion } from "motion/react";
import type { OptionKey, QuizSessionItem } from "@qna/types";

const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

export function QuizQuestionCard({ item, index, total, reduceMotion, onSelect, onNext }: {
	item: QuizSessionItem;
	index: number;
	total: number;
	reduceMotion: boolean;
	onSelect: (index: number, key: OptionKey) => void;
	onNext: (index: number) => void;
}) {
	const { q, order, first, tries, done } = item;
	const isFirstRight = first === q.ans;
	const isWrongFirst = first !== null && !isFirstRight;
	const cardTone = !done ? "border-base-300" : isFirstRight ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5";

	return <article id={`q-card-${index}`} className={`card bg-base-100 border transition-all duration-200 p-4 sm:p-5 rounded-3xl shadow-sm ${cardTone}`}>
		<div className="flex justify-between items-center mb-3">
			<div className="flex items-center gap-2">
				<span className="font-display font-bold text-sm text-primary">Câu {index + 1}</span>
				<span className="text-[11px] px-2 py-0.5 rounded-md bg-base-200 text-base-content/70 font-medium">Bài {q.lesson} · Câu {q.n}</span>
			</div>
			{done ? <span className={`badge badge-sm text-[10px] font-bold py-1 ${isFirstRight ? "badge-success text-white" : "badge-warning text-base-100"}`}>{isFirstRight ? "✓ Đúng ngay" : "Đúng sau khi chọn lại"}</span> : isWrongFirst ? <span className="badge badge-error badge-sm text-white text-[10px] font-bold">Sai · chọn lại</span> : <span className="badge badge-ghost badge-sm text-[10px] text-base-content/50">Chưa hoàn thành</span>}
		</div>

		<p className="font-semibold text-sm sm:text-base leading-snug mb-4 text-base-content select-text">{q.q}</p>
		{q.images?.map((src, imageIndex) => <img key={`${src}-${imageIndex}`} src={src} alt={`Ảnh ${imageIndex + 1} câu ${q.n}`} loading="lazy" className="mb-4 max-h-44 max-w-full rounded-xl object-contain sm:max-h-56" />)}

		<div className="grid grid-cols-1 gap-2.5">{order.map(key => <QuizAnswerOption key={key} optionKey={key} text={q.opts[key]} isTried={tries.includes(key)} isCorrect={key === q.ans} done={done} onSelect={() => onSelect(index, key)} />)}</div>

		{done && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={reduceMotion ? { duration: 0 } : undefined} className="mt-4 text-xs space-y-2">
			{q.exp ? <div><b className="text-primary font-display">Giải thích: </b><span className="text-base-content/90 leading-relaxed select-text">{q.exp}</span></div> : null}
			{index < total - 1 && <div className="pt-2 text-right"><button type="button" onClick={() => onNext(index + 1)} className="btn btn-xs btn-ghost text-primary font-display font-bold">Câu tiếp theo ↓</button></div>}
		</motion.div>}
	</article>;
}

function QuizAnswerOption({ optionKey, text, isTried, isCorrect, done, onSelect }: {
	optionKey: OptionKey;
	text: string;
	isTried: boolean;
	isCorrect: boolean;
	done: boolean;
	onSelect: () => void;
}) {
	const stateClass = done
		? isCorrect ? "bg-success/20 border-success text-success font-bold shadow-sm" : isTried ? "bg-error/15 border-error text-error [html:not([data-theme='dark'])_&]:!bg-error/40" : "opacity-60 border-base-300"
		: isTried ? "bg-error/15 border-error text-error [html:not([data-theme='dark'])_&]:!bg-error/40" : "bg-base-200/60 border-base-300 text-base-content hover:bg-base-200";
	const letterClass = done && isCorrect ? "bg-success text-white" : isTried && !isCorrect ? "bg-error text-white" : "bg-base-300 text-base-content/80";
	const mark = done && isCorrect ? "✓" : isTried && !isCorrect ? "✗" : null;

	return <button type="button" disabled={done || isTried} onClick={onSelect} className={`quiz-opt-btn flex items-center justify-between text-left p-3.5 rounded-2xl border text-xs sm:text-sm font-medium ${stateClass}`}>
		<span className="flex items-center gap-3 pr-2"><span className={`w-6 h-6 rounded-xl flex items-center justify-center font-display font-bold text-xs shrink-0 ${letterClass}`}>{optionKey}</span><span className="leading-snug select-text">{text}</span></span>
		{mark && <span className={`text-[11px] font-bold shrink-0 ml-2 ${isCorrect ? "text-success" : ""}`}>{mark}</span>}
	</button>;
}
