'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const navigationEvent = 'qna:navigation-pending';

export function setNavigationPending(pending: boolean) {
  window.dispatchEvent(new CustomEvent(navigationEvent, { detail: pending }));
}

export function ProcessingOverlay() {
  return <div role="status" aria-live="polite" aria-busy="true"
    className="fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-4 bg-base-100/60 backdrop-blur-md pointer-events-auto">
    <p className="font-display text-lg font-semibold">Đang xử lý</p>
    <span aria-hidden="true" className="loading loading-spinner loading-md motion-reduce:animate-none" />
  </div>;
}

export function NavigationOverlay() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => { setPending(false); }, [pathname]);

  useEffect(() => {
    const update = (event: Event) => setPending((event as CustomEvent<boolean>).detail);
    const reset = () => setPending(false);
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a') : null;
      if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin === window.location.origin && destination.pathname !== window.location.pathname) setPending(true);
    };
    window.addEventListener(navigationEvent, update);
    window.addEventListener('pageshow', reset);
    document.addEventListener('click', click);
    return () => {
      window.removeEventListener(navigationEvent, update);
      window.removeEventListener('pageshow', reset);
      document.removeEventListener('click', click);
    };
  }, []);

  // Recover from interrupted navigation rather than trapping the user indefinitely.
  useEffect(() => {
    if (!pending) return;
    const timeout = window.setTimeout(() => setPending(false), 30_000);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  return pending ? <ProcessingOverlay /> : null;
}
