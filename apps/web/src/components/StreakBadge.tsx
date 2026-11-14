'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Flame } from 'lucide-react';

export function StreakBadge({
	streak,
	todayAnswered,
	dailyGoal,
	className = '',
}: {
	streak: number;
	todayAnswered: number;
	dailyGoal: number;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const root = useRef<HTMLSpanElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	const panelId = useId();
	const goal = Math.max(1, dailyGoal);
	const remaining = Math.max(0, goal - todayAnswered);
	const goalMet = todayAnswered >= goal;

	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event: PointerEvent) => {
			if (
				event.target instanceof Node &&
				!root.current?.contains(event.target)
			) {
				setOpen(false);
			}
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			setOpen(false);
			trigger.current?.focus();
		};
		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [open]);

	return (
		<span ref={root} className={`relative inline-flex ${className}`}>
			<button
				ref={trigger}
				type="button"
				aria-expanded={open}
				aria-controls={panelId}
				aria-label={`Chuỗi ${streak} ngày đạt mục tiêu. Hôm nay ${todayAnswered}/${goal} câu. Nhấn để xem cách tính chuỗi ngày học.`}
				onClick={() => setOpen((value) => !value)}
				className="inline-flex items-center gap-1 rounded-lg bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-base-content/80 transition-colors hover:bg-warning/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warning">
				<Flame aria-hidden="true" className="h-3 w-3 text-warning" />
				{streak} ngày
				<span className="font-medium text-base-content/50">
					· {todayAnswered}/{goal}
				</span>
			</button>
			{open && (
				<div
					id={panelId}
					className="absolute left-0 top-full z-40 mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-2xl border border-base-300 bg-base-100 p-3 text-left text-[11px] font-normal leading-relaxed text-base-content/80 shadow-xl">
					<p className="mb-1 font-display text-xs font-bold text-base-content">
						Chuỗi ngày học là gì?
					</p>
					<p>
						Là số ngày liên tiếp bạn đạt mục tiêu mỗi
						ngày. Hôm nay bạn đã làm{' '}
						<b className="text-base-content">
							{todayAnswered}/{goal}
						</b>{' '}
						câu
						{goalMet
							? ' — đã đạt mục tiêu!'
							: `, còn ${remaining} câu nữa.`}
					</p>
					<p className="mt-1.5">
						Đạt mục tiêu hôm nay để nối dài chuỗi. Nghỉ
						trọn một ngày không đạt mục tiêu, chuỗi sẽ
						bắt đầu lại từ 0.
					</p>
				</div>
			)}
		</span>
	);
}
