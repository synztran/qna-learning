"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Flame,
  Lock,
  RefreshCw,
  Target,
} from "lucide-react";
import { ThemeToggle } from "@qna/ui";
import type { LearningStats } from "@qna/types";
import { getLearningStats } from "@/app/actions/learning";

const TrendChart = dynamic(
  () => import("./StatsCharts").then(module => module.TrendChart),
  { ssr: false, loading: () => <div className="skeleton h-56 w-full rounded-2xl" /> },
);
const LessonChart = dynamic(
  () => import("./StatsCharts").then(module => module.LessonChart),
  { ssr: false, loading: () => <div className="skeleton h-60 w-full rounded-2xl" /> },
);

interface StatsViewProps {
  sets: { id: string; title: string }[];
  initialSetId: string;
  initialStats?: LearningStats;
  initialError?: string;
}

export function StatsView({ sets, initialSetId, initialStats, initialError }: StatsViewProps) {
  const [setId, setSetId] = useState(initialSetId);
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<LearningStats | undefined>(initialStats);
  const [error, setError] = useState(initialError || "");
  const [loading, setLoading] = useState(false);

  const load = async (nextSetId = setId, nextDays = days) => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await getLearningStats(nextSetId || undefined, nextDays);
      setStats(result.stats);
      if (result.error) setError(result.error);
    } catch {
      setError("Không thể tải thống kê học tập. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const changeSet = (value: string) => {
    setSetId(value);
    void load(value, days);
  };

  const changeDays = (value: number) => {
    setDays(value);
    void load(setId, value);
  };

  const gated = !stats && Boolean(error);
  const donorGate = /cấp bậc|tri ân/.test(error);
  const accuracy = stats && stats.totals.answered > 0
    ? Math.round((stats.totals.correct / stats.totals.answered) * 100)
    : 0;
  const masteredPercent = stats && stats.totals.totalQuestions > 0
    ? Math.round((stats.totals.mastered / stats.totals.totalQuestions) * 100)
    : 0;
  const touchedPercent = stats && stats.totals.totalQuestions > 0
    ? Math.round(((stats.totals.mastered + stats.totals.learning) / stats.totals.totalQuestions) * 100)
    : 0;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <header className="flex items-center justify-between gap-3 border-b border-base-300/80 pb-4">
        <Link href="/" className="btn btn-ghost btn-sm gap-2 rounded-xl text-base-content/80 hover:text-base-content">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Quay lại ôn tập</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 font-display text-xl font-bold">
              <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
              Thống kê học tập
            </h1>
            <p className="text-xs text-base-content/60">Tiến độ theo ngày, theo bài và mức độ ghi nhớ.</p>
          </div>
          {stats && (
            <div className="flex gap-1.5" role="group" aria-label="Khoảng thời gian biểu đồ">
              {[7, 30, 90].map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => changeDays(value)}
                  disabled={loading}
                  aria-pressed={days === value}
                  className={`btn btn-xs rounded-xl font-display ${
                    days === value ? "btn-primary text-primary-content" : "btn-ghost bg-base-200"
                  }`}
                >
                  {value} ngày
                </button>
              ))}
            </div>
          )}
        </div>

        {gated ? (
          <section className="card rounded-3xl border border-base-300 bg-base-200/60 p-8 text-center shadow-md">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/15 text-warning">
              <Lock className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="font-display text-base font-bold">
              {donorGate ? "Thống kê dành cho học viên tri ân" : "Chưa tải được thống kê"}
            </h2>
            <p role="alert" className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-base-content/70">{error}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link href="/profile" className="btn btn-primary btn-sm rounded-xl">Xem hồ sơ</Link>
              <Link href="/" className="btn btn-outline btn-sm rounded-xl">Về ôn tập</Link>
            </div>
          </section>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-base-300 bg-base-200/60 p-4">
                <Flame className="mb-2 h-4 w-4 text-warning" aria-hidden="true" />
                <div className="font-display text-2xl font-bold tabular-nums">{stats?.summary.streak ?? 0}</div>
                <div className="text-[11px] text-base-content/60">Chuỗi ngày đạt mục tiêu</div>
              </div>
              <div className="rounded-2xl border border-base-300 bg-base-200/60 p-4">
                <Target className="mb-2 h-4 w-4 text-primary" aria-hidden="true" />
                <div className="font-display text-2xl font-bold tabular-nums">
                  {stats?.summary.todayAnswered ?? 0}<span className="text-sm text-base-content/50">/{stats?.summary.dailyGoal ?? 20}</span>
                </div>
                <div className="text-[11px] text-base-content/60">Câu hôm nay</div>
              </div>
              <div className="rounded-2xl border border-base-300 bg-base-200/60 p-4">
                <CalendarClock className="mb-2 h-4 w-4 text-info" aria-hidden="true" />
                <div className="font-display text-2xl font-bold tabular-nums">{stats?.summary.due ?? 0}</div>
                <div className="text-[11px] text-base-content/60">Câu đến hạn ôn</div>
              </div>
              <div className="rounded-2xl border border-base-300 bg-base-200/60 p-4">
                <CheckCircle2 className="mb-2 h-4 w-4 text-success" aria-hidden="true" />
                <div className="font-display text-2xl font-bold tabular-nums">{accuracy}%</div>
                <div className="text-[11px] text-base-content/60">Tỉ lệ đúng tích lũy</div>
              </div>
            </div>

            <section className="card rounded-3xl border border-base-300 bg-base-200/60 p-5 shadow-md">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-sm font-bold">Tiến độ ghi nhớ</h2>
                <select
                  aria-label="Chọn bộ đề"
                  value={setId}
                  disabled={loading}
                  onChange={event => changeSet(event.target.value)}
                  className="select select-sm select-bordered rounded-xl bg-base-100 text-xs max-w-[15rem]"
                >
                  <option value="">Tất cả bộ đề</option>
                  {sets.map(set => <option key={set.id} value={set.id}>{set.title}</option>)}
                </select>
              </div>

              {error && (
                <div role="alert" className="alert alert-warning mb-4 rounded-2xl py-2.5 px-3.5 text-xs">
                  <span>{error}</span>
                  <button type="button" onClick={() => void load()} className="btn btn-ghost btn-xs gap-1">
                    <RefreshCw className="h-3 w-3" aria-hidden="true" /> Thử lại
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-base-content/70">
                    <span>Đã thuộc (hộp 3–4)</span>
                    <span className="font-semibold tabular-nums">{stats?.totals.mastered ?? 0}/{stats?.totals.totalQuestions ?? 0}</span>
                  </div>
                  <progress className="progress progress-success block h-2 w-full" value={masteredPercent} max={100}
                    aria-label={`Đã thuộc ${masteredPercent}%`} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-base-content/70">
                    <span>Đang học (hộp 1–2)</span>
                    <span className="font-semibold tabular-nums">{stats?.totals.learning ?? 0}</span>
                  </div>
                  <progress className="progress progress-primary block h-2 w-full" value={touchedPercent} max={100}
                    aria-label={`Đang học hoặc đã thuộc ${touchedPercent}%`} />
                </div>
                <p className="text-[11px] text-base-content/60">
                  Đã làm <b className="text-base-content">{stats?.totals.answered ?? 0}</b> lượt ·
                  đúng <b className="text-base-content">{stats?.totals.correct ?? 0}</b> lượt trên tổng {stats?.totals.totalQuestions ?? 0} câu.
                </p>
              </div>
            </section>

            <section className="card rounded-3xl border border-base-300 bg-base-200/60 p-5 shadow-md">
              <h2 className="mb-1 font-display text-sm font-bold">Hoạt động theo ngày</h2>
              <p className="mb-3 text-[11px] text-base-content/60">Số câu đã làm và số câu đúng trong {days} ngày gần nhất.</p>
              {stats && stats.trend.length > 0 ? (
                <TrendChart trend={stats.trend} />
              ) : (
                <p className="rounded-2xl border border-dashed border-base-300 bg-base-100/50 p-6 text-center text-xs text-base-content/60">
                  Chưa có hoạt động trong khoảng thời gian này.
                </p>
              )}
            </section>

            <section className="card rounded-3xl border border-base-300 bg-base-200/60 p-5 shadow-md">
              <h2 className="mb-1 font-display text-sm font-bold">Tỉ lệ đúng theo bài</h2>
              <p className="mb-3 text-[11px] text-base-content/60">Chọn một bộ đề để xem chi tiết từng bài.</p>
              {setId && stats && stats.lessons.length > 0 ? (
                <LessonChart lessons={stats.lessons} />
              ) : (
                <p className="rounded-2xl border border-dashed border-base-300 bg-base-100/50 p-6 text-center text-xs text-base-content/60">
                  {setId ? "Chưa có dữ liệu cho bộ đề này." : "Chọn một bộ đề ở phần tiến độ ghi nhớ để xem theo bài."}
                </p>
              )}
            </section>
          </>
        )}

        {loading && <p role="status" className="text-center text-xs text-base-content/60">Đang tải thống kê…</p>}
      </div>
    </div>
  );
}
