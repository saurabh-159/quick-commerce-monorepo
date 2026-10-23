'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getToken, getRole } from '@/utils/auth';
import { aiAssistant, aiOrderSupport } from '@/utils/ai';

const CATEGORY_ART = {
  'dairy-breakfast':
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
  'fruits-vegetables':
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80',
  'snacks-munchies':
    'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=600&q=80',
  dairy:
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
  fruit:
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80',
  vegetable:
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80',
  snack:
    'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=600&q=80',
};

const FALLBACK_ART = {
  category:
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
  store:
    'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=600&q=80',
  product:
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
};

const SUGGESTIONS = {
  assistant: [
    'Stores near me?',
    'What categories are available?',
    'Dairy & breakfast items',
    'Fruits & vegetables',
  ],
  order: ['Where is my order?', 'Refund policy', 'Cancel my order'],
};

function slugify(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function resolveCardImage(card) {
  if (card?.image) return card.image;

  const type = (card?.type || 'category').toLowerCase();
  const titleSlug = slugify(card?.title || '');
  if (type === 'category') {
    if (CATEGORY_ART[titleSlug]) return CATEGORY_ART[titleSlug];
    const hit = Object.keys(CATEGORY_ART).find((key) => titleSlug.includes(key));
    if (hit) return CATEGORY_ART[hit];
  }
  return FALLBACK_ART[type] || FALLBACK_ART.category;
}

function requestUserLocation() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  });
}

