'use client';

import { useEffect, useRef } from 'react';

export default function Carousel({ children, autoplay = false, label = 'items', gapClass = 'gap-5' }) {
  const scroller = useRef(null);

  const move = (direction) => {
    const el = scroller.current;
    if (!el) return;
    const width = el.clientWidth;
    const max = el.scrollWidth - width;
    if (direction > 0 && el.scrollLeft >= max - 8) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    el.scrollBy({ left: direction * width, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!autoplay) return undefined;
    const id = setInterval(() => move(1), 4800);
    return () => clearInterval(id);
  }, [autoplay]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Previous ${label}`}
        onClick={() => move(-1)}
        className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-lg text-brand-text shadow-lg md:grid"
      >
        ‹
      </button>
      <div
        ref={scroller}
        className={`no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth ${gapClass}`}
      >
        {children}
      </div>
      <button
        type="button"
        aria-label={`Next ${label}`}
        onClick={() => move(1)}
        className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-lg text-brand-text shadow-lg md:grid"
      >
        ›
      </button>
    </div>
  );
}
