"use client";

"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyLearningPoint, LessonLearningStat } from "@qna/types";

const PRIMARY = "#6366f1";
const SUCCESS = "#22c55e";
const WARNING = "#f59e0b";

function shortDay(day: string): string {
  const [, month, date] = day.split("-");
  return month && date ? `${date}/${month}` : day;
}

export function TrendChart({ trend }: { trend: DailyLearningPoint[] }) {
  const data = useMemo(
    () => trend.map(point => ({ ...point, label: shortDay(point.day) })),
    [trend],
  );

  return (
    <div className="h-56 w-full" role="img" aria-label="Biểu đồ số câu đã làm và số câu đúng theo ngày">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="stats-answered" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.35} />
              <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="stats-correct" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SUCCESS} stopOpacity={0.3} />
              <stop offset="100%" stopColor={SUCCESS} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            contentStyle={{ borderRadius: 12, fontSize: 12 }}
            labelFormatter={(label) => `Ngày ${label}`}
            formatter={(value, name) => [value, name === "answered" ? "Đã làm" : "Đúng"]}
          />
          <Area
            type="monotone"
            dataKey="answered"
            name="answered"
            stroke={PRIMARY}
            strokeWidth={2}
            fill="url(#stats-answered)"
          />
          <Area
            type="monotone"
            dataKey="correct"
            name="correct"
            stroke={SUCCESS}
            strokeWidth={2}
            fill="url(#stats-correct)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LessonChart({ lessons }: { lessons: LessonLearningStat[] }) {
  const data = useMemo(
    () => lessons.map(lesson => ({
      lesson: `Bài ${lesson.lessonNum}`,
      accuracy: lesson.answered > 0 ? Math.round((lesson.correct / lesson.answered) * 100) : 0,
      mastered: lesson.mastered,
      total: lesson.total,
    })),
    [lessons],
  );

  return (
    <div className="h-60 w-full" role="img" aria-label="Biểu đồ tỉ lệ đúng theo bài học">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} vertical={false} />
          <XAxis dataKey="lesson" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={36} unit="%" />
          <Tooltip
            cursor={{ fill: WARNING, opacity: 0.08 }}
            contentStyle={{ borderRadius: 12, fontSize: 12 }}
            formatter={(value, name) => {
              if (name === "accuracy") return [`${value}%`, "Tỉ lệ đúng"];
              return [`${value}`, "Đã thuộc"];
            }}
          />
          <Bar dataKey="accuracy" name="accuracy" fill={PRIMARY} radius={[6, 6, 0, 0]} maxBarSize={38} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
