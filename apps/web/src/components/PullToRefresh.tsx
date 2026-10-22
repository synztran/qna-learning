'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { blocksPullRefresh, pullDistance, REFRESH_THRESHOLD } from '@/lib/pull-to-refresh';

export function PullToRefresh({ children, disabled, onRefresh }: {
  children: ReactNode; disabled: boolean; onRefresh: () => Promise<void>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const refresh = useRef(onRefresh);
  refresh.current = onRefresh;
  const busy = useRef(false);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const surface = root.current;
    if (!surface || disabled) return;
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    const previous = document.documentElement.style.overscrollBehaviorY;
    document.documentElement.style.overscrollBehaviorY = 'contain';
    let start: { x: number; y: number } | null = null;
    let pulled = 0;
    let disposed = false;
    const reset = () => { start = null; pulled = 0; setDistance(0); };
    const touchStart = (event: TouchEvent) => {
      reset();
      if (busy.current || event.touches.length !== 1 || window.scrollY > 0 ||
          document.querySelector('dialog[open], [aria-modal="true"]') || blocksPullRefresh(event.target, surface)) return;
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };
    const touchMove = (event: TouchEvent) => {
      if (!start) return;
      if (event.touches.length !== 1 || window.scrollY > 0) { reset(); return; }
      const touch = event.touches[0];
      if (touch.clientY < start.y || Math.abs(touch.clientX - start.x) > Math.abs(touch.clientY - start.y)) {
        reset(); return;
      }
      pulled = pullDistance(start.x, start.y, touch.clientX, touch.clientY);
      if (pulled > 0 && event.cancelable) event.preventDefault();
      setDistance(pulled);
    };
    const touchEnd = async () => {
      const ready = pulled >= REFRESH_THRESHOLD;
      reset();
      if (!ready || busy.current) return;
      setError('');
      if (!navigator.onLine) { setError('Bạn đang ngoại tuyến. Kết nối mạng để làm mới.'); return; }
      busy.current = true;
      setRefreshing(true);
      try {
        await refresh.current();
      } catch {
        if (!disposed) setError('Không thể làm mới. Kiểm tra kết nối và kéo xuống để thử lại.');
      } finally {
        busy.current = false;
        if (!disposed) setRefreshing(false);
      }
    };
    surface.addEventListener('touchstart', touchStart, { passive: true });
    surface.addEventListener('touchmove', touchMove, { passive: false });
    surface.addEventListener('touchend', touchEnd);
    surface.addEventListener('touchcancel', reset);
    return () => {
      disposed = true;
      document.documentElement.style.overscrollBehaviorY = previous;
      surface.removeEventListener('touchstart', touchStart);
      surface.removeEventListener('touchmove', touchMove);
      surface.removeEventListener('touchend', touchEnd);
      surface.removeEventListener('touchcancel', reset);
    };
  }, [disabled]);

  return <div ref={root} aria-busy={refreshing} className="flex flex-1 flex-col"
    onClickCapture={event => {
      if (busy.current) { event.preventDefault(); event.stopPropagation(); }
    }}>
    {(distance > 0 || refreshing) && <div role="status" className="flex items-center justify-center gap-2 py-3 text-xs text-base-content/70">
      <RefreshCw aria-hidden="true" className={`h-4 w-4 ${refreshing ? 'motion-safe:animate-spin' : ''}`} />
      {refreshing ? 'Đang làm mới…' : distance >= REFRESH_THRESHOLD ? 'Thả để làm mới' : 'Kéo xuống để làm mới'}
    </div>}
    {error && <p role="alert" className="py-2 text-center text-xs text-error">{error}</p>}
    {children}
  </div>;
}
