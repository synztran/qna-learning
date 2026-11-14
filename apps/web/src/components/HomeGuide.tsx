'use client';

import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const storageKey = 'qna_home_guide_seen_v1';

export function HomeGuide({ userId }: { userId?: string }) {
	const started = useRef(false);

	useEffect(() => {
		if (started.current) return;
		let active = true;
		try {
			const key = `${storageKey}_${userId || 'guest'}`;
			if (localStorage.getItem(key)) return;
			started.current = true;

			const tour = driver({
				animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
				allowClose: true,
				showProgress: true,
				nextBtnText: 'Tiếp',
				prevBtnText: 'Quay lại',
				doneBtnText: 'Hoàn tất',
				progressText: '{{current}} / {{total}}',
				steps: [
					{ element: '[data-home-guide="mode"]', popover: { title: 'Chọn cách học', description: 'Thi thử giúp bạn kiểm tra kiến thức. Ôn tập giúp học lại theo tiến độ cá nhân.' } },
					{ element: '[data-home-guide="sets"]', popover: { title: 'Chọn bộ câu hỏi', description: 'Chọn bộ đề bạn muốn học. Nội dung và số câu sẽ cập nhật theo bộ đề.' } },
					{ element: '[data-home-guide="practice"]', popover: { title: 'Luyện tập thêm', description: 'Ôn câu sai, câu đến hạn hoặc dùng flashcard để ghi nhớ tốt hơn.' } },
					{ element: '[data-home-guide="start"]', popover: { title: 'Bắt đầu học', description: 'Kiểm tra lựa chọn của bạn ở đây, rồi nhấn để bắt đầu.', side: 'top' } },
				],
				onDestroyed: () => {
					if (active) {
						try { localStorage.setItem(key, 'true'); } catch { /* Storage may be disabled. */ }
					}
				},
			});
			const timer = window.setTimeout(() => tour.drive(), 500);
			return () => {
				active = false;
				started.current = false;
				window.clearTimeout(timer);
				tour.destroy();
			};
		} catch {
			// The guide is optional; keep home usable when browser storage is unavailable.
		}
	}, [userId]);

	return null;
}
