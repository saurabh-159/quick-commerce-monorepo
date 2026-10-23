'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Thin top progress line for App Router navigations (desktop + mobile).
 * Starts on internal link clicks / history nav; completes when the URL settles.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlKey = `${pathname}?${searchParams?.toString() ?? ''}`;

  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const [fading, setFading] = useState(false);

  const activeRef = useRef(false);
  const urlKeyRef = useRef(urlKey);
  const tickRef = useRef(null);
  const finishTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    clearTimers();
    setFading(false);
    setVisible(true);
    setWidth(8);

    // Ease toward ~90% while waiting for the route to change
    tickRef.current = setInterval(() => {
      setWidth((w) => {
        if (w >= 90) return w;
        if (w < 40) return w + 8;
        if (w < 70) return w + 3;
        return w + 0.6;
      });
    }, 180);
  }, [clearTimers]);

  const complete = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearTimers();
    setWidth(100);
    setFading(false);

    finishTimerRef.current = setTimeout(() => {
      setFading(true);
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
        setWidth(0);
        setFading(false);
      }, 220);
    }, 160);
  }, [clearTimers]);

  // Finish when the URL actually changes
  useEffect(() => {
    if (urlKeyRef.current !== urlKey) {
      urlKeyRef.current = urlKey;
      complete();
    }
  }, [urlKey, complete]);

  useEffect(() => {
    const isModifiedClick = (e) =>
      e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

    const sameOriginInternal = (anchor) => {
      if (!anchor || !anchor.href) return false;
      if (anchor.target && anchor.target !== '_self') return false;
      if (anchor.hasAttribute('download')) return false;
      try {
        const url = new URL(anchor.href);
        if (url.origin !== window.location.origin) return false;
        const next = `${url.pathname}${url.search}`;
        const current = `${window.location.pathname}${window.location.search}`;
        return next !== current;
      } catch {
        return false;
      }
    };

    const onClick = (e) => {
      if (isModifiedClick(e)) return;
      const anchor = e.target?.closest?.('a');
      if (sameOriginInternal(anchor)) start();
    };

    const onPopState = () => start();

    // Catch router.push / router.replace (and Link) via History API
    const { pushState, replaceState } = window.history;
    const wrap =
      (original) =>
      function patchedHistory(...args) {
        const url = args[2];
        if (typeof url === 'string') {
          try {
            const next = new URL(url, window.location.origin);
            const cur = `${window.location.pathname}${window.location.search}`;
            const upcoming = `${next.pathname}${next.search}`;
            if (upcoming !== cur) start();
          } catch {
            start();
          }
        }
        return original.apply(this, args);
      };

    window.history.pushState = wrap(pushState);
    window.history.replaceState = wrap(replaceState);

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);

    return () => {
      window.history.pushState = pushState;
      window.history.replaceState = replaceState;
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
      clearTimers();
    };
  }, [start, clearTimers]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden"
      aria-hidden="true"
      role="presentation"
    >
      <div
        className="h-full origin-left rounded-r-full shadow-[0_0_8px_rgba(83,50,201,0.55)] transition-[width,opacity] ease-out"
        style={{
          width: `${width}%`,
          opacity: fading ? 0 : 1,
          transitionDuration: fading ? '220ms' : width >= 100 ? '160ms' : '280ms',
          background: 'linear-gradient(90deg, var(--qc-primary) 0%, var(--qc-primary-bright) 100%)',
        }}
      />
    </div>
  );
}
