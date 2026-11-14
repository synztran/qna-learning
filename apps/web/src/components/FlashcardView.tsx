"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import type { FlashcardGrade, Question } from "@qna/types";
import { recordLearningAnswer } from "../app/actions/learning";

const GRADES: { grade: FlashcardGrade; label: string; hint: string; className: string }[] = [
  { grade: 0, label: "Quên", hint: "Ôn lại ngay", className: "btn-error text-white" },
  { grade: 1, label: "Khó", hint: "Ôn sau 1 ngày", className: "btn-warning" },
  { grade: 2, label: "Được", hint: "Theo lịch", className: "btn-primary text-primary-content" },
  { grade: 3, label: "Dễ", hint: "Lùi xa hơn", className: "btn-success text-white" },
];

export function FlashcardView({ questions, setTitle, onBack, onGraded }: {
  questions: Question[];
  setTitle?: string;
  onBack: () => void;
  onGraded?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState<Record<FlashcardGrade, number>>({ 0: 0, 1: 0, 2: 0, 3: 0 });

  const card = questions[index];
  const finished = index >= questions.length;
  const progress = useMemo(
    () => (questions.length ? Math.round((Math.min(index, questions.length) / questions.length) * 100) : 0),
    [index, questions.length],
  );

  const grade = async (value: FlashcardGrade) => {
    if (!card || saving || finished) return;
    if (!card.id) {
      setError("Thẻ xem trước không lưu được kết quả. Hãy đăng nhập để dùng tính năng này.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await recordLearningAnswer(card.id, value, true);
      if (!result.success) {
        setError(result.error || "Chưa lưu được kết quả ôn tập.");
        return;
      }
      setCounts((previous) => ({ ...previous, [value]: previous[value] + 1 }));
      setFlipped(false);
      setIndex((current) => current + 1);
      onGraded?.();
    } catch {
      setError("Chưa lưu được kết quả ôn tập. Kiểm tra kết nối và thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const go = (delta: number) => {
    if (saving) return;
    setError("");
    setFlipped(false);
    setIndex((current) => Math.max(0, Math.min(questions.length, current + delta)));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (!finished) setFlipped((value) => !value);
        return;
      }
      if (flipped && ["1", "2", "3", "4"].includes(event.key)) {
        event.preventDefault();
        void grade((Number(event.key) - 1) as FlashcardGrade);
      }
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex flex-1 flex-col gap-4 py-1">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300/80 pb-3">
        <button type="button" onClick={onBack} className="btn btn-ghost btn-sm gap-1.5 rounded-xl text-xs -ml-2">
          <ArrowLeft className="w-4 h-4" />
          Về chọn bài
        </button>
        <span className="badge badge-primary badge-outline text-[11px] font-bold font-display gap-1">
          <Brain className="w-3.5 h-3.5" />
          Flashcard
        </span>
      </header>

      <div className="space-y-1">
        <h1 className="font-display font-bold text-base sm:text-lg">{setTitle || "Bộ câu hỏi ôn tập"}</h1>
        <p className="text-[11px] text-base-content/60">
          {finished ? `Đã ôn ${questions.length} thẻ` : `Thẻ ${index + 1}/${questions.length}`} · dùng Space để lật, phím 1–4 để tự chấm
        </p>
      </div>

      <progress className="progress progress-primary block h-1.5 w-full" value={progress} max={100} aria-label="Tiến độ flashcard" />

      {questions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-base-300 bg-base-200/40 p-8 text-center space-y-2">
          <Sparkles className="w-6 h-6 mx-auto text-primary" aria-hidden="true" />
          <p className="text-sm font-semibold">Chưa có thẻ nào để ôn.</p>
          <p className="text-xs text-base-content/60">Hoàn thành một lượt làm bài hoặc chọn bộ đề khác.</p>
        </div>
      ) : finished ? (
        <div className="rounded-3xl border border-base-300 bg-base-200/40 p-6 sm:p-8 text-center space-y-5">
          <div className="flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success">
              <Check className="w-7 h-7" aria-hidden="true" />
            </span>
          </div>
          <div className="space-y-1">
            <h2 className="font-display font-bold text-lg">Hoàn thành phiên flashcard</h2>
            <p className="text-xs text-base-content/70">{questions.length} thẻ đã được cập nhật vào lịch ôn tập.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {GRADES.map(item => (
              <div key={item.grade} className="rounded-2xl border border-base-300 bg-base-100 p-3">
                <div className="font-display font-bold text-lg tabular-nums">{counts[item.grade]}</div>
                <div className="text-base-content/60">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => { setIndex(0); setCounts({ 0: 0, 1: 0, 2: 0, 3: 0 }); setFlipped(false); }} className="btn btn-outline btn-sm rounded-xl gap-2">
              <RotateCcw className="w-4 h-4" />
              Ôn lại bộ thẻ
            </button>
            <button type="button" onClick={onBack} className="btn btn-primary btn-sm rounded-xl">
              Về chọn bài
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setFlipped(value => !value)}
            aria-label={flipped ? "Ẩn đáp án" : "Xem đáp án"}
            className="group relative block w-full min-h-[19rem] sm:min-h-[22rem] [perspective:1400px] text-left"
          >
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 26 }}
              className="relative w-full min-h-[19rem] sm:min-h-[22rem] [transform-style:preserve-3d]"
            >
              <div className="absolute inset-0 [backface-visibility:hidden] rounded-3xl border border-base-300 bg-base-100 p-6 sm:p-8 shadow-sm flex flex-col justify-between gap-6">
                <div className="flex items-center justify-between gap-2 text-[11px] text-base-content/60">
                  <span className="font-semibold">Bài {card.lesson} · Câu {card.n}</span>
                  <span className="inline-flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-primary" />Nhấn để lật</span>
                </div>
                <p className="text-base sm:text-lg font-semibold leading-relaxed select-text">{card.q}</p>
                <ul className="grid gap-1.5 text-xs sm:text-sm text-base-content/70">
                  {(["A", "B", "C", "D"] as const).map(key => (
                    <li key={key} className="rounded-xl border border-base-300/60 bg-base-200/40 px-3 py-2">
                      <b className="font-display mr-1.5">{key}.</b>{card.opts[key]}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-3xl border border-primary/40 bg-base-100 p-6 sm:p-8 shadow-sm flex flex-col justify-between gap-6">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="badge badge-success badge-sm text-white font-bold gap-1"><Check className="w-3 h-3" />Đáp án {card.ans}</span>
                  <span className="text-base-content/60">Bài {card.lesson} · Câu {card.n}</span>
                </div>
                <div className="space-y-3">
                  <p className="text-sm sm:text-base font-semibold text-success leading-relaxed select-text">{card.ans}. {card.opts[card.ans]}</p>
                  {card.exp && (
                    <div className="rounded-2xl bg-base-200/50 border border-base-300/70 p-3.5 text-xs leading-relaxed text-base-content/85">
                      <b className="font-display text-primary">Giải thích: </b>{card.exp}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-base-content/50">Tự chấm mức độ nhớ của bạn ở bên dưới.</p>
              </div>
            </motion.div>
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {GRADES.map(item => (
              <button
                key={item.grade}
                type="button"
                disabled={!flipped || saving}
                onClick={() => void grade(item.grade)}
                className={`btn btn-sm rounded-2xl min-h-12 flex-col gap-0 ${item.className}`}>
                <span className="font-display font-bold text-xs">{item.grade + 1}. {item.label}</span>
                <span className="text-[10px] opacity-80">{item.hint}</span>
              </button>
            ))}
          </div>
          {!flipped && <p className="text-center text-[11px] text-base-content/55">Lật thẻ để chấm mức độ nhớ.</p>}
        </>
      )}

      {error && <div role="alert" className="alert alert-error text-xs py-2 px-3 rounded-xl"><X className="w-4 h-4" /><span>{error}</span></div>}

      {!finished && questions.length > 0 && (
        <footer className="flex items-center justify-between gap-2 pt-1">
          <button type="button" disabled={index === 0 || saving} onClick={() => go(-1)} className="btn btn-ghost btn-sm rounded-xl gap-1">
            <ChevronLeft className="w-4 h-4" />Trước
          </button>
          <span className="text-[11px] text-base-content/60 tabular-nums">{index + 1} / {questions.length}</span>
          <button type="button" disabled={saving} onClick={() => go(1)} className="btn btn-ghost btn-sm rounded-xl gap-1">
            Sau<ChevronRight className="w-4 h-4" />
          </button>
        </footer>
      )}
    </div>
  );
}