function AssistantCard({ card, index }) {
  const image = resolveCardImage(card);
  const typeLabel = (card.type || 'item').replace(/_/g, ' ');

  return (
    <Link
      href={card.href}
      className="help-card group relative flex overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(26,47,42,0.06)] ring-1 ring-brand-border transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(59,154,156,0.14)] hover:ring-brand/40"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="relative h-[92px] w-[92px] shrink-0 overflow-hidden bg-brand-soft sm:h-[104px] sm:w-[104px]">
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center px-3.5 py-3 sm:px-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
          {typeLabel}
        </p>
        <p className="mt-1 truncate font-sans text-lg leading-tight text-brand-text sm:text-xl">
          {card.title}
        </p>
        {card.subtitle ? (
          <p className="mt-1 truncate text-xs text-brand-muted">{card.subtitle}</p>
        ) : null}
        <div className="mt-2 flex items-center justify-between gap-2">
          {card.meta ? (
            <p className="truncate text-xs font-semibold text-brand">{card.meta}</p>
          ) : (
            <span />
          )}
          <span className="shrink-0 text-xs font-medium text-brand-text transition group-hover:translate-x-0.5">
            Open →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function AiSupportChat({ title = 'Ask for help', mode = 'auto' }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('pending');
  const scrollerRef = useRef(null);

  const resolvedMode = (() => {
    if (mode === 'order' || mode === 'assistant') return mode;
    const token = getToken();
    const role = getRole();
    return token && role === 'customer' ? 'order' : 'assistant';
  })();

  useEffect(() => {
    if (resolvedMode !== 'assistant') return;
    let cancelled = false;
    (async () => {
      const coords = await requestUserLocation();
      if (cancelled) return;
      if (coords) {
        setLocation(coords);
        setLocationStatus('ready');
      } else {
        setLocationStatus('denied');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedMode]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (event, preset) => {
    if (event?.preventDefault) event.preventDefault();
    const query = (preset ?? input).trim();
    if (!query || loading) return;

    setError('');
    setLoading(true);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: query }]);

    try {
      if (resolvedMode === 'order') {
        if (!getToken()) {
          throw new Error('Login required for order help');
        }
        const data = await aiOrderSupport(query);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data?.response || data?.answer || 'No reply from support.',
            cards: [],
          },
        ]);
      } else {
        const data = await aiAssistant(query, {
          lat: location?.lat,
          lng: location?.lng,
        });
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data?.answer || data?.response || 'No reply from assistant.',
            cards: Array.isArray(data?.cards) ? data.cards : [],
          },
        ]);
      }
    } catch (err) {
      setError(err.message || 'AI support failed');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Sorry — help is unavailable right now. Try again in a moment.',
          cards: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = SUGGESTIONS[resolvedMode] || SUGGESTIONS.assistant;

  return (
    <section className="help-shell relative overflow-hidden rounded-[28px] border border-brand-border bg-white shadow-[0_20px_50px_rgba(26,47,42,0.06)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top_left,_rgba(59,154,156,0.14),_transparent_55%),radial-gradient(ellipse_at_top_right,_rgba(253,244,169,0.45),_transparent_45%)]" />

      <div className="relative border-b border-brand-soft px-5 pb-5 pt-6 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">
              {resolvedMode === 'order' ? 'Order support' : 'Shopping help'}
            </p>
            <h2 className="mt-2 font-sans text-3xl tracking-tight text-brand-text sm:text-4xl">
              {title}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-brand-muted">
              {resolvedMode === 'order'
                ? 'Ask about delivery, refunds, or a recent order.'
                : 'Ask about nearby stores, categories, products, or shopping help.'}
            </p>
          </div>
          {resolvedMode === 'assistant' && (
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium ${
                locationStatus === 'ready'
                  ? 'bg-brand-soft text-brand'
                  : locationStatus === 'denied'
                    ? 'bg-brand-bg text-brand-muted-light'
                    : 'bg-brand-bg text-brand-muted-light'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  locationStatus === 'ready'
                    ? 'animate-pulse bg-brand'
                    : 'bg-brand-border'
                }`}
              />
              {locationStatus === 'ready' && 'Location on'}
              {locationStatus === 'denied' && 'Location off'}
              {locationStatus === 'pending' && 'Finding you…'}
            </span>
          )}
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="help-scroll relative max-h-[28rem] space-y-4 overflow-y-auto px-5 py-5 sm:px-7"
      >
        {messages.length === 0 && (
          <div className="help-empty rounded-[22px] border border-dashed border-brand-border bg-brand-soft p-5">
            <p className="font-sans text-xl text-brand-text">Start with a quick ask</p>
            <p className="mt-1 text-sm text-brand-muted">
              {resolvedMode === 'order'
                ? 'Try something about delivery status or refunds.'
                : 'We’ll pull nearby stores and category cards with photos.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {suggestions.map((tip) => (
                <button
                  key={tip}
                  type="button"
                  onClick={() => send(null, tip)}
                  className="rounded-full border border-brand-border bg-white px-3.5 py-2 text-left text-xs font-medium text-brand-text transition hover:border-brand hover:bg-brand-soft hover:text-brand"
                >
                  {tip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={`${msg.role}-${index}`}
            className={`help-msg space-y-2.5 ${msg.role === 'user' ? 'help-msg-user' : 'help-msg-bot'}`}
          >
            <div
              className={`max-w-[92%] rounded-[20px] px-4 py-3 text-sm leading-6 whitespace-pre-wrap shadow-sm ${
                msg.role === 'user'
                  ? 'ml-auto bg-brand-text text-white'
                  : 'mr-auto bg-brand-bg text-brand-text'
              }`}
            >
              {msg.text}
            </div>

            {msg.role === 'assistant' && msg.cards?.length > 0 && (
              <div className="mr-auto grid max-w-[92%] gap-2.5 sm:max-w-[88%]">
                {msg.cards.map((card, cardIndex) => (
                  <AssistantCard
                    key={`${card.type}-${card.id}-${card.href}-${cardIndex}`}
                    card={card}
                    index={cardIndex}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="help-msg-bot flex items-center gap-2 text-sm text-brand-muted">
            <span className="inline-flex gap-1 rounded-full bg-brand-bg px-3 py-2">
              <span className="help-dot h-1.5 w-1.5 rounded-full bg-brand-muted-light" />
              <span className="help-dot h-1.5 w-1.5 rounded-full bg-brand-muted-light" />
              <span className="help-dot h-1.5 w-1.5 rounded-full bg-brand-muted-light" />
            </span>
            Thinking…
          </div>
        )}
      </div>

      {error && (
        <p className="relative px-5 text-sm text-brand-warning sm:px-7">
          AI help unavailable. ({error})
        </p>
      )}

      <form
        onSubmit={send}
        className="relative border-t border-brand-soft bg-brand-soft/80 px-4 py-4 backdrop-blur sm:px-6"
      >
        <div className="flex items-center gap-2 rounded-full border border-brand-border bg-white p-1.5 shadow-[0_8px_24px_rgba(26,47,42,0.04)] focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question…"
            disabled={loading}
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-brand-text outline-none placeholder:text-brand-muted-light"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-dark disabled:bg-brand-border disabled:opacity-70"
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
              <path
                d="M5 12h12M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </form>
    </section>
  );
}
