'use client';

import { useEffect } from 'react';
import { checkLoginSession } from '@/app/actions/session';

export function SessionGuard() {
  useEffect(() => {
    let stopped = false;
    let pending = false;
    const check = async () => {
      if (document.visibilityState !== 'visible' || pending || stopped) return;
      pending = true;
      try {
        const status = await checkLoginSession();
        if (!stopped && status === 'replaced') window.location.replace('/login?error=session_replaced');
      } catch {
        // Network failure is not evidence that another device signed in.
      } finally {
        pending = false;
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 30000);
    const onFocus = () => { void check(); };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, []);
  return null;
}
